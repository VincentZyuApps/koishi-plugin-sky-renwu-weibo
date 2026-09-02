import { Context, type Bot } from 'koishi'
import * as cron from 'node-cron'
import type { ActivePushTarget, Config } from './config'
import { sendDailyResultToTarget, type ActiveDeliveryTarget } from './message'
import { logInfo } from './utils/logger'
import type { DailyResult } from './weibo'

export type ActivePushTrigger = 'cron' | 'console' | 'command'

export interface ActivePushTargetResult {
  note: string
  platform: string
  selfId?: string
  channelId: string
  ok: boolean
  message: string
}

export interface ActivePushResult {
  ok: boolean
  trigger: ActivePushTrigger
  message: string
  targets: ActivePushTargetResult[]
}

type GetDailyResult = (config: Config, useCache: boolean) => Promise<DailyResult>

interface ResolvedTarget extends ActiveDeliveryTarget {
  config: ActivePushTarget
}

export class ActivePushService {
  private job?: cron.ScheduledTask

  constructor(
    private ctx: Context,
    private config: Config,
    private getDailyResult: GetDailyResult,
  ) {}

  start() {
    if (!this.config.enableActivePush) {
      logInfo(this.ctx, this.config, '', '主动消息 Cron 推送未启用。')
      return
    }

    const expression = String(this.config.activePushCron || '').trim()
    const timezone = resolveCronTimezone(this.config.activePushTimezoneGmtOffset)
    if (!expression || !cron.validate(expression)) {
      logInfo(this.ctx, this.config, `主动消息 Cron 表达式无效，未启动调度：${expression || '(empty)'}`)
      return
    }
    if (!timezone) {
      logInfo(this.ctx, this.config, `主动消息 GMT 偏移无效，未启动调度：${this.config.activePushTimezoneGmtOffset}`)
      return
    }

    this.stop()
    this.job = cron.schedule(expression, () => {
      void this.trigger('cron')
    }, { timezone })
    logInfo(this.ctx, this.config, '✅ 主动消息 Cron 推送已启动', `cron=${expression}, timezone=${timezone}`)
  }

  stop() {
    this.job?.stop()
    this.job = undefined
  }

  getStatus() {
    const targets = this.getConfiguredTargets()
    return {
      enabled: this.config.enableActivePush,
      cron: this.config.activePushCron,
      timezoneGmtOffset: this.config.activePushTimezoneGmtOffset,
      useCache: this.config.activePushUseCache,
      consoleTestEnabled: this.config.enableConsoleWebuiTestArea,
      enabledTargetCount: targets.length,
      targets: targets.map((target) => ({
        note: getTargetLabel(target),
        platform: target.platform,
        selfId: target.selfId,
        channelId: target.channelId,
      })),
    }
  }

  async trigger(trigger: ActivePushTrigger, targets?: ActivePushTarget[]): Promise<ActivePushResult> {
    const configuredTargets = this.getConfiguredTargets(targets)
    if (!configuredTargets.length) {
      const message = '没有启用的主动推送目标，跳过本次推送。'
      logInfo(this.ctx, this.config, message)
      return { ok: false, trigger, message, targets: [] }
    }

    const targetResults: ActivePushTargetResult[] = []
    const resolvedTargets = this.resolveTargets(configuredTargets, targetResults)
    if (!resolvedTargets.length) {
      const message = '没有可用的目标 Bot，跳过本次推送。'
      logInfo(this.ctx, this.config, message)
      return { ok: false, trigger, message, targets: targetResults }
    }

    let dailyResult: DailyResult
    try {
      dailyResult = await this.getDailyResult(this.config, this.config.activePushUseCache)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const message = `主动推送抓取微博任务失败：${detail}`
      logInfo(this.ctx, this.config, message)
      if (this.config.verboseSessionLog) {
        await this.notifyFetchFailure(resolvedTargets, message)
      }
      return { ok: false, trigger, message, targets: targetResults }
    }

    logInfo(this.ctx, this.config, '', `主动推送开始: trigger=${trigger}, targets=${resolvedTargets.length}, useCache=${this.config.activePushUseCache}`)
    for (const target of resolvedTargets) {
      try {
        const result = await sendDailyResultToTarget(this.ctx, target, this.config, dailyResult)
        const message = result.failures.length
          ? result.failures.join('; ')
          : result.sentModes.length
            ? `已发送：${result.sentModes.join(', ')}`
            : `未发送：${result.skippedModes.join(', ') || '没有可用发送形式'}`
        targetResults.push({
          note: target.label,
          platform: target.bot.platform,
          selfId: target.bot.selfId,
          channelId: target.channelId,
          ok: result.ok,
          message,
        })
        logInfo(this.ctx, this.config, '', result.ok
          ? `主动推送成功 -> ${target.label}: ${message}`
          : `主动推送未完整成功 -> ${target.label}: ${message}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        targetResults.push({
          note: target.label,
          platform: target.bot.platform,
          selfId: target.bot.selfId,
          channelId: target.channelId,
          ok: false,
          message,
        })
        logInfo(this.ctx, this.config, '', `主动推送失败 -> ${target.label}: ${message}`)
      }
    }

    const successCount = targetResults.filter((item) => item.ok).length
    const firstFailure = targetResults.find((item) => !item.ok)
    const message = `主动推送完成：${successCount}/${targetResults.length} 个 Bot 目标成功。${firstFailure ? ` 首个失败：${firstFailure.note} - ${firstFailure.message}` : ''}`
    logInfo(this.ctx, this.config, successCount > 0 ? `✅ ${message}` : `⚠️ ${message}`)
    return {
      ok: successCount > 0,
      trigger,
      message,
      targets: targetResults,
    }
  }

  private getConfiguredTargets(targets: unknown = this.config.activePushTargets) {
    return (Array.isArray(targets) ? targets : [])
      .filter((target) => target?.enabled !== false)
      .map((target) => ({
        ...target,
        note: String(target.note || '').trim(),
        platform: String(target.platform || '').trim(),
        selfId: String(target.selfId || '').trim(),
        channelId: String(target.channelId || '').trim(),
      }))
  }

  private resolveTargets(configuredTargets: ActivePushTarget[], results: ActivePushTargetResult[]) {
    const resolved: ResolvedTarget[] = []
    for (const target of configuredTargets) {
      const label = getTargetLabel(target)
      if (!target.platform || !target.channelId) {
        const message = 'platform 和 channelId 均为必填项。'
        results.push({ note: label, platform: target.platform, channelId: target.channelId, ok: false, message })
        logInfo(this.ctx, this.config, '', `主动推送目标无效 -> ${label}: ${message}`)
        continue
      }

      const bots = this.getTargetBots(target)
      if (!bots.length) {
        const message = target.selfId
          ? `未找到 Bot：${target.platform} / ${target.selfId}`
          : `未找到平台 ${target.platform} 的在线 Bot。`
        results.push({ note: label, platform: target.platform, channelId: target.channelId, ok: false, message })
        logInfo(this.ctx, this.config, '', `主动推送目标不可用 -> ${label}: ${message}`)
        continue
      }

      for (const bot of bots) {
        resolved.push({
          config: target,
          bot,
          channelId: target.channelId,
          label: `${label} (${bot.platform}/${bot.selfId})`,
        })
      }
    }
    return resolved
  }

  private getTargetBots(target: ActivePushTarget): Bot[] {
    const platformBots = this.ctx.bots.filter((bot) => bot.platform === target.platform)
    if (target.selfId) {
      return platformBots.filter((bot) => bot.selfId === target.selfId)
    }
    return platformBots
  }

  private async notifyFetchFailure(targets: ResolvedTarget[], message: string) {
    for (const target of targets) {
      try {
        await target.bot.sendMessage(target.channelId, `⚠️ ${message}`)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        logInfo(this.ctx, this.config, '', `主动推送失败提示发送失败 -> ${target.label}: ${detail}`)
      }
    }
  }
}

function getTargetLabel(target: ActivePushTarget) {
  return target.note || `${target.platform || 'unknown'} / ${target.channelId || 'unknown'}`
}

function resolveCronTimezone(offset: number) {
  if (!Number.isInteger(offset) || offset < -12 || offset > 14) return undefined
  if (offset === 0) return 'Etc/GMT'
  return `Etc/GMT${offset > 0 ? '-' : '+'}${Math.abs(offset)}`
}

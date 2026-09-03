import { Context, h, Session } from 'koishi'
import type {} from '@koishijs/assets'
import type {} from '@koishijs/plugin-console'
import type {} from '@koishijs/plugin-server'
import { ActivePushService, type ActivePushResult } from './active'
import { applyActivePushConsole } from './console'
import { Config, WEIBO_ACCESS_MODE, type Config as ConfigType, type WeiboAccessModeType } from './config'
import { sendDailyResult } from './message'
import { applyQQServices } from './qq/server'
import { usage } from './usage'
import { ensureRuntimeFonts } from './utils/fonts'
import { logInfo } from './utils/logger'
import { fetchChineseServerDaily, type DailyResult } from './weibo'

export const name = 'sky-renwu-weibo'
export const inject = {
  optional: ['puppeteer', 'assets', 'server', 'console'],
}

export { Config, usage }
export type { ConfigType }

const WEIBO_ACCESS_MODE_VALUES = Object.values(WEIBO_ACCESS_MODE) as WeiboAccessModeType[]

export function apply(ctx: Context, config: ConfigType) {
  const cache: Partial<Record<WeiboAccessModeType, DailyResult>> = {}

  logInfo(ctx, config, '✅ 插件已启动', `插件启动: command=${config.commandName}, uid=${config.uid}, author=${config.authorName}`)
  ensureRuntimeFonts(ctx, config).catch((error) => {
    logInfo(ctx, config, `字体预检查失败，将使用系统默认字体：${error instanceof Error ? error.message : String(error)}`)
  })
  applyQQServices(ctx)

  const getDailyResult = async (fetchConfig: ConfigType, useCache = true) => {
    const now = Date.now()
    const cacheKey = fetchConfig.weiboAccessMode
    const cached = cache[cacheKey]
    if (useCache && cached && fetchConfig.cacheMinutes > 0 && now - cached.fetchedAt < fetchConfig.cacheMinutes * 60_000) {
      logInfo(ctx, fetchConfig, '', `命中缓存: mode=${cacheKey}, ageMs=${now - cached.fetchedAt}, cacheMinutes=${fetchConfig.cacheMinutes}`)
      return cached
    }

    logInfo(ctx, fetchConfig, '', `缓存未命中，开始请求微博接口: mode=${cacheKey}`)
    const result = await fetchChineseServerDaily(ctx, fetchConfig)
    cache[cacheKey] = result
    logInfo(ctx, fetchConfig, '', `微博接口请求完成并写入缓存: mode=${cacheKey}, fetchedAt=${result.fetchedAt}`)
    return result
  }

  const activePushService = new ActivePushService(ctx, config, getDailyResult)
  ctx.on('ready', () => activePushService.start())
  ctx.on('dispose', () => activePushService.stop())
  applyActivePushConsole(ctx, config, activePushService)

  const dailyTaskCommand = ctx.command(config.commandName, '📅✅ 访问微博获取光遇国服每日任务 ✨')
  for (const alias of normalizeConfigStringList(config.commandAliases)) {
    dailyTaskCommand.alias(alias)
  }

  dailyTaskCommand
    .option('weibo', `--weibo <mode:string> 临时覆盖微博访问策略：${WEIBO_ACCESS_MODE_VALUES.join(' / ')}`)
    .action(async ({ session, options }) => {
      if (!session) return

      const rawWeiboMode = options?.weibo
      const optionWeiboMode = parseWeiboAccessModeOption(rawWeiboMode)
      if (hasWeiboAccessModeOption(rawWeiboMode) && !optionWeiboMode) {
        await session.send(`${getQuotePrefix(session, config)}微博访问策略参数无效：${rawWeiboMode}\n可用值：${WEIBO_ACCESS_MODE_VALUES.join(' / ')}`)
        return
      }

      const effectiveConfig = optionWeiboMode
        ? { ...config, weiboAccessMode: optionWeiboMode }
        : config

      if (optionWeiboMode) {
        logInfo(ctx, effectiveConfig, '', `命令选项覆盖微博访问策略: option=${optionWeiboMode}, config=${config.weiboAccessMode}`)
      }

      let waitingHintMsgId = ''

      try {
        if (config.enableWaitingHint) {
          logInfo(ctx, config, '', '发送等待提示消息')
          waitingHintMsgId = (await session.send(`${getQuotePrefix(session, config)}⏳ 获取并生成中.... 请耐心等待`))[0]
          logInfo(ctx, config, '', `等待提示消息 ID: ${waitingHintMsgId}`)
        }

        const result = await getDailyResult(effectiveConfig)
        logInfo(ctx, effectiveConfig, '', `每日任务获取完成: mode=${effectiveConfig.weiboAccessMode}, textLength=${result.text.length}, imageUrls=${result.imageUrls.length}, imageBuffers=${result.imageBuffers.length}`)
        await sendDailyResult(ctx, session, effectiveConfig, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logInfo(ctx, config, `获取微博每日任务失败: ${message}`)
        await session.send(`${getQuotePrefix(session, config)}获取光遇每日任务失败：${message}`)
      } finally {
        if (waitingHintMsgId) {
          await session.bot.deleteMessage(session.channelId, waitingHintMsgId).catch((error) => {
            logInfo(ctx, config, `撤回等待提示失败: ${error instanceof Error ? error.message : String(error)}`)
          })
          logInfo(ctx, config, '', `已尝试撤回等待提示: ${waitingHintMsgId}`)
        }
      }
    })

  if (config.enableActivePushTestCommand) {
    ctx.command(`${config.commandName}.主动推送测试`, '🧪 向全部启用目标测试主动推送', { authority: 3 })
      .action(async ({ session }) => {
        if (!session) return

        const result = await activePushService.trigger('command')
        await session.send(`${getQuotePrefix(session, config)}${formatActivePushTestSummary(result)}`)
        if (config.verboseSessionLog && result.targets.length) {
          await session.send(`${getQuotePrefix(session, config)}${formatActivePushTestDetails(result)}`)
        }
      })
  }
}

function getQuotePrefix(session: Session, config: ConfigType) {
  return config.enableQuote && session.messageId ? h.quote(session.messageId) : ''
}

function hasWeiboAccessModeOption(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function normalizeConfigStringList(values: unknown): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of Array.isArray(values) ? values : []) {
    const entry = String(value || '').trim()
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    normalized.push(entry)
  }
  return normalized
}

function parseWeiboAccessModeOption(value: unknown): WeiboAccessModeType | undefined {
  if (!hasWeiboAccessModeOption(value)) return undefined

  const normalized = String(value).trim().toLowerCase().replace(/_/g, '-')
  return WEIBO_ACCESS_MODE_VALUES.find((mode) => mode === normalized)
}

function formatActivePushTestSummary(result: ActivePushResult) {
  const failedCount = result.targets.filter((item) => !item.ok).length
  return `${result.ok ? '✅' : '⚠️'} 主动推送测试${result.ok ? '完成' : '未完成'}：${result.message}${failedCount ? ` 失败 ${failedCount} 个 Bot 目标。` : ''}`
}

function formatActivePushTestDetails(result: ActivePushResult) {
  return [
    '🧾 主动推送测试逐目标详情：',
    ...result.targets.map((item) => `${item.ok ? '✅' : '❌'} ${item.note}\n${item.message}`),
  ].join('\n')
}

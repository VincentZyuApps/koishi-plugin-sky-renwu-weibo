import { Context, h, Session } from 'koishi'
import type {} from '@koishijs/assets'
import type {} from '@koishijs/plugin-server'
import { Config, WEIBO_ACCESS_MODE, type Config as ConfigType, type WeiboAccessModeType } from './config'
import { sendDailyResult } from './message'
import { applyQQServices } from './qq/server'
import { usage } from './usage'
import { ensureRuntimeFonts } from './utils/fonts'
import { logInfo } from './utils/logger'
import { fetchChineseServerDaily, type DailyResult } from './weibo'

export const name = 'sky-renwu-weibo'
export const inject = {
  optional: ['puppeteer', 'assets', 'server'],
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

  ctx.command(config.commandName, '📅✅ 访问微博获取光遇国服每日任务 ✨')
    .alias('今日光遇国服任务')
    .alias('今日国服任务')
    .alias('今日国服')
    .alias('today-sky-cn-request')
    .alias('today-cn-request')
    .alias('today-sky')
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

        const result = await getCachedDailyResult(effectiveConfig)
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

  async function getCachedDailyResult(fetchConfig: ConfigType) {
    const now = Date.now()
    const cacheKey = fetchConfig.weiboAccessMode
    const cached = cache[cacheKey]
    if (cached && fetchConfig.cacheMinutes > 0 && now - cached.fetchedAt < fetchConfig.cacheMinutes * 60_000) {
      logInfo(ctx, fetchConfig, '', `命中缓存: mode=${cacheKey}, ageMs=${now - cached.fetchedAt}, cacheMinutes=${fetchConfig.cacheMinutes}`)
      return cached
    }

    logInfo(ctx, fetchConfig, '', `缓存未命中，开始请求微博接口: mode=${cacheKey}`)
    const result = await fetchChineseServerDaily(ctx, fetchConfig)
    cache[cacheKey] = result
    logInfo(ctx, fetchConfig, '', `微博接口请求完成并写入缓存: mode=${cacheKey}, fetchedAt=${result.fetchedAt}`)
    return result
  }
}

function getQuotePrefix(session: Session, config: ConfigType) {
  return config.enableQuote && session.messageId ? h.quote(session.messageId) : ''
}

function hasWeiboAccessModeOption(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function parseWeiboAccessModeOption(value: unknown): WeiboAccessModeType | undefined {
  if (!hasWeiboAccessModeOption(value)) return undefined

  const normalized = String(value).trim().toLowerCase().replace(/_/g, '-')
  return WEIBO_ACCESS_MODE_VALUES.find((mode) => mode === normalized)
}

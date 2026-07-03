import { Context, h, Session } from 'koishi'
import type {} from '@koishijs/assets'
import type {} from '@koishijs/plugin-server'
import { Config, type Config as ConfigType } from './config'
import { sendDailyResult } from './message'
import { applyQQServices } from './qq/server'
import { usage } from './usage'
import { ensureRuntimeFonts } from './utils/fonts'
import { debugLog } from './utils/logger'
import { createWeiboClient, fetchChineseServerDaily, type DailyResult } from './weibo'

export const name = 'sky-renwu-weibo'
export const inject = {
  optional: ['puppeteer', 'assets', 'server'],
}

export { Config, usage }
export type { ConfigType }

export function apply(ctx: Context, config: ConfigType) {
  const logger = ctx.logger(name)
  let cache: DailyResult | undefined

  debugLog(logger, config, `插件启动: command=${config.commandName}, uid=${config.uid}, author=${config.authorName}`)
  ensureRuntimeFonts(ctx, config).catch((error) => {
    logger.warn(`字体预检查失败，将使用系统默认字体：${error instanceof Error ? error.message : String(error)}`)
  })
  applyQQServices(ctx)

  ctx.command(config.commandName, '📅✅ 访问微博获取光遇国服每日任务 ✨')
    .alias('今日国服任务')
    .alias('今日国服')
    .alias('今日光遇')
    .action(async ({ session }) => {
      if (!session) return

      let waitingHintMsgId = ''

      try {
        if (config.enableWaitingHint) {
          debugLog(logger, config, '发送等待提示消息')
          waitingHintMsgId = (await session.send(`${getQuotePrefix(session, config)}⏳ 获取并生成中.... 请耐心等待`))[0]
          debugLog(logger, config, `等待提示消息 ID: ${waitingHintMsgId}`)
        }

        const result = await getCachedDailyResult()
        debugLog(logger, config, `每日任务获取完成: textLength=${result.text.length}, imageUrls=${result.imageUrls.length}, imageBuffers=${result.imageBuffers.length}`)
        await sendDailyResult(ctx, session, config, result, logger)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`获取微博每日任务失败: ${message}`)
        await session.send(`${getQuotePrefix(session, config)}获取光遇每日任务失败：${message}`)
      } finally {
        if (waitingHintMsgId) {
          await session.bot.deleteMessage(session.channelId, waitingHintMsgId).catch((error) => {
            logger.warn(`撤回等待提示失败: ${error instanceof Error ? error.message : String(error)}`)
          })
          debugLog(logger, config, `已尝试撤回等待提示: ${waitingHintMsgId}`)
        }
      }
    })

  async function getCachedDailyResult() {
    const now = Date.now()
    if (cache && config.cacheMinutes > 0 && now - cache.fetchedAt < config.cacheMinutes * 60_000) {
      debugLog(logger, config, `命中缓存: ageMs=${now - cache.fetchedAt}, cacheMinutes=${config.cacheMinutes}`)
      return cache
    }

    debugLog(logger, config, '缓存未命中，开始请求微博接口')
    const client = createWeiboClient(config)
    const result = await fetchChineseServerDaily(client, config, logger)
    cache = result
    debugLog(logger, config, `微博接口请求完成并写入缓存: fetchedAt=${result.fetchedAt}`)
    return result
  }
}

function getQuotePrefix(session: Session, config: ConfigType) {
  return config.enableQuote && session.messageId ? h.quote(session.messageId) : ''
}

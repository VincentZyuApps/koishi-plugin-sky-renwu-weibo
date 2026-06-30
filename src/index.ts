import { Context } from 'koishi'
import { Config, type Config as ConfigType } from './config'
import { sendDailyResult } from './message'
import { usage } from './usage'
import { ensureRuntimeFonts } from './utils'
import { createWeiboClient, fetchChineseServerDaily, type DailyResult } from './weibo'

export const name = 'sky-renwu-weibo'
export const inject = {
  optional: ['puppeteer'],
}

export { Config, usage }
export type { ConfigType }

export function apply(ctx: Context, config: ConfigType) {
  const logger = ctx.logger(name)
  let cache: DailyResult | undefined

  ensureRuntimeFonts(ctx, config).catch((error) => {
    logger.warn(`字体预检查失败，将使用系统默认字体：${error instanceof Error ? error.message : String(error)}`)
  })

  ctx.command(config.commandName, '获取光遇国服每日任务')
    .alias('今日光遇国服')
    .action(async ({ session }) => {
      if (!session) return

      try {
        const result = await getCachedDailyResult()
        await sendDailyResult(ctx, session, config, result, logger)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`获取微博每日任务失败: ${message}`)
        return `获取光遇每日任务失败：${message}`
      }
    })

  async function getCachedDailyResult() {
    const now = Date.now()
    if (cache && config.cacheMinutes > 0 && now - cache.fetchedAt < config.cacheMinutes * 60_000) {
      return cache
    }

    const client = createWeiboClient(config)
    const result = await fetchChineseServerDaily(client, config, logger)
    cache = result
    return result
  }
}

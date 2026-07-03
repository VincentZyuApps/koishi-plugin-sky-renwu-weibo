import type { Context } from 'koishi'
import type { Config } from '../config'

export function logInfo(
  ctx: Context,
  config: Config,
  msg_info: string,
  msg_debug?: string,
) {
  if (msg_info) ctx.logger.info(msg_info)
  if (msg_debug && config.verboseConsoleLog) ctx.logger.info(msg_debug)
}

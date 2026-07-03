import type { Context } from 'koishi'
import type { Config } from '../config'

export const PLUGIN_LOGGER_NAME = 'sky-renwu-weibo'

type LoggerLike = Pick<ReturnType<Context['logger']>, 'info'>

export function debugLog(
  target: Context | LoggerLike | undefined,
  config: Pick<Config, 'verboseConsoleLog'>,
  message: string,
) {
  if (!config.verboseConsoleLog) return
  resolveLogger(target)?.info(`[debug] ${message}`)
}

function resolveLogger(target: Context | LoggerLike | undefined) {
  if (!target) return undefined
  if (typeof (target as LoggerLike).info === 'function') {
    return target as LoggerLike
  }
  if (typeof (target as Context).logger === 'function') {
    return (target as Context).logger(PLUGIN_LOGGER_NAME)
  }
  return undefined
}

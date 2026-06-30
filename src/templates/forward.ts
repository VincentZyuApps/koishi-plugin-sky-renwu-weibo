import type { DailyResult } from '../weibo'
import { addForwardNode, bufferToDataUrl, getBotName } from './common'

export function formatDailyForward(
  result: DailyResult,
  botSelf?: { userId?: string; username?: string; name?: string },
) {
  const botId = botSelf?.userId
  const botName = getBotName(botSelf)
  const textNode = result.text ? addForwardNode(botId, botName, result.text) : ''
  const imageNodes = result.imageBuffers
    .map((image) => addForwardNode(botId, botName, `<img src="${bufferToDataUrl(image)}"/>`))
    .join('\n')

  return `<message forward>\n${textNode}\n${imageNodes}\n</message>`
}

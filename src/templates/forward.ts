import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from '../utils/image'
import { formatDailyText } from './text'

export function formatDailyForward(
  result: DailyResult,
  botSelf?: { userId?: string; username?: string; name?: string },
) {
  const botId = botSelf?.userId
  const botName = getBotName(botSelf)
  const textNode = result.text ? addForwardNode(botId, botName, formatDailyText(result)) : ''
  const imageNodes = result.imageBuffers
    .map((image) => addForwardNode(botId, botName, `<img src="${bufferToDataUrl(image)}"/>`))
    .join('\n')

  return `<message forward>\n${textNode}\n${imageNodes}\n</message>`
}

function addForwardNode(authorId: string | undefined, authorName: string, value: string) {
  return `
    <message>
      <author ${authorId ? `id="${escapeAttr(authorId)}"` : ''} name="${escapeAttr(authorName)}"/>
      ${value}
    </message>`
}

function getBotName(botSelf?: { userId?: string; username?: string; name?: string }) {
  return botSelf?.username || botSelf?.name || '光遇每日任务'
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

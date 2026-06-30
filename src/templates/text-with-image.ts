import { h } from 'koishi'
import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from './common'
import { formatDailyText } from './text'

export function formatDailyTextWithImage(result: DailyResult) {
  const images = result.imageBuffers.map((image) => h.image(bufferToDataUrl(image))).join('')
  return `${formatDailyText(result)}${images}`
}

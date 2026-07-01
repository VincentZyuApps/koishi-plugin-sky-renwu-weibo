import { h } from 'koishi'
import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from './common'
import { formatDailyText } from './text'

export function formatDailyImageWithText(result: DailyResult) {
  const images = result.imageBuffers.map((image) => h.image(bufferToDataUrl(image))).join('')
  return `${images}${formatDailyText(result)}`
}

import { h } from 'koishi'
import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from '../utils/image'
import { formatDailyText } from './text'

export function formatDailyTextWithImage(result: DailyResult, intro = '') {
  const images = result.imageBuffers.map((image) => h.image(bufferToDataUrl(image))).join('')
  return `${formatDailyText(result, intro)}${images}`
}

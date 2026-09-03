import { h } from 'koishi'
import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from '../utils/image'
import { formatDailyText } from './text'

export function formatDailyImageWithText(result: DailyResult, intro = '') {
  const images = result.imageBuffers.map((image) => h.image(bufferToDataUrl(image))).join('')
  const prefix = String(intro || '').trim()
  return `${prefix ? `${prefix}\n\n` : ''}${images}${formatDailyText(result)}`
}

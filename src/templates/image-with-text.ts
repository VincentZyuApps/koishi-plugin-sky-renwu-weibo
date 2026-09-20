import { h } from 'koishi'
import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from '../utils/image'
import { formatDailyText } from './text'
import { formatImageCaption, getImageCaptionTotal } from './common/caption'

export function formatDailyImageWithText(result: DailyResult, intro = '') {
  const imageTotal = getImageCaptionTotal(result)
  const images = result.downloadedImages
    .map((image) => `${formatImageCaption(image.index, imageTotal)}\n${h.image(bufferToDataUrl(image.buffer))}`)
    .join('\n')
  const prefix = String(intro || '').trim()
  return `${prefix ? `${prefix}\n\n` : ''}${images}${formatDailyText(result)}`
}

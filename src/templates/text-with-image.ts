import { h } from 'koishi'
import type { DailyResult } from '../weibo'
import { bufferToDataUrl } from '../utils/image'
import { formatDailyText } from './text'
import { formatImageCaption, getImageCaptionTotal } from './common/caption'

export function formatDailyTextWithImage(result: DailyResult, intro = '') {
  const imageTotal = getImageCaptionTotal(result)
  const images = result.downloadedImages
    .map((image) => `${formatImageCaption(image.index, imageTotal)}\n${h.image(bufferToDataUrl(image.buffer))}`)
    .join('\n')
  return `${formatDailyText(result, intro)}${images}`
}

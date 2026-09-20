import type { DailyResult } from '../../weibo'

/**
 * 图片标识的分母：优先使用微博原始图片总数（imageUrls.length），
 * 这样在有图片下载失败被跳过时，序号会出现不连续（如 1/5、3/5），
 * 更直观地暴露图片缺失。仅当没有原始图片信息时，才回退到已下载数量。
 */
export function getImageCaptionTotal(result: DailyResult) {
  return result.imageUrls.length || result.downloadedImages.length
}

/**
 * 生成单张图片上方的标识文案，例如：第 3/5 张图片 ↓
 * @param index 图片的 0 基序号（使用 DownloadedDailyImage.index）
 * @param total 图片总数（通常来自 getImageCaptionTotal）
 */
export function formatImageCaption(index: number, total: number) {
  const current = toKeycapEmoji(index + 1)
  const max = toKeycapEmoji(total)
  return `🖼️ 第 ${index + 1}/${total} 张图片 ↓ (${current} / ${max})`
}

const KEYCAP_DIGITS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

/** 把数字逐位转成 keycap emoji，例如 12 -> 1️⃣2️⃣ */
function toKeycapEmoji(value: number) {
  return String(Math.max(0, Math.trunc(value)))
    .split('')
    .map((digit) => KEYCAP_DIGITS[Number(digit)] ?? digit)
    .join('')
}

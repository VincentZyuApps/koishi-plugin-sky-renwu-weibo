import type {
  ImageCdnRotateStrategyType,
  ImageSizeDegradeStrategyType,
} from '../config'
import { IMAGE_CDN_ROTATE_STRATEGY, IMAGE_SIZE_DEGRADE_STRATEGY } from '../config'

export function bufferToDataUrl(buffer: Buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buffer.toString('base64')}`
}

// ================================
// 🌐 微博图片 CDN 域名轮换 & 📐 尺寸降级
// ================================

/**
 * 微博图床镜像域名前缀里可轮换的编号范围（wx1~wx4 / tvax1~tvax4 等）。
 * 匹配形如 wx2.sinaimg.cn、tvax3.sinaimg.cn 的 host。
 */
const CDN_HOST_RE = /^(https?:\/\/)([a-z]+?)(\d)(\.sinaimg\.cn)/i
const CDN_HOST_NUMBERS = [1, 2, 3, 4]

/**
 * 微博图片尺寸标识，从高清到低清排列。URL 路径里形如
 * /large/xxx.jpg、/mw2000/xxx.jpg、/orj1080/xxx.jpg。
 */
const SIZE_SEGMENTS = ['large', 'mw2000', 'mw1024', 'mw690', 'bmiddle', 'thumbnail']
const SIZE_SEGMENT_RE = new RegExp(`/(${['largest', 'original', 'orj1080', ...SIZE_SEGMENTS].join('|')})/`, 'i')

/**
 * 把原始 URL 的 CDN 域名编号轮换到指定「步数」后的编号。
 * step=0 返回原 URL；host 格式不认识时原样返回。
 */
export function rotateCdnHost(url: string, step: number): string {
  if (step <= 0) return url
  const match = CDN_HOST_RE.exec(url)
  if (!match) return url

  const [, scheme, prefix, digit, suffix] = match
  const current = Number(digit)
  const currentIndex = CDN_HOST_NUMBERS.indexOf(current)
  const baseIndex = currentIndex >= 0 ? currentIndex : 0
  const nextNumber = CDN_HOST_NUMBERS[(baseIndex + step) % CDN_HOST_NUMBERS.length]
  return url.replace(CDN_HOST_RE, `${scheme}${prefix}${nextNumber}${suffix}`)
}

/**
 * 把原始 URL 的尺寸标识降级指定「档数」。
 * level=0 返回原 URL；无法识别尺寸段时原样返回。
 * 以当前尺寸段在降级序列中的位置为起点向低清方向前进 level 档。
 */
export function degradeImageSize(url: string, level: number): string {
  if (level <= 0) return url
  const match = SIZE_SEGMENT_RE.exec(url)
  if (!match) return url

  const currentSegment = match[1].toLowerCase()
  // largest / original / orj1080 都视为「最高清」，起点定位到序列开头 large。
  const startIndex = Math.max(0, SIZE_SEGMENTS.indexOf(currentSegment))
  const targetIndex = Math.min(SIZE_SEGMENTS.length - 1, startIndex + level)
  const target = SIZE_SEGMENTS[targetIndex]
  return url.replace(SIZE_SEGMENT_RE, `/${target}/`)
}

/**
 * 根据 CDN 轮换 / 尺寸降级两个策略，计算第 attempt 次尝试（1 基）应使用的图片 URL。
 * 两个策略各自独立推进，互不干扰。
 * @param baseUrl 原始最高清 URL
 * @param attempt 当前是第几次尝试（1 = 首次，2 = 第一次重试……）
 * @param maxAttempts 总尝试次数（含首次）
 */
export function resolveAttemptUrl(
  baseUrl: string,
  attempt: number,
  maxAttempts: number,
  cdnStrategy: ImageCdnRotateStrategyType,
  sizeStrategy: ImageSizeDegradeStrategyType,
): string {
  const retryIndex = Math.max(0, attempt - 1) // 首次为 0，第一次重试为 1……
  const isFinalAttempt = attempt >= maxAttempts

  // 🌐 CDN 域名轮换步数
  let cdnStep = 0
  switch (cdnStrategy) {
    case IMAGE_CDN_ROTATE_STRATEGY.OFF:
      cdnStep = 0
      break
    case IMAGE_CDN_ROTATE_STRATEGY.ON_FINAL_RETRY:
      cdnStep = isFinalAttempt && retryIndex > 0 ? 1 : 0
      break
    case IMAGE_CDN_ROTATE_STRATEGY.EACH_RETRY:
      cdnStep = retryIndex
      break
    case IMAGE_CDN_ROTATE_STRATEGY.PARALLEL_RACE:
      // parallel-race 由下载器另行处理并发请求，这里退化为 each-retry 行为。
      cdnStep = retryIndex
      break
  }

  // 📐 尺寸降级档数
  let sizeLevel = 0
  switch (sizeStrategy) {
    case IMAGE_SIZE_DEGRADE_STRATEGY.ALWAYS_LARGEST:
      sizeLevel = 0
      break
    case IMAGE_SIZE_DEGRADE_STRATEGY.DEGRADE_FINAL_RETRY:
      sizeLevel = isFinalAttempt && retryIndex > 0 ? 1 : 0
      break
    case IMAGE_SIZE_DEGRADE_STRATEGY.DEGRADE_EACH_RETRY:
      sizeLevel = retryIndex
      break
    case IMAGE_SIZE_DEGRADE_STRATEGY.START_MID:
      // 首次即从中等尺寸 mw2000 起步（large=0, mw2000=1），之后继续每次降一档。
      sizeLevel = retryIndex + 1
      break
  }

  return degradeImageSize(rotateCdnHost(baseUrl, cdnStep), sizeLevel)
}

/**
 * parallel-race 首次并发请求时，生成一组不同 CDN 域名的候选 URL。
 * 尺寸按 sizeStrategy 首次档位处理。
 */
export function buildRaceUrls(
  baseUrl: string,
  sizeStrategy: ImageSizeDegradeStrategyType,
): string[] {
  const firstSizeLevel = sizeStrategy === IMAGE_SIZE_DEGRADE_STRATEGY.START_MID ? 1 : 0
  const sized = degradeImageSize(baseUrl, firstSizeLevel)
  const urls = new Set<string>([sized])
  for (let step = 1; step < CDN_HOST_NUMBERS.length; step += 1) {
    urls.add(rotateCdnHost(sized, step))
  }
  return Array.from(urls)
}

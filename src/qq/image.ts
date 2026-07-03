import { DAILY_TASK_HINT_MARKDOWN } from '../templates/common/hint'

export interface ImageDimensions {
  width: number
  height: number
}

interface FitImageOptions {
  maxWidth: number
  maxHeight: number
  fallback: ImageDimensions
}

export function formatPuppeteerImageMarkdown(imageUrl: string, width = 900, height = 1200) {
  return [
    '# 光遇国服每日任务',
    '',
    DAILY_TASK_HINT_MARKDOWN,
    '',
    '## 微博图片',
    '',
    `![光遇国服每日任务卡片图 #${width}px #${height}px](${imageUrl})`,
  ].join('\n')
}

export function getImageDimensions(buffer?: Buffer): ImageDimensions | null {
  if (!buffer?.length) return null

  return normalizeImageDimensions(
    getPngDimensions(buffer)
    || getJpegDimensions(buffer)
    || getWebpDimensions(buffer)
    || getGifDimensions(buffer),
  )
}

export function fitImageDimensions(dimensions: ImageDimensions | null | undefined, options: FitImageOptions): ImageDimensions {
  const normalized = normalizeImageDimensions(dimensions)
  if (!normalized) return options.fallback

  const ratio = Math.min(
    options.maxWidth / normalized.width,
    options.maxHeight / normalized.height,
    1,
  )

  return {
    width: Math.max(1, Math.round(normalized.width * ratio)),
    height: Math.max(1, Math.round(normalized.height * ratio)),
  }
}

function normalizeImageDimensions(dimensions?: ImageDimensions | null) {
  if (!dimensions) return null
  const { width, height } = dimensions
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

function getPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null
  if (
    buffer[0] !== 0x89
    || buffer[1] !== 0x50
    || buffer[2] !== 0x4e
    || buffer[3] !== 0x47
    || buffer[4] !== 0x0d
    || buffer[5] !== 0x0a
    || buffer[6] !== 0x1a
    || buffer[7] !== 0x0a
  ) return null

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function getJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null

  let offset = 2
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1
    const marker = buffer[offset]
    offset += 1

    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > buffer.length) break

    const length = buffer.readUInt16BE(offset)
    if (length < 2 || offset + length > buffer.length) break

    if (isJpegStartOfFrame(marker) && offset + 7 <= buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      }
    }

    offset += length
  }

  return null
}

function isJpegStartOfFrame(marker: number) {
  return marker >= 0xc0
    && marker <= 0xcf
    && ![0xc4, 0xc8, 0xcc].includes(marker)
}

function getWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 20) return null
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null

  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const chunkOffset = offset + 8
    if (chunkOffset + chunkSize > buffer.length) break

    if (chunkType === 'VP8X' && chunkSize >= 10) {
      return {
        width: 1 + readUInt24LE(buffer, chunkOffset + 4),
        height: 1 + readUInt24LE(buffer, chunkOffset + 7),
      }
    }

    if (chunkType === 'VP8L' && chunkSize >= 5 && buffer[chunkOffset] === 0x2f) {
      const bits = buffer.readUInt32LE(chunkOffset + 1)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      }
    }

    if (chunkType === 'VP8 ' && chunkSize >= 10) {
      if (buffer[chunkOffset + 3] === 0x9d && buffer[chunkOffset + 4] === 0x01 && buffer[chunkOffset + 5] === 0x2a) {
        return {
          width: buffer.readUInt16LE(chunkOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(chunkOffset + 8) & 0x3fff,
        }
      }
    }

    offset = chunkOffset + chunkSize + (chunkSize % 2)
  }

  return null
}

function getGifDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 10) return null
  const signature = buffer.toString('ascii', 0, 6)
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  }
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

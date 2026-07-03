import { existsSync, createReadStream } from 'fs'
import { mkdir, readdir, stat, unlink, writeFile } from 'fs/promises'
import path from 'path'
import type { Context } from 'koishi'
import type { Config } from '../config'
import { debugLog } from '../utils/logger'

const IMAGE_CACHE_DIR_NAME = 'sky-renwu-weibo'
const IMAGE_CACHE_ROUTE = '/sky-renwu-weibo/cache'
const IMAGE_EXTENSIONS = new Set(['.png', '.jpeg', '.jpg', '.webp'])

export function applyQQServices(ctx: Context) {
  ctx.inject(['server'], (ctx) => {
    registerQQMarkdownImageServerRoute(ctx)
  })
}

export function registerQQMarkdownImageServerRoute(ctx: Context) {
  ctx.server.get(`${IMAGE_CACHE_ROUTE}/:name`, async (koaCtx) => {
    const filename = path.basename(String(koaCtx.params.name || ''))
    if (!filename) {
      koaCtx.status = 404
      return
    }

    const filePath = path.join(getQQMarkdownImageCacheDir(ctx.baseDir), filename)
    if (!existsSync(filePath)) {
      koaCtx.status = 404
      return
    }

    koaCtx.type = getMimeType(path.extname(filename))
    koaCtx.body = createReadStream(filePath)
  })
}

export async function storeQQMarkdownPuppeteerImage(
  ctx: Context,
  config: Config,
  imageBase64: string,
  logger?: ReturnType<Context['logger']>,
) {
  if (!ctx.server) {
    throw new Error('当前未启用 Koishi server 服务。')
  }

  const publicBaseUrl = resolveQQMarkdownImagePublicBaseUrl(ctx, config)
  if (!publicBaseUrl) {
    throw new Error('未配置可公网访问的 selfUrl。请填写本插件的 QQ Markdown 图片公网 URL，或配置 Koishi server 的 selfUrl。')
  }

  const cacheDir = getQQMarkdownImageCacheDir(ctx.baseDir)
  await mkdir(cacheDir, { recursive: true })

  const filename = await createTimestampedImageFilename(cacheDir, config.imageType)
  const filePath = path.join(cacheDir, filename)
  await writeFile(filePath, Buffer.from(imageBase64, 'base64'))
  debugLog(logger, config, `server 模式已写入 QQ Markdown 卡片图缓存: ${filePath}`)

  await pruneQQMarkdownImageCache(cacheDir, config.qqMarkdownPuppeteerImageMaxFiles, logger, config)

  return `${publicBaseUrl}${IMAGE_CACHE_ROUTE}/${encodeURIComponent(filename)}`
}

export function getQQMarkdownImageCacheDir(baseDir: string) {
  return path.join(baseDir, 'cache', IMAGE_CACHE_DIR_NAME)
}

function resolveQQMarkdownImagePublicBaseUrl(ctx: Context, config: Config) {
  const raw = String(config.qqMarkdownPuppeteerImageSelfUrl || ctx.server?.config?.selfUrl || '').trim()
  return raw.replace(/\/+$/, '')
}

async function createTimestampedImageFilename(cacheDir: string, imageType: Config['imageType']) {
  const extension = imageType === 'jpeg' ? 'jpeg' : imageType
  const timestamp = formatShanghaiTimestamp(new Date())

  for (let index = 0; index < 1000; index++) {
    const suffix = index === 0 ? '' : `-${String(index).padStart(2, '0')}`
    const filename = `${timestamp}${suffix}.${extension}`
    if (!existsSync(path.join(cacheDir, filename))) {
      return filename
    }
  }

  throw new Error('无法生成唯一的缓存图片文件名。')
}

function formatShanghaiTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}${lookup.month}${lookup.day}-${lookup.hour}${lookup.minute}${lookup.second}`
}

async function pruneQQMarkdownImageCache(
  cacheDir: string,
  maxFiles: number,
  logger: ReturnType<Context['logger']> | undefined,
  config: Config,
) {
  const limit = Math.floor(Number(maxFiles) || 0)
  if (limit <= 0) return

  const files = await readdir(cacheDir)
  const images = await Promise.all(files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map(async (file) => {
      const filePath = path.join(cacheDir, file)
      const fileStat = await stat(filePath)
      return { filePath, mtimeMs: fileStat.mtimeMs }
    }))

  if (images.length <= limit) return

  images.sort((a, b) => a.mtimeMs - b.mtimeMs)
  for (const { filePath } of images.slice(0, images.length - limit)) {
    await removeCachedImage(filePath, logger, config, '数量上限清理')
  }
}

async function removeCachedImage(
  filePath: string,
  logger: ReturnType<Context['logger']> | undefined,
  config: Config,
  reason: string,
) {
  try {
    await unlink(filePath)
    debugLog(logger, config, `server 模式已删除 QQ Markdown 卡片图缓存 (${reason}): ${filePath}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      logger?.warn(`删除 QQ Markdown 卡片图缓存失败 (${reason}): ${filePath} - ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

function getMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

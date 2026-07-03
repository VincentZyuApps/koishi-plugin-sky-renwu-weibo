import type { Context } from 'koishi'
import type { Config } from '../config'
import { logInfo } from '../utils/logger'

export async function uploadQQMarkdownPuppeteerImageViaAssets(
  ctx: Context,
  config: Config,
  imageBase64: string,
) {
  if (!ctx.assets) {
    throw new Error('当前未启用 Koishi assets 服务。')
  }

  const dataUrl = `data:image/${config.imageType};base64,${imageBase64}`
  const filename = `sky-renwu-weibo.${config.imageType}`
  logInfo(ctx, config, '', `append-puppeteer-image 使用 assets 模式上传卡片图: ${filename}`)
  const imageUrl = await ctx.assets.upload(dataUrl, filename)
  logInfo(ctx, config, '', `assets 模式上传完成: ${imageUrl}`)

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error(`assets 返回的图片地址不是公网 HTTP(S) URL：${imageUrl}`)
  }

  return imageUrl
}

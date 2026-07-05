import { h, type Context, type Session } from 'koishi'
import { QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE, type Config } from '../config'
import type { RenderedDailyImage } from '../templates/puppeteer-image'
import { formatDailyQQMarkdown } from '../templates/qq-markdown'
import type { DailyResult } from '../weibo'
import { logInfo } from '../utils/logger'
import {
  hasAppendQQMarkdownButtonMode,
  hasStandaloneQQButtonMode,
  type QQMarkdownButtonMode,
} from './button'
import { uploadQQMarkdownPuppeteerImageViaAssets } from './assets'
import { formatPuppeteerImageMarkdown, fitImageDimensionsByWidth } from './image'
import { buildDailyKeyboard, QQ_MARKDOWN_BUTTON_ONLY_CONTENT } from './keyboard'
import { sendQQMarkdown } from './markdown'
import { notifyQQButtonSkip } from './notify'
import { storeQQMarkdownPuppeteerImage } from './server'

const QQ_MARKDOWN_PUPPETEER_IMAGE_SIZE = {
  maxWidth: 900,
  fallback: { width: 900, height: 1200 },
}

export async function sendStandaloneQQButton(
  ctx: Context,
  session: Session,
  config: Config,
  buttonModes: QQMarkdownButtonMode[],
) {
  if (!hasStandaloneQQButtonMode(buttonModes)) return
  logInfo(ctx, config, '', '准备单独发送 QQ Markdown JSON 按钮消息')
  if (session.platform !== 'qq') {
    await notifyQQButtonSkip(ctx, session, config, '单独发送 JSON 按钮消息只能在 QQ 官方 Bot 平台使用。')
    return
  }

  await sendWithModeGuard(ctx, config, 'qq-markdown-button', () =>
    sendQQMarkdown(session, QQ_MARKDOWN_BUTTON_ONLY_CONTENT, buildDailyKeyboard(config), true),
  )
}

export async function sendQQMarkdownMode(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
  buttonModes: QQMarkdownButtonMode[],
) {
  if (session.platform !== 'qq') {
    await notifyQQButtonSkip(ctx, session, config, 'QQ Markdown 正文消息只能在 QQ 官方 Bot 平台使用。')
    return
  }

  const keyboard = hasAppendQQMarkdownButtonMode(buttonModes)
    ? buildDailyKeyboard(config)
    : null
  logInfo(ctx, config, '', `发送 QQ Markdown 正文消息，按钮挂载: ${keyboard ? 'yes' : 'no'}`)

  await sendWithModeGuard(ctx, config, 'qq-markdown', () =>
    sendQQMarkdown(session, formatDailyQQMarkdown(result, config), keyboard, true),
  )
}

export async function sendQQPuppeteerImageWithButtons(
  ctx: Context,
  session: Session,
  config: Config,
  renderedImage: RenderedDailyImage,
) {
  if (session.platform !== 'qq') {
    await notifyQQButtonSkip(ctx, session, config, 'Puppeteer 卡片图按钮只能在 QQ 官方 Bot 平台使用。')
    return sendSessionImage(session, config, renderedImage.base64)
  }

  let imageUrl = ''
  if (config.qqMarkdownPuppeteerImageStorageMode === QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE.ASSETS) {
    try {
      imageUrl = await uploadQQMarkdownPuppeteerImageViaAssets(ctx, config, renderedImage.base64)
    } catch (error) {
      await notifyQQButtonSkip(ctx, session, config, `append-puppeteer-image 的 assets 模式不可用：${error instanceof Error ? error.message : String(error)} standalone 与 append-qq-markdown 不需要此服务。`)
      return sendSessionImage(session, config, renderedImage.base64)
    }
  } else {
    try {
      logInfo(ctx, config, '', 'append-puppeteer-image 使用 server 模式写入临时卡片图缓存')
      imageUrl = await storeQQMarkdownPuppeteerImage(ctx, config, renderedImage.base64)
      logInfo(ctx, config, '', `server 模式缓存完成: ${imageUrl}`)
    } catch (error) {
      await notifyQQButtonSkip(ctx, session, config, `append-puppeteer-image 的 server 模式不可用：${error instanceof Error ? error.message : String(error)} standalone 与 append-qq-markdown 不需要此服务。`)
      return sendSessionImage(session, config, renderedImage.base64)
    }
  }

  const dimensions = fitImageDimensionsByWidth(renderedImage, QQ_MARKDOWN_PUPPETEER_IMAGE_SIZE)
  logInfo(ctx, config, '', `发送 QQ Markdown Puppeteer 卡片图并附带按钮: rawSize=${renderedImage.width}x${renderedImage.height}, markdownSize=${dimensions.width}x${dimensions.height}`)
  await sendQQMarkdown(session, formatPuppeteerImageMarkdown(imageUrl, dimensions.width, dimensions.height), buildDailyKeyboard(config), true)
}

function sendSessionImage(session: Session, config: Config, imageBase64: string) {
  return session.send(h.image(`data:image/${config.imageType};base64,${imageBase64}`))
}

async function sendWithModeGuard(
  ctx: Context,
  config: Config,
  mode: string,
  send: () => Promise<unknown>,
) {
  try {
    await send()
  } catch (error) {
    logInfo(ctx, config, `发送模式失败 ${mode}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

import { Context, h, Session } from 'koishi'
import { MSG_FORM, QQ_MARKDOWN_BUTTON_MODE, type Config, type MsgFormType } from './config'
import { buildDailyKeyboard, formatPuppeteerImageMarkdown, QQ_MARKDOWN_BUTTON_ONLY_CONTENT, sendQQMarkdown } from './qq'
import type { DailyResult } from './weibo'
import { formatDailyForward } from './templates/forward'
import { formatDailyImageWithText } from './templates/image-with-text'
import { renderDailyImage, type RenderedDailyImage } from './templates/puppeteer-image'
import { formatDailyQQMarkdown } from './templates/qq-markdown'
import { formatDailyText } from './templates/text'
import { formatDailyTextWithImage } from './templates/text-with-image'
import { fitImageDimensions } from './templates/common'

const QQ_MARKDOWN_PUPPETEER_IMAGE_SIZE = {
  maxWidth: 900,
  maxHeight: 1200,
  fallback: { width: 900, height: 1200 },
}

export function normalizeMsgForms(config: Config) {
  const rawForms = Array.isArray(config.msgFormArr) ? config.msgFormArr : []
  const seen = new Set<string>()
  const forms: MsgFormType[] = []

  for (const entry of rawForms) {
    const mode = typeof entry === 'string' ? entry : entry?.enabled ? entry.mode : ''
    const normalized = String(mode || '').trim() as MsgFormType
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    forms.push(normalized)
  }

  return forms
}

export async function sendDailyResult(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
  logger: ReturnType<Context['logger']>,
) {
  const msgForms = normalizeMsgForms(config)
  if (!msgForms.length) {
    return sendSessionMessage(session, config, '已获取到光遇每日任务，但未选择任何发送形式。')
  }
  const buttonModes = normalizeQQButtonModes(config)
  debugLog(logger, config, `消息发送形式: ${msgForms.join(', ') || '(empty)'}`)
  debugLog(logger, config, `QQ Markdown 按钮行为: ${buttonModes.join(', ') || '(empty)'}`)
  debugLog(logger, config, `发送执行模式: ${config.strictOrderMode !== false ? 'serial' : 'parallel'}`)
  await notifyInvalidQQButtonModes(session, config, msgForms, logger, buttonModes)
  const tasks = msgForms.map((mode) => () => sendDailyMode(ctx, session, config, result, logger, msgForms, buttonModes, mode))

  if (config.strictOrderMode !== false) {
    for (const task of tasks) await task()
  } else {
    await Promise.all(tasks.map((task) => task()))
  }

  await sendStandaloneQQButton(session, config, logger, buttonModes)
}

function sendSessionMessage(session: Session, config: Config, content: unknown) {
  return session.send(`${getQuotePrefix(session, config)}${String(content)}`)
}

function getQuotePrefix(session: Session, config: Config) {
  return config.enableQuote && session.messageId ? h.quote(session.messageId) : ''
}

function shouldSendMode(
  logger: ReturnType<Context['logger']>,
  msgForms: string[],
  mode: string,
  payloadReady = true,
) {
  const selected = msgForms.includes(mode)
  if (!selected) return false

  if (!payloadReady) {
    logger.warn(`跳过发送模式 ${mode}: 当前数据不足。`)
    return false
  }

  return true
}

async function sendWithModeGuard(
  logger: ReturnType<Context['logger']>,
  mode: string,
  send: () => Promise<unknown>,
) {
  try {
    await send()
  } catch (error) {
    logger.error(`发送模式失败 ${mode}`, error)
  }
}

async function sendDailyMode(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
  logger: ReturnType<Context['logger']>,
  msgForms: string[],
  buttonModes: QQMarkdownButtonMode[],
  mode: MsgFormType,
) {
  debugLog(logger, config, `准备执行发送模式: ${mode}`)
  if (mode === MSG_FORM.TEXT_WITH_IMAGE && shouldSendMode(logger, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendWithModeGuard(logger, mode, () =>
      sendSessionMessage(session, config, formatDailyTextWithImage(result)),
    )
  }

  if (mode === MSG_FORM.IMAGE_WITH_TEXT && shouldSendMode(logger, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendWithModeGuard(logger, mode, () =>
      sendSessionMessage(session, config, formatDailyImageWithText(result)),
    )
  }

  if (mode === MSG_FORM.FORWARD && shouldSendMode(logger, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendWithModeGuard(logger, mode, () =>
      session.send(h.unescape(formatDailyForward(result, session.bot))),
    )
  }

  if (mode === MSG_FORM.TEXT && shouldSendMode(logger, msgForms, mode, !!result.text)) {
    return sendWithModeGuard(logger, mode, () =>
      sendSessionMessage(session, config, formatDailyText(result)),
    )
  }

  if (mode === MSG_FORM.PUPPETEER_IMAGE && shouldSendMode(logger, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendPuppeteerImageMode(ctx, session, config, result, logger, buttonModes)
  }

  if (mode === MSG_FORM.QQ_MARKDOWN && shouldSendMode(logger, msgForms, mode, !!result.text)) {
    return sendQQMarkdownMode(session, config, result, logger, buttonModes)
  }
}

async function sendStandaloneQQButton(
  session: Session,
  config: Config,
  logger: ReturnType<Context['logger']>,
  buttonModes: QQMarkdownButtonMode[],
) {
  if (!buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.STANDALONE)) return
  debugLog(logger, config, '准备单独发送 QQ Markdown JSON 按钮消息')
  if (session.platform !== 'qq') {
    await notifyQQButtonSkip(session, config, logger, '单独发送 JSON 按钮消息只能在 QQ 官方 Bot 平台使用。')
    return
  }

  await sendWithModeGuard(logger, 'qq-markdown-button', () =>
    sendQQMarkdown(session, QQ_MARKDOWN_BUTTON_ONLY_CONTENT, buildDailyKeyboard(config), true),
  )
}

async function sendQQMarkdownMode(
  session: Session,
  config: Config,
  result: DailyResult,
  logger: ReturnType<Context['logger']>,
  buttonModes: QQMarkdownButtonMode[],
) {
  if (session.platform !== 'qq') {
    await notifyQQButtonSkip(session, config, logger, 'QQ Markdown 正文消息只能在 QQ 官方 Bot 平台使用。')
    return
  }

  const keyboard = buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN)
    ? buildDailyKeyboard(config)
    : null
  debugLog(logger, config, `发送 QQ Markdown 正文消息，按钮挂载: ${keyboard ? 'yes' : 'no'}`)

  await sendWithModeGuard(logger, MSG_FORM.QQ_MARKDOWN, () =>
    sendQQMarkdown(session, formatDailyQQMarkdown(result, config), keyboard, true),
  )
}

async function sendPuppeteerImageMode(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
  logger: ReturnType<Context['logger']>,
  buttonModes: QQMarkdownButtonMode[],
) {
  if (!ctx.puppeteer) {
    logger.warn('跳过 Puppeteer 卡片图: 当前 Koishi 未启用 puppeteer 服务。')
    if (buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE)) {
      await notifyQQButtonSkip(session, config, logger, 'Puppeteer 卡片图按钮需要启用 Koishi puppeteer 服务，但当前未启用。')
    }
    return
  }

  await sendWithModeGuard(logger, MSG_FORM.PUPPETEER_IMAGE, async () => {
    debugLog(logger, config, `开始渲染 Puppeteer 卡片图: type=${config.imageType}, width=${config.imageWidth}, quality=${config.screenshotQuality}`)
    const renderedImage = await renderDailyImage(ctx, result, config)
    debugLog(logger, config, `Puppeteer 卡片图渲染完成: base64Length=${renderedImage.base64.length}, size=${renderedImage.width}x${renderedImage.height}`)
    if (buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE)) {
      await sendQQPuppeteerImageWithButtons(ctx, session, config, renderedImage, logger)
      return
    }

    await sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  })
}

async function sendQQPuppeteerImageWithButtons(
  ctx: Context,
  session: Session,
  config: Config,
  renderedImage: RenderedDailyImage,
  logger: ReturnType<Context['logger']>,
) {
  if (session.platform !== 'qq') {
    await notifyQQButtonSkip(session, config, logger, 'Puppeteer 卡片图按钮只能在 QQ 官方 Bot 平台使用。')
    return sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  }

  if (!ctx.assets) {
    await notifyQQButtonSkip(session, config, logger, 'Puppeteer 卡片图按钮需要启用 Koishi assets 服务，但当前未启用。')
    return sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  }

  const dataUrl = `data:image/${config.imageType};base64,${renderedImage.base64}`
  const filename = `sky-renwu-weibo.${config.imageType}`
  let imageUrl = ''
  try {
    debugLog(logger, config, `开始上传 Puppeteer 卡片图到 assets: ${filename}`)
    imageUrl = await ctx.assets.upload(dataUrl, filename)
    debugLog(logger, config, `assets 上传完成: ${imageUrl}`)
  } catch (error) {
    await notifyQQButtonSkip(session, config, logger, `Puppeteer 卡片图上传 assets 失败：${error instanceof Error ? error.message : String(error)}`)
    return sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    await notifyQQButtonSkip(session, config, logger, `assets 返回的图片地址不是公网 HTTP(S) URL：${imageUrl}`)
    return sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  }

  const dimensions = fitImageDimensions(renderedImage, QQ_MARKDOWN_PUPPETEER_IMAGE_SIZE)
  debugLog(logger, config, `发送 QQ Markdown Puppeteer 卡片图并附带按钮: markdownSize=${dimensions.width}x${dimensions.height}`)
  await sendQQMarkdown(session, formatPuppeteerImageMarkdown(imageUrl, dimensions.width, dimensions.height), buildDailyKeyboard(config), true)
}

function toImageMessage(config: Config, imageBase64: string) {
  return h.image(`data:image/${config.imageType};base64,${imageBase64}`)
}

type QQMarkdownButtonMode = typeof QQ_MARKDOWN_BUTTON_MODE[keyof typeof QQ_MARKDOWN_BUTTON_MODE]

function normalizeQQButtonModes(config: Config): QQMarkdownButtonMode[] {
  const rawModes = Array.isArray(config.qqMarkdownButtonMode)
    ? config.qqMarkdownButtonMode
    : [config.qqMarkdownButtonMode].filter(Boolean)

  const seen = new Set<string>()
  const modes: QQMarkdownButtonMode[] = []
  for (const mode of rawModes) {
    const normalized = String(mode || '').trim() as QQMarkdownButtonMode
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    modes.push(normalized)
  }
  return modes
}

async function notifyQQButtonSkip(
  session: Session,
  config: Config,
  logger: ReturnType<Context['logger']>,
  reason: string,
) {
  const message = `QQ Markdown 按钮未发送：${reason}`
  logger.warn(message)
  await sendSessionMessage(session, config, message)
}

function debugLog(
  logger: ReturnType<Context['logger']>,
  config: Config,
  message: string,
) {
  if (config.verboseConsoleLog) {
    logger.info(`[debug] ${message}`)
  }
}

async function notifyInvalidQQButtonModes(
  session: Session,
  config: Config,
  msgForms: string[],
  logger: ReturnType<Context['logger']>,
  buttonModes: QQMarkdownButtonMode[],
) {
  if (buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN) && !msgForms.includes(MSG_FORM.QQ_MARKDOWN)) {
    await notifyQQButtonSkip(session, config, logger, '按钮行为 append-qq-markdown 需要在消息发送形式表格中启用 qq-markdown。')
  }

  if (buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE) && !msgForms.includes(MSG_FORM.PUPPETEER_IMAGE)) {
    await notifyQQButtonSkip(session, config, logger, '按钮行为 append-puppeteer-image 需要在消息发送形式表格中启用 puppeteer-image。')
  }
}

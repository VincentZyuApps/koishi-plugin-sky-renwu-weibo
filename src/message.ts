import { Context, h, Session } from 'koishi'
import { MSG_FORM, type Config, type MsgFormType } from './config'
import {
  hasAppendQQPuppeteerImageButtonMode,
  normalizeQQButtonModes,
  type QQMarkdownButtonMode,
} from './qq/button'
import { notifyInvalidQQButtonModes, notifyQQButtonSkip } from './qq/notify'
import {
  sendQQMarkdownMode,
  sendQQPuppeteerImageWithButtons,
  sendStandaloneQQButton,
} from './qq/sender'
import { formatDailyForward } from './templates/forward'
import { formatDailyImageWithText } from './templates/image-with-text'
import { renderDailyImage } from './templates/puppeteer-image'
import { formatDailyText } from './templates/text'
import { formatDailyTextWithImage } from './templates/text-with-image'
import { debugLog } from './utils/logger'
import type { DailyResult } from './weibo'

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
    if (hasAppendQQPuppeteerImageButtonMode(buttonModes)) {
      await notifyQQButtonSkip(session, config, logger, 'Puppeteer 卡片图按钮需要启用 Koishi puppeteer 服务，但当前未启用。')
    }
    return
  }

  await sendWithModeGuard(logger, MSG_FORM.PUPPETEER_IMAGE, async () => {
    debugLog(logger, config, `开始渲染 Puppeteer 卡片图: type=${config.imageType}, width=${config.imageWidth}, quality=${config.screenshotQuality}`)
    const renderedImage = await renderDailyImage(ctx, result, config)
    debugLog(logger, config, `Puppeteer 卡片图渲染完成: base64Length=${renderedImage.base64.length}, size=${renderedImage.width}x${renderedImage.height}`)

    if (hasAppendQQPuppeteerImageButtonMode(buttonModes)) {
      await sendQQPuppeteerImageWithButtons(ctx, session, config, renderedImage, logger)
      return
    }

    await sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  })
}

function toImageMessage(config: Config, imageBase64: string) {
  return h.image(`data:image/${config.imageType};base64,${imageBase64}`)
}

import { Context, h, Session } from 'koishi'
import { MSG_FORM, type Config } from './config'
import type { DailyResult } from './weibo'
import { formatDailyForward } from './templates/forward'
import { formatDailyImageWithText } from './templates/image-with-text'
import { renderDailyImage } from './templates/puppeteer-image'
import { formatDailyText } from './templates/text'
import { formatDailyTextWithImage } from './templates/text-with-image'

export function normalizeMsgForms(config: Config) {
  const rawForms = Array.isArray(config.msgFormArr)
    ? config.msgFormArr
    : [config.msgFormArr].filter(Boolean)

  return rawForms.map((form) => String(form).trim())
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

  if (shouldSendMode(logger, msgForms, MSG_FORM.TEXT_WITH_IMAGE, !!result.text || result.imageBuffers.length > 0)) {
    await sendWithModeGuard(logger, MSG_FORM.TEXT_WITH_IMAGE, () =>
      sendSessionMessage(session, config, formatDailyTextWithImage(result)),
    )
  }

  if (shouldSendMode(logger, msgForms, MSG_FORM.IMAGE_WITH_TEXT, !!result.text || result.imageBuffers.length > 0)) {
    await sendWithModeGuard(logger, MSG_FORM.IMAGE_WITH_TEXT, () =>
      sendSessionMessage(session, config, formatDailyImageWithText(result)),
    )
  }

  if (shouldSendMode(logger, msgForms, MSG_FORM.FORWARD, !!result.text || result.imageBuffers.length > 0)) {
    await sendWithModeGuard(logger, MSG_FORM.FORWARD, () =>
      session.send(h.unescape(formatDailyForward(result, session.bot))),
    )
  }

  if (shouldSendMode(logger, msgForms, MSG_FORM.TEXT, !!result.text)) {
    await sendWithModeGuard(logger, MSG_FORM.TEXT, () =>
      sendSessionMessage(session, config, formatDailyText(result)),
    )
  }

  if (shouldSendMode(logger, msgForms, MSG_FORM.PUPPETEER_IMAGE, !!result.text || result.imageBuffers.length > 0)) {
    await sendWithModeGuard(logger, MSG_FORM.PUPPETEER_IMAGE, async () => {
      if (!ctx.puppeteer) {
        logger.warn('跳过 Puppeteer 卡片图: 当前 Koishi 未启用 puppeteer 服务。')
        return
      }

      const imageBase64 = await renderDailyImage(ctx, result, config)
      await sendSessionMessage(session, config, h.image(`data:image/${config.imageType};base64,${imageBase64}`))
    })
  }
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

import { h, type Context, type Session } from 'koishi'
import { MSG_FORM, type Config } from '../config'
import { logInfo } from '../utils/logger'
import {
  hasAppendQQMarkdownButtonMode,
  hasAppendQQPuppeteerImageButtonMode,
  type QQMarkdownButtonMode,
} from './button'

export async function notifyQQButtonSkip(
  ctx: Context,
  session: Session,
  config: Config,
  reason: string,
) {
  const message = `QQ Markdown 按钮未发送：${reason}`
  if (session.platform === 'qq' || config.verboseConsoleLog) {
    logInfo(ctx, config, message)
  }
  if (config.verboseSessionLog) {
    await sendSessionMessage(session, config, message)
  }
}

export async function notifyInvalidQQButtonModes(
  ctx: Context,
  session: Session,
  config: Config,
  msgForms: string[],
  buttonModes: QQMarkdownButtonMode[],
) {
  if (hasAppendQQMarkdownButtonMode(buttonModes) && !msgForms.includes(MSG_FORM.QQ_MARKDOWN)) {
    await notifyQQButtonSkip(ctx, session, config, '按钮行为 append-qq-markdown 需要在消息发送形式表格中启用 qq-markdown。')
  }

  if (hasAppendQQPuppeteerImageButtonMode(buttonModes) && !msgForms.includes(MSG_FORM.PUPPETEER_IMAGE)) {
    await notifyQQButtonSkip(ctx, session, config, '按钮行为 append-puppeteer-image 需要在消息发送形式表格中启用 puppeteer-image。')
  }
}

function sendSessionMessage(session: Session, config: Config, content: unknown) {
  return session.send(`${getQuotePrefix(session, config)}${String(content)}`)
}

function getQuotePrefix(session: Session, config: Config) {
  return config.enableQuote && session.messageId ? h.quote(session.messageId) : ''
}

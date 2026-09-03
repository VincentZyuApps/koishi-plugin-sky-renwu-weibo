import { Bot, Context, h, Session } from 'koishi'
import { MSG_FORM, type Config, type MsgFormType } from './config'
import {
  filterQQButtonModesForSession,
  filterQQButtonModesForTarget,
  hasAppendQQMarkdownButtonMode,
  hasAppendQQPuppeteerImageButtonMode,
  hasStandaloneQQButtonMode,
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
import { formatDailyQQMarkdown } from './templates/qq-markdown'
import { formatDailyText } from './templates/text'
import { formatDailyTextWithImage } from './templates/text-with-image'
import { logInfo } from './utils/logger'
import type { DailyResult } from './weibo'
import { buildDailyKeyboard, QQ_MARKDOWN_BUTTON_ONLY_CONTENT } from './qq/keyboard'
import { sendQQMarkdownToTarget } from './qq/markdown'
import { sendQQPuppeteerImageWithButtonsToTarget } from './qq/sender'
import { formatDailyMessageIntro } from './templates/common/intro'

export function normalizeMsgForms(config: Config) {
  const rawForms = Array.isArray(config.msgFormArr) ? config.msgFormArr : []
  const forms: MsgFormType[] = []

  for (const entry of rawForms) {
    const mode = typeof entry === 'string' ? entry : entry?.enabled ? entry.mode : ''
    const normalized = String(mode || '').trim() as MsgFormType
    if (!normalized) continue
    forms.push(normalized)
  }

  return forms
}

export async function sendDailyResult(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
) {
  const msgForms = normalizeMsgForms(config)
  const intro = formatDailyMessageIntro(config, 'passive')
  if (!msgForms.length) {
    return sendSessionMessage(session, config, '已获取到光遇每日任务，但未选择任何发送形式。')
  }

  const configuredButtonModes = normalizeQQButtonModes(config)
  const buttonModes = filterQQButtonModesForSession(configuredButtonModes, session)
  logInfo(ctx, config, '', `消息发送形式: ${msgForms.join(', ') || '(empty)'}`)
  logInfo(ctx, config, '', `QQ Markdown 按钮行为配置: ${configuredButtonModes.join(', ') || '(empty)'}`)
  logInfo(ctx, config, '', `本次生效的 QQ Markdown 按钮行为: ${buttonModes.join(', ') || '(empty)'}`)
  logInfo(ctx, config, '', `发送执行模式: ${config.strictOrderMode !== false ? 'serial' : 'parallel'}`)
  await notifyInvalidQQButtonModes(ctx, session, config, msgForms, buttonModes)
  const tasks = msgForms.map((mode) => () => sendDailyMode(ctx, session, config, result, msgForms, buttonModes, mode, intro))

  if (config.strictOrderMode !== false) {
    for (const task of tasks) await task()
  } else {
    await Promise.all(tasks.map((task) => task()))
  }

  await sendStandaloneQQButton(ctx, session, config, buttonModes)
}

function sendSessionMessage(session: Session, config: Config, content: unknown) {
  return session.send(`${getQuotePrefix(session, config)}${String(content)}`)
}

function getQuotePrefix(session: Session, config: Config) {
  return config.enableQuote && session.messageId ? h.quote(session.messageId) : ''
}

function shouldSendMode(
  ctx: Context,
  config: Config,
  msgForms: string[],
  mode: string,
  payloadReady = true,
) {
  const selected = msgForms.includes(mode)
  if (!selected) return false

  if (!payloadReady) {
    logInfo(ctx, config, `跳过发送模式 ${mode}: 当前数据不足。`)
    return false
  }

  return true
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

async function sendDailyMode(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
  msgForms: string[],
  buttonModes: QQMarkdownButtonMode[],
  mode: MsgFormType,
  intro: string,
) {
  logInfo(ctx, config, '', `准备执行发送模式: ${mode}`)
  if (mode === MSG_FORM.TEXT_WITH_IMAGE && shouldSendMode(ctx, config, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendWithModeGuard(ctx, config, mode, () =>
      sendSessionMessage(session, config, formatDailyTextWithImage(result, intro)),
    )
  }

  if (mode === MSG_FORM.IMAGE_WITH_TEXT && shouldSendMode(ctx, config, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendWithModeGuard(ctx, config, mode, () =>
      sendSessionMessage(session, config, formatDailyImageWithText(result, intro)),
    )
  }

  if (mode === MSG_FORM.FORWARD && shouldSendMode(ctx, config, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    if (!isForwardPlatformAllowed(config, session.platform)) {
      logInfo(ctx, config, `跳过发送模式 ${mode}: 当前平台 ${session.platform || '(unknown)'} 不在 forward 图文合并转发允许的平台列表中。`)
      return
    }

    return sendWithModeGuard(ctx, config, mode, () =>
      session.send(h.unescape(formatDailyForward(result, session.bot, intro))),
    )
  }

  if (mode === MSG_FORM.TEXT && shouldSendMode(ctx, config, msgForms, mode, !!result.text)) {
    return sendWithModeGuard(ctx, config, mode, () =>
      sendSessionMessage(session, config, formatDailyText(result, intro)),
    )
  }

  if (mode === MSG_FORM.PUPPETEER_IMAGE && shouldSendMode(ctx, config, msgForms, mode, !!result.text || result.imageBuffers.length > 0)) {
    return sendPuppeteerImageMode(ctx, session, config, result, buttonModes, intro)
  }

  if (mode === MSG_FORM.QQ_MARKDOWN && shouldSendMode(ctx, config, msgForms, mode, !!result.text)) {
    return sendQQMarkdownMode(ctx, session, config, result, buttonModes, intro)
  }
}

async function sendPuppeteerImageMode(
  ctx: Context,
  session: Session,
  config: Config,
  result: DailyResult,
  buttonModes: QQMarkdownButtonMode[],
  intro: string,
) {
  if (!ctx.puppeteer) {
    logInfo(ctx, config, '跳过 Puppeteer 卡片图: 当前 Koishi 未启用 puppeteer 服务。')
    if (hasAppendQQPuppeteerImageButtonMode(buttonModes)) {
      await notifyQQButtonSkip(ctx, session, config, 'Puppeteer 卡片图按钮需要启用 Koishi puppeteer 服务，但当前未启用。')
    }
    return
  }

  await sendWithModeGuard(ctx, config, MSG_FORM.PUPPETEER_IMAGE, async () => {
    logInfo(ctx, config, '', `开始渲染 Puppeteer 卡片图: type=${config.imageType}, width=${config.imageWidth}, quality=${config.screenshotQuality}`)
    const renderedImage = await renderDailyImage(ctx, result, config, intro)
    logInfo(ctx, config, '', `Puppeteer 卡片图渲染完成: base64Length=${renderedImage.base64.length}, size=${renderedImage.width}x${renderedImage.height}`)

    if (hasAppendQQPuppeteerImageButtonMode(buttonModes)) {
      await sendQQPuppeteerImageWithButtons(ctx, session, config, renderedImage, intro)
      return
    }

    await sendSessionMessage(session, config, toImageMessage(config, renderedImage.base64))
  })
}

function toImageMessage(config: Config, imageBase64: string) {
  return h.image(`data:image/${config.imageType};base64,${imageBase64}`)
}

function isForwardPlatformAllowed(config: Pick<Config, 'restrictForwardPlatforms' | 'forwardSupportedPlatforms'>, platform?: string) {
  if (!config.restrictForwardPlatforms) return true
  const supportedPlatforms = normalizeConfigStringList(config.forwardSupportedPlatforms)
  return supportedPlatforms.includes(String(platform || '').trim())
}

function normalizeConfigStringList(values: unknown): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of Array.isArray(values) ? values : []) {
    const entry = String(value || '').trim()
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    normalized.push(entry)
  }
  return normalized
}

export interface ActiveDeliveryTarget {
  bot: Bot
  channelId: string
  label: string
}

export interface ActiveDeliveryResult {
  ok: boolean
  sentModes: string[]
  skippedModes: string[]
  failures: string[]
}

export async function sendDailyResultToTarget(
  ctx: Context,
  target: ActiveDeliveryTarget,
  config: Config,
  result: DailyResult,
): Promise<ActiveDeliveryResult> {
  const msgForms = normalizeMsgForms(config)
  const intro = formatDailyMessageIntro(config, 'active')
  const sentModes: string[] = []
  const skippedModes: string[] = []
  const failures: string[] = []

  if (!msgForms.length) {
    return {
      ok: false,
      sentModes,
      skippedModes,
      failures: ['未选择任何消息发送形式。'],
    }
  }

  const configuredButtonModes = normalizeQQButtonModes(config)
  const buttonModes = filterQQButtonModesForTarget(configuredButtonModes, {
    platform: target.bot.platform,
    channelId: target.channelId,
  })

  if (hasAppendQQMarkdownButtonMode(configuredButtonModes) && !msgForms.includes(MSG_FORM.QQ_MARKDOWN)) {
    logInfo(ctx, config, 'QQ Markdown 按钮未发送：按钮行为 append-qq-markdown 需要在消息发送形式表格中启用 qq-markdown。')
  }
  if (hasAppendQQPuppeteerImageButtonMode(configuredButtonModes) && !msgForms.includes(MSG_FORM.PUPPETEER_IMAGE)) {
    logInfo(ctx, config, 'QQ Markdown 按钮未发送：按钮行为 append-puppeteer-image 需要在消息发送形式表格中启用 puppeteer-image。')
  }

  const sendMode = async (mode: string, task: () => Promise<unknown>) => {
    try {
      await task()
      sentModes.push(mode)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${mode}: ${message}`)
      logInfo(ctx, config, `主动推送模式失败 ${mode} -> ${target.label}: ${message}`)
    }
  }

  const skipMode = (mode: string, reason: string) => {
    skippedModes.push(mode)
    logInfo(ctx, config, `主动推送跳过 ${mode} -> ${target.label}: ${reason}`)
  }

  const tasks = msgForms.map((mode) => async () => {
    if (mode === MSG_FORM.TEXT_WITH_IMAGE) {
      if (!result.text && result.imageBuffers.length === 0) return skipMode(mode, '当前数据不足。')
      return sendMode(mode, () => sendTargetMessage(target, formatDailyTextWithImage(result, intro)))
    }

    if (mode === MSG_FORM.IMAGE_WITH_TEXT) {
      if (!result.text && result.imageBuffers.length === 0) return skipMode(mode, '当前数据不足。')
      return sendMode(mode, () => sendTargetMessage(target, formatDailyImageWithText(result, intro)))
    }

    if (mode === MSG_FORM.FORWARD) {
      if (!result.text && result.imageBuffers.length === 0) return skipMode(mode, '当前数据不足。')
      if (!isForwardPlatformAllowed(config, target.bot.platform)) return skipMode(mode, `平台 ${target.bot.platform} 不在 forward 图文合并转发允许的平台列表中。`)
      return sendMode(mode, () => sendTargetMessage(target, h.unescape(formatDailyForward(result, target.bot, intro))))
    }

    if (mode === MSG_FORM.TEXT) {
      if (!result.text) return skipMode(mode, '当前数据没有文字任务。')
      return sendMode(mode, () => sendTargetMessage(target, formatDailyText(result, intro)))
    }

    if (mode === MSG_FORM.PUPPETEER_IMAGE) {
      if (!result.text && result.imageBuffers.length === 0) return skipMode(mode, '当前数据不足。')
      if (!ctx.puppeteer) return skipMode(mode, '当前 Koishi 未启用 puppeteer 服务。')
      return sendMode(mode, async () => {
        const renderedImage = await renderDailyImage(ctx, result, config, intro)
        if (hasAppendQQPuppeteerImageButtonMode(buttonModes)) {
          try {
            await sendQQPuppeteerImageWithButtonsToTarget(ctx, target.bot, target.channelId, config, renderedImage, intro)
            return
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            logInfo(ctx, config, `主动推送 append-puppeteer-image 不可用，回退普通卡片图: ${message}`)
          }
        }
        await sendTargetMessage(target, toImageMessage(config, renderedImage.base64))
      })
    }

    if (mode === MSG_FORM.QQ_MARKDOWN) {
      if (!result.text) return skipMode(mode, '当前数据没有文字任务。')
      if (target.bot.platform !== 'qq') return skipMode(mode, `平台 ${target.bot.platform} 不是 QQ 官方 Bot。`)
      return sendMode(mode, () => sendQQMarkdownToTarget(
        target.bot,
        target.channelId,
        formatDailyQQMarkdown(result, config, intro),
        hasAppendQQMarkdownButtonMode(buttonModes) ? buildDailyKeyboard(config) : null,
      ).then(() => undefined))
    }
  })

  if (config.strictOrderMode !== false) {
    for (const task of tasks) await task()
  } else {
    await Promise.all(tasks.map((task) => task()))
  }

  if (hasStandaloneQQButtonMode(buttonModes)) {
    await sendMode('qq-markdown-button', () => sendQQMarkdownToTarget(
      target.bot,
      target.channelId,
      QQ_MARKDOWN_BUTTON_ONLY_CONTENT,
      buildDailyKeyboard(config),
    ).then(() => undefined))
  }

  return {
    ok: sentModes.length > 0 && failures.length === 0,
    sentModes,
    skippedModes,
    failures,
  }
}

function sendTargetMessage(target: ActiveDeliveryTarget, content: any) {
  return target.bot.sendMessage(target.channelId, content)
}

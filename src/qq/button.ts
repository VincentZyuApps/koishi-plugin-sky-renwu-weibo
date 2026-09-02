import type { Session } from 'koishi'
import { QQ_MARKDOWN_BUTTON_MODE, type Config, type QQMarkdownButtonModeType } from '../config'

export type QQMarkdownButtonMode = QQMarkdownButtonModeType

export function normalizeQQButtonModes(config: Pick<Config, 'qqMarkdownButtonMode'>): QQMarkdownButtonMode[] {
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

export function filterQQButtonModesForSession(
  buttonModes: readonly QQMarkdownButtonMode[],
  session: Session,
): QQMarkdownButtonMode[] {
  return isQQGuildChannel(session) ? [...buttonModes] : []
}

export function filterQQButtonModesForTarget(
  buttonModes: readonly QQMarkdownButtonMode[],
  target: { platform: string; channelId: string },
): QQMarkdownButtonMode[] {
  return target.platform === 'qq'
    && !String(target.channelId || '').startsWith('private:')
    ? [...buttonModes]
    : []
}

export function isQQGuildChannel(session: Session) {
  return session.platform === 'qq'
    && !!session.guildId
    && !String(session.channelId || '').startsWith('private:')
}

export function hasStandaloneQQButtonMode(buttonModes: readonly QQMarkdownButtonMode[]) {
  return buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.STANDALONE)
}

export function hasAppendQQMarkdownButtonMode(buttonModes: readonly QQMarkdownButtonMode[]) {
  return buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN)
}

export function hasAppendQQPuppeteerImageButtonMode(buttonModes: readonly QQMarkdownButtonMode[]) {
  return buttonModes.includes(QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE)
}

import { h, Session } from 'koishi'
import type { Config } from './config'

export interface KeyboardButton {
  render_data: { label: string; style: number }
  action: { type: number; permission: { type: number }; data: string; enter: boolean }
}

export interface KeyboardRows {
  rows: { buttons: KeyboardButton[] }[]
}

export const DEFAULT_QQ_MARKDOWN_KEYBOARD: KeyboardRows = {
  rows: [
    {
      buttons: [
        {
          render_data: { label: '🔄 再次获取', style: 1 },
          action: { type: 2, permission: { type: 2 }, data: '${commandName}', enter: true },
        },
        {
          render_data: { label: '🎮 玩玩别的', style: 0 },
          action: { type: 2, permission: { type: 2 }, data: 'help', enter: true },
        },
      ],
    },
  ],
}

export const QQ_MARKDOWN_BUTTON_ONLY_CONTENT = '# 光遇任务操作按钮'

export function buildDailyKeyboard(config: Config): KeyboardRows {
  let raw = config.qqMarkdownKeyboardJson || stringifyCompact(DEFAULT_QQ_MARKDOWN_KEYBOARD)
  raw = raw.replace(/\$\{commandName\}/g, config.commandName)

  try {
    const parsed = JSON.parse(raw)
    if (parsed?.rows?.[0]?.buttons?.length) return parsed
  } catch {}

  return resolveKeyboardCommands(DEFAULT_QQ_MARKDOWN_KEYBOARD, config)
}

export function formatPuppeteerImageMarkdown(imageUrl: string, width = 900, height = 1200) {
  return [
    '# 光遇国服每日任务',
    '',
    '## 微博图片',
    '',
    `![光遇国服每日任务卡片图 #${width}px #${height}px](${imageUrl})`,
  ].join('\n')
}

export async function sendQQMarkdown(
  session: Session,
  markdown: string,
  keyboard?: object | null,
  throwOnError = false,
) {
  try {
    const payload = buildMarkdownPayload(session, markdown, keyboard)
    const bot = session.bot as any

    if (bot.config?.autoStreamText) {
      await session.send(h('qq:rawmarkdown', buildRawMarkdownAttrs(markdown, keyboard)))
      return
    }

    const qq = (session as any).qq
    if (qq?.sendPrivateMessage && session.isDirect) {
      await qq.sendPrivateMessage(session.channelId, payload)
      return
    }
    if (qq?.sendMessage) {
      await qq.sendMessage(session.channelId, payload)
      return
    }

    await bot.internal.sendMessage(session.channelId, payload)
  } catch (error) {
    if (throwOnError) throw error
  }
}

function buildMarkdownPayload(session: Session, markdown: string, keyboard?: object | null) {
  const payload: any = {
    msg_type: 2,
    content: '光遇国服每日任务',
    markdown: { content: markdown },
  }

  if ((keyboard as any)?.rows?.length) {
    payload.keyboard = { content: keyboard }
  }

  if (session.messageId) {
    const now = Date.now()
    const msgTime = session.timestamp ?? now
    if (now - msgTime < 300000) {
      payload.msg_id = session.messageId
      payload.msg_seq = Math.floor(Math.random() * 0xffffff) + 1
    }
  }

  return payload
}

function buildRawMarkdownAttrs(markdown: string, keyboard?: object | null) {
  const attrs: any = { content: markdown }
  if ((keyboard as any)?.rows?.length) {
    attrs.keyboard = keyboard
  }
  return attrs
}

function resolveKeyboardCommands(keyboard: KeyboardRows, config: Config): KeyboardRows {
  return JSON.parse(JSON.stringify(keyboard).replace(/\$\{commandName\}/g, config.commandName))
}

export function stringifyCompact(obj: object): string {
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
}

import type { Config } from '../config'

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
          render_data: { label: '再次获取', style: 1 },
          action: { type: 2, permission: { type: 2 }, data: '${commandName}', enter: true },
        },
        {
          render_data: { label: '获取帮助', style: 0 },
          action: { type: 2, permission: { type: 2 }, data: '${commandName} --help', enter: true },
        },
      ],
    },
    {
      buttons: [
        {
          render_data: { label: '玩玩别的', style: 0 },
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

export function stringifyCompact(obj: object): string {
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
}

function resolveKeyboardCommands(keyboard: KeyboardRows, config: Config): KeyboardRows {
  return JSON.parse(JSON.stringify(keyboard).replace(/\$\{commandName\}/g, config.commandName))
}

import { Bot, h, Session } from 'koishi'

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

export async function sendQQMarkdownToTarget(
  bot: Bot,
  channelId: string,
  markdown: string,
  keyboard?: object | null,
) {
  const payload = buildTargetMarkdownPayload(markdown, keyboard)
  const rawAttrs = buildRawMarkdownAttrs(markdown, keyboard)

  if (!(keyboard as any)?.rows?.length) {
    try {
      const messageIds = await bot.sendMessage(channelId, h('qq:rawmarkdown-without-keyboard', rawAttrs))
      if (messageIds.length) return messageIds
    } catch {}
  }

  const internal = (bot as any).internal
  if (!internal?.sendMessage) {
    throw new Error('当前 QQ Bot 未提供 internal.sendMessage，无法主动发送 QQ Markdown。')
  }

  const response = await internal.sendMessage(channelId, payload)
  return response?.id ? [String(response.id)] : []
}

function buildMarkdownPayload(session: Session, markdown: string, keyboard?: object | null) {
  const payload = buildTargetMarkdownPayload(markdown, keyboard)

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

function buildTargetMarkdownPayload(markdown: string, keyboard?: object | null) {
  const payload: any = {
    msg_type: 2,
    content: '光遇国服每日任务',
    markdown: { content: markdown },
  }

  if ((keyboard as any)?.rows?.length) {
    payload.keyboard = { content: keyboard }
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

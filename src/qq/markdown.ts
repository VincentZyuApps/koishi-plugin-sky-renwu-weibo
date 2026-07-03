import { h, Session } from 'koishi'

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

export function bufferToDataUrl(buffer: Buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buffer.toString('base64')}`
}

export function addForwardNode(authorId: string | undefined, authorName: string, value: string) {
  return `
    <message>
      <author ${authorId ? `id="${escapeAttr(authorId)}"` : ''} name="${escapeAttr(authorName)}"/>
      ${value}
    </message>`
}

export function getBotName(botSelf?: { userId?: string; username?: string; name?: string }) {
  return botSelf?.username || botSelf?.name || '光遇每日任务'
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

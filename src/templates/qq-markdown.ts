import { QQ_MARKDOWN_MODE, type Config } from '../config'
import { fitImageDimensions, getImageDimensions } from '../qq/image'
import type { DailyResult } from '../weibo'
import { DAILY_TASK_HINT_MARKDOWN } from './common/hint'

const QQ_MARKDOWN_IMAGE_SIZE = {
  maxWidth: 600,
  maxHeight: 1200,
  fallback: { width: 600, height: 360 },
}

export function formatDailyQQMarkdown(result: DailyResult, config: Config) {
  if (config.qqMarkdownMode === QQ_MARKDOWN_MODE.BLOCKQUOTE) {
    return formatBlockquoteMarkdown(result, config)
  }

  return formatStructuredMarkdown(result, config)
}

function formatStructuredMarkdown(result: DailyResult, config: Config) {
  const { mainText, sourceText } = splitDailyText(result.text)
  const contentLines = normalizeLines(stripMatchPrefix(mainText, config.matchPattern))
  const metaTable = buildMetaTable(result, config)
  const markdown = [
    '# 光遇国服每日任务',
    '',
    DAILY_TASK_HINT_MARKDOWN,
    '',
    ...metaTable,
    '',
    '## 微博文字内容',
    '',
  ]

  const tagLines: string[] = []
  let lastWasHeading = false

  for (const line of contentLines) {
    if (isTopicTagLine(line)) {
      tagLines.push(line)
      continue
    }

    if (isImageLegendLine(line)) {
      markdown.push(formatImageLegendLine(line))
      lastWasHeading = false
      continue
    }

    const heading = parseSectionHeading(line)
    if (heading) {
      markdown.push('', `### ${heading}`)
      lastWasHeading = true
      continue
    }

    if (isLikelyTaskLine(line)) {
      markdown.push(formatTaskLine(line))
      lastWasHeading = false
    } else if (isAlertLine(line)) {
      markdown.push(`- ${line}`)
      lastWasHeading = false
    } else if (isIndentedNoteLine(line)) {
      markdown.push(`  - ${line.replace(/^[.。]\s*/, '')}`)
      lastWasHeading = false
    } else if (isUrlOnlyLine(line) || lastWasHeading) {
      markdown.push(`> ${line}`)
      lastWasHeading = false
    } else {
      markdown.push(line)
      lastWasHeading = false
    }
  }

  appendTopicTags(markdown, tagLines)
  appendSourceSection(markdown, sourceText, result.sourceUrl)
  appendImageSection(markdown, result)
  return compactBlankLines(markdown).join('\n')
}

function formatBlockquoteMarkdown(result: DailyResult, config: Config) {
  const lines = normalizeLines(result.text)
  const metaTable = buildMetaTable(result, config)
  const markdown = [
    '# 光遇国服每日任务',
    '',
    DAILY_TASK_HINT_MARKDOWN,
    '',
    ...metaTable,
    '',
    '## 微博文字内容',
    '',
    ...lines.map((line) => `> ${line}`),
  ]

  if (result.sourceUrl && !result.text.includes(result.sourceUrl)) {
    markdown.push('', `> 原文链接：${result.sourceUrl}`)
  }

  appendImageSection(markdown, result)
  return compactBlankLines(markdown).join('\n')
}

function splitDailyText(text: string) {
  const marker = '------------'
  const index = text.indexOf(marker)
  if (index < 0) return { mainText: text, sourceText: '' }

  return {
    mainText: text.slice(0, index).trim(),
    sourceText: text.slice(index + marker.length).trim(),
  }
}

function stripMatchPrefix(text: string, pattern: string) {
  try {
    return text.replace(new RegExp(pattern), '').trim()
  } catch {
    return text.trim()
  }
}

function normalizeLines(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function isLikelySectionTitle(line: string) {
  return /^(每日任务|任务|季节蜡烛|季蜡|大蜡烛|大蜡|近期活动日历|活动日历|落石点|日程提醒|免费魔法|今日免费魔法|任务图|蜡烛位置)$/.test(line)
}

function parseSectionHeading(line: string) {
  const markedTitle = line.match(/^=+\s*[『「【\[]?(.+?)[』」】\]]?\s*=+$/)
  if (markedTitle && isLikelySectionTitle(markedTitle[1].trim())) {
    return markedTitle[1].replace(/[：:]$/, '').trim()
  }

  const bracketTitle = line.match(/^[『「【\[](.+?)[』」】\]]$/)
  if (bracketTitle && isLikelySectionTitle(bracketTitle[1].trim())) {
    return bracketTitle[1].replace(/[：:]$/, '').trim()
  }

  if (isLikelySectionTitle(line)) {
    return line.replace(/[：:]$/, '').trim()
  }

  return ''
}

function isImageLegendLine(line: string) {
  return /^图\s*\d+\s*[-—:：]\s*/.test(line)
}

function formatImageLegendLine(line: string) {
  return line.replace(/^图\s*(\d+)\s*[-—:：]\s*(.+)$/, (_, index, label) => `- 图 ${index}: ${label}`)
}

function isLikelyTaskLine(line: string) {
  return /^(\d+|[一二三四五六七八九十])[\.\、\)]\s*/.test(line)
}

function formatTaskLine(line: string) {
  return line.replace(/^(\d+|[一二三四五六七八九十])[\.\、\)]\s*/, (_, index) => `${index}. `)
}

function isAlertLine(line: string) {
  return /^[❗⚠️]/.test(line)
}

function isIndentedNoteLine(line: string) {
  return /^[.。]\s*\S/.test(line)
}

function isTopicTagLine(line: string) {
  return /#.+#/.test(line)
}

function isUrlOnlyLine(line: string) {
  return /^https?:\/\//.test(line) || /https?:\/\/\S+/.test(line)
}

function appendTopicTags(markdown: string[], tagLines: string[]) {
  if (!tagLines.length) return

  markdown.push('', '### 话题')
  for (const line of tagLines) {
    markdown.push(`> ${line}`)
  }
}

function appendSourceSection(markdown: string[], sourceText: string, sourceUrl?: string) {
  const sourceLines = normalizeLines(sourceText)
  if (!sourceLines.length && !sourceUrl) return

  markdown.push('', '### 来源')
  for (const line of sourceLines) {
    markdown.push(`> ${line}`)
  }

  if (sourceUrl && !sourceLines.some((line) => line.includes(sourceUrl))) {
    markdown.push(`> 原文链接：${sourceUrl}`)
  }
}

function appendImageSection(markdown: string[], result: DailyResult) {
  const urls = result.imageUrls.filter(Boolean)
  if (!urls.length) return

  markdown.push('', '## 微博图片')
  const canUseIndexedBuffers = urls.length === result.imageBuffers.length
  for (const [index, url] of urls.entries()) {
    const dimensions = fitImageDimensions(
      canUseIndexedBuffers ? getImageDimensions(result.imageBuffers[index]) : null,
      QQ_MARKDOWN_IMAGE_SIZE,
    )
    markdown.push(`![微博图片 ${index + 1} #${dimensions.width}px #${dimensions.height}px](${url})`)
  }
}

function compactBlankLines(lines: string[]) {
  return lines.filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
}

function buildMetaTable(result: DailyResult, config: Config) {
  return [
    '| Key | Value |',
    '| --- | --- |',
    `| 数据来源 | 微博 @${escapeTableCell(config.authorName)} |`,
    `| 生成时间 | ${formatNow()} |`,
    `| 微博图片 | ${result.imageUrls.length || result.imageBuffers.length} 张 |`,
  ]
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, '\\|')
}

function formatNow() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())
}

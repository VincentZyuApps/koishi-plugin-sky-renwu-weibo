import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { existsSync, readFileSync } from 'fs'
import type { Config } from '../config'
import type { DailyResult } from '../weibo'
import { DAILY_TASK_HINT_TEXT } from './common/hint'
import { resolveRuntimeFontPath } from '../utils/fonts'
import { bufferToDataUrl } from '../utils/image'

export interface RenderedDailyImage {
  base64: string
  width: number
  height: number
}

export async function renderDailyImage(
  ctx: Context,
  result: DailyResult,
  config: Config,
): Promise<RenderedDailyImage> {
  const page = await ctx.puppeteer.page()

  try {
    await page.setViewport({
      width: config.imageWidth,
      height: 900,
      deviceScaleFactor: 1,
    })
    await page.setContent(generateDailyHtml(ctx, result, config))
    await page.waitForSelector('.container', { timeout: 10000 })
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined)

    const contentHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewport({
      width: config.imageWidth,
      height: contentHeight,
      deviceScaleFactor: 1,
    })
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined)

    const screenshotOptions: any = {
      encoding: 'base64',
      type: config.imageType,
    }
    if (config.imageType !== 'png') {
      screenshotOptions.quality = config.screenshotQuality
    }

    const base64 = await page.screenshot(screenshotOptions)
    return {
      base64,
      width: config.imageWidth,
      height: contentHeight,
    }
  } finally {
    await page.close()
  }
}

function generateDailyHtml(ctx: Context, result: DailyResult, config: Config) {
  const width = config.imageWidth
  const [mainText, sourceText] = splitSourceText(result.text)
  const fontFace = generateFontFace(ctx, config)
  const imageCount = result.imageBuffers.length
  const imageHtml = result.imageBuffers.map((image, index) => `
    <div class="image-frame">
      <img src="${bufferToDataUrl(image)}" alt="daily-${index + 1}">
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
${fontFace}

    body {
      width: ${width}px;
      min-height: 760px;
      padding: 20px;
      color: #1a2332;
      font-family: ${fontFace ? "'SkyDailyFont', " : ''}-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      background: linear-gradient(135deg, #9cecff 0%, #5cd4f9 48%, #8fb9ff 100%);
      line-height: 1.2;
    }

    .container {
      width: 100%;
      margin: 0 auto;
      padding: 20px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.67);
      border: 1px solid rgba(255, 255, 255, 0.38);
      box-shadow: 0 8px 32px rgba(31, 132, 173, 0.35);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .header {
      margin-bottom: 15px;
      padding: 20px 20px 14px;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 4px 16px rgba(31, 132, 173, 0.18);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .kicker {
      display: inline-flex;
      align-items: center;
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      color: #127ea4;
      background: rgba(92, 212, 249, 0.2);
      border: 1px solid rgba(92, 212, 249, 0.35);
      font-size: 22px;
      font-weight: 800;
      text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.85);
    }

    .title {
      margin-top: 15px;
      color: #148fbd;
      font-size: 62px;
      line-height: 1.08;
      font-weight: 900;
      letter-spacing: 0;
      text-shadow:
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 16px rgba(255, 255, 255, 0.9),
        0 4px 20px rgba(92, 212, 249, 0.72);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22));
    }

    .hint {
      margin-top: 13px;
      padding: 12px 16px;
      border-radius: 12px;
      color: #2c5f76;
      background: rgba(255, 255, 255, 0.3);
      border: 1px solid rgba(92, 212, 249, 0.28);
      font-size: 18px;
      font-weight: 888;
      line-height: 1.45;
      text-shadow:
        -1px -1px 0 rgba(255, 255, 255, 0.92),
        1px -1px 0 rgba(255, 255, 255, 0.92),
        -1px 1px 0 rgba(255, 255, 255, 0.92),
        1px 1px 0 rgba(255, 255, 255, 0.92),
        0 0 8px rgba(255, 255, 255, 0.82);
    }

    .date {
      margin: 10px 0 15px;
      color: #245b73;
      font-size: 25px;
      font-weight: 900;
      text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.9);
    }

    .author-line {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      margin-bottom: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(92, 212, 249, 0.18), rgba(143, 185, 255, 0.18));
      border: 1px solid rgba(92, 212, 249, 0.34);
      box-shadow: 0 2px 10px rgba(31, 132, 173, 0.12);
      color: #148fbd;
      font-size: 31px;
      font-weight: 900;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow:
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 10px rgba(255, 255, 255, 0.9),
        0 3px 15px rgba(92, 212, 249, 0.45);
    }

    .author-label {
      flex: 0 0 auto;
      color: #2c5f76;
    }

    .author-inline-label {
      color: #2c5f76;
    }

    .author-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .meta-item {
      min-width: 0;
      padding: 14px 16px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(92, 212, 249, 0.16), rgba(143, 185, 255, 0.16));
      border: 1px solid rgba(92, 212, 249, 0.34);
      box-shadow: 0 2px 10px rgba(31, 132, 173, 0.12);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 12px;
      white-space: nowrap;
      overflow: hidden;
    }

    .meta-label {
      flex: 0 0 auto;
      color: #2c5f76;
      font-size: 30px;
      font-weight: 800;
      line-height: 1.2;
      text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.85);
    }

    .meta-value {
      min-width: 0;
      color: #148fbd;
      font-size: 35px;
      font-weight: 900;
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0;
      text-shadow:
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 10px rgba(255, 255, 255, 0.9),
        0 3px 15px rgba(92, 212, 249, 0.5);
    }

    .content {
      padding: 20px;
      display: grid;
      gap: 15px;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 4px 16px rgba(31, 132, 173, 0.16);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .text-panel {
      padding: 20px;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.34);
      border: 2px solid rgba(92, 212, 249, 0.26);
      box-shadow: 0 4px 18px rgba(31, 132, 173, 0.14);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .section-title {
      margin-bottom: 12px;
      color: #148fbd;
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 0;
      text-shadow:
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 12px rgba(255, 255, 255, 0.9),
        0 3px 15px rgba(92, 212, 249, 0.5);
    }

    .daily-text {
      color: #16394d;
      font-size: 31px;
      line-height: 1.55;
      font-weight: 750;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      text-shadow:
        -1px -1px 0 rgba(255, 255, 255, 0.95),
        1px -1px 0 rgba(255, 255, 255, 0.95),
        -1px 1px 0 rgba(255, 255, 255, 0.95),
        1px 1px 0 rgba(255, 255, 255, 0.95),
        0 2px 8px rgba(255, 255, 255, 0.75);
    }

    .image-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .image-frame {
      overflow: hidden;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.34);
      border: 2px solid rgba(255, 255, 255, 0.55);
      box-shadow: 0 6px 22px rgba(31, 132, 173, 0.22);
    }

    .image-frame img {
      display: block;
      width: 100%;
      height: auto;
    }

    .source {
      padding: 14px 18px;
      border-radius: 10px;
      color: #2c5f76;
      background: rgba(255, 255, 255, 0.28);
      border: 1px solid rgba(92, 212, 249, 0.26);
      font-size: 22px;
      line-height: 1.45;
      font-weight: 800;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.86);
    }

    .empty {
      color: #2c5f76;
      font-size: 26px;
      font-weight: 900;
      text-align: center;
      padding: 20px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.28);
      border: 1px solid rgba(92, 212, 249, 0.26);
      text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.86);
    }
  </style>
</head>
<body>
  <main class="container">
    <section class="header">
      <div class="kicker">✨ Sky Daily</div>
      <div class="title">光遇国服每日任务</div>
      <div class="hint">${escapeHtml(DAILY_TASK_HINT_TEXT)}</div>
      <div class="date">${escapeHtml(formatToday())}</div>
      <div class="author-line">
        <span class="author-label">来源博主</span>
        <span class="author-value">${escapeHtml(config.authorName)} · <span class="author-inline-label">UID</span> ${escapeHtml(config.uid)}</span>
      </div>
      <div class="meta-row">
        <div class="meta-item">
          <span class="meta-label">微博图片数量</span>
          <span class="meta-value">${imageCount} 张</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">发送形式</span>
          <span class="meta-value">浏览器渲染图</span>
        </div>
      </div>
    </section>
    <section class="content">
      <div class="text-panel">
        <div class="section-title">📌 今日任务</div>
        <div class="daily-text">${escapeHtml(mainText || '今日任务还未更新')}</div>
      </div>
      ${imageHtml ? `<div class="image-grid">${imageHtml}</div>` : '<div class="empty">暂无微博图片</div>'}
      ${sourceText ? `<div class="source">${escapeHtml(sourceText)}</div>` : ''}
    </section>
  </main>
</body>
</html>`
}

function generateFontFace(ctx: Context, config: Config) {
  if (!config.useCustomFont) return ''

  const fontPath = resolveRuntimeFontPath(ctx, config.imageFontPath)
  if (!fontPath || !existsSync(fontPath)) return ''

  try {
    const fontBase64 = readFileSync(fontPath).toString('base64')
    return `@font-face {
      font-family: 'SkyDailyFont';
      src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
      font-weight: 400 900;
    }`
  } catch {
    return ''
  }
}

function splitSourceText(text: string) {
  const marker = '------------'
  const index = text.indexOf(marker)
  if (index < 0) return [text, '']
  return [
    text.slice(0, index).trim(),
    text.slice(index).trim(),
  ]
}

function formatToday() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

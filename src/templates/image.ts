import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { existsSync, readFileSync } from 'fs'
import type { Config } from '../config'
import type { DailyResult } from '../weibo'
import { resolveRuntimeFontPath } from '../utils'
import { bufferToDataUrl } from './shared'

export async function renderDailyImage(
  ctx: Context,
  result: DailyResult,
  config: Config,
) {
  const page = await ctx.puppeteer.page()

  try {
    await page.setViewport({
      width: config.imageWidth,
      height: 900,
      deviceScaleFactor: 1,
    })
    await page.setContent(generateDailyHtml(ctx, result, config))
    await page.waitForSelector('.daily-card', { timeout: 10000 })
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

    return await page.screenshot(screenshotOptions)
  } finally {
    await page.close()
  }
}

function generateDailyHtml(ctx: Context, result: DailyResult, config: Config) {
  const width = config.imageWidth
  const [mainText, sourceText] = splitSourceText(result.text)
  const fontFace = generateFontFace(ctx, config)
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
      min-height: 720px;
      padding: 24px;
      color: #146985;
      font-family: ${fontFace ? "'SkyDailyFont', " : ''}-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      background:
        linear-gradient(135deg, rgba(92, 212, 249, 0.34), rgba(164, 231, 255, 0.2)),
        radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.76), transparent 32%),
        linear-gradient(160deg, #e8f9ff 0%, #f2fbff 48%, #fff8ed 100%);
    }

    .daily-card {
      overflow: hidden;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(188, 239, 255, 0.9);
      box-shadow: 0 18px 48px rgba(35, 143, 176, 0.2);
      backdrop-filter: blur(18px);
    }

    .header {
      padding: 24px 28px 18px;
      background: linear-gradient(135deg, rgba(92, 212, 249, 0.28), rgba(255, 255, 255, 0.36));
      border-bottom: 1px solid rgba(92, 212, 249, 0.22);
    }

    .kicker {
      display: inline-flex;
      align-items: center;
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      background: rgba(92, 212, 249, 0.18);
      color: #1487a9;
      font-size: 20px;
      font-weight: 700;
    }

    .title {
      margin-top: 14px;
      color: #1a8fb4;
      font-size: 58px;
      line-height: 1.12;
      font-weight: 800;
      text-shadow: 0 2px 12px rgba(92, 212, 249, 0.24);
    }

    .date {
      margin-top: 10px;
      color: #317f98;
      font-size: 24px;
      font-weight: 600;
    }

    .content {
      padding: 24px 28px 28px;
      display: grid;
      gap: 18px;
    }

    .text-panel {
      padding: 20px;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(92, 212, 249, 0.18);
      box-shadow: 0 8px 24px rgba(35, 143, 176, 0.09);
    }

    .daily-text {
      color: #145d78;
      font-size: 28px;
      line-height: 1.62;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .image-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
    }

    .image-frame {
      overflow: hidden;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.74);
      border: 1px solid rgba(191, 240, 255, 0.9);
      box-shadow: 0 10px 30px rgba(31, 145, 178, 0.14);
    }

    .image-frame img {
      display: block;
      width: 100%;
      height: auto;
    }

    .source {
      padding: 14px 18px;
      border-radius: 12px;
      color: #2f7891;
      background: rgba(92, 212, 249, 0.11);
      font-size: 20px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .empty {
      color: #4f91a6;
      font-size: 24px;
      text-align: center;
      padding: 20px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.55);
    }
  </style>
</head>
<body>
  <main class="daily-card">
    <section class="header">
      <div class="kicker">Sky Daily</div>
      <div class="title">光遇国服每日任务</div>
      <div class="date">${escapeHtml(formatToday())}</div>
    </section>
    <section class="content">
      <div class="text-panel">
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

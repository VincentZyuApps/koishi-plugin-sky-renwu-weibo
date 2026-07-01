import { Schema } from 'koishi'
import { DEFAULT_LXGW_WENKAI_PATH } from './utils'

// ================================
// ⚙️ 插件配置入口：类型、枚举、Schema 都放这里
// ================================

// ====================
// 📦 常量定义
// ====================

/** 💬 每日任务消息发送形式 */
export const MSG_FORM = {
  TEXT_WITH_IMAGE: 'text-with-image',
  IMAGE_WITH_TEXT: 'image-with-text',
  TEXT: 'text',
  FORWARD: 'forward',
  PUPPETEER_IMAGE: 'puppeteer-image',
} as const

export type MsgFormType = typeof MSG_FORM[keyof typeof MSG_FORM]

// ====================
// 📋 配置接口定义
// ====================

export interface Config {
  // ==================
  // 🔑 微博来源配置字段
  // ==================
  commandName: string
  uid: string
  authorName: string
  weiboCookie: string
  matchPattern: string

  // ==================
  // 🌐 请求与缓存配置字段
  // ==================
  cacheMinutes: number
  requestTimeout: number
  userAgent: string

  // ==================
  // 💬 消息发送配置字段
  // ==================
  msgFormArr: string[]

  // ==================
  // 🖼️ Puppeteer 卡片图配置字段
  // ==================
  imageType: 'png' | 'jpeg' | 'webp'
  screenshotQuality: number
  imageWidth: number
  useCustomFont: boolean
  imageFontPath: string
  autoDownloadFont: boolean
}

// ====================
// ⚙️ 配置 Schema 定义
// ====================

export const Config: Schema<Config> = Schema.intersect([
  // ==================
  // 🔑 微博来源配置分组
  // ==================
  Schema.object({
    commandName: Schema.string()
      .default('今日国服')
      .description('📌 触发命令名称。默认发送 <code>今日国服</code> 获取当天国服每日任务。'),
    uid: Schema.string()
      .default('7360748659')
      .description('👤 微博用户 UID。默认是 <code>@今天游离翻车了吗</code> 的 UID。'),
    authorName: Schema.string()
      .default('今天游离翻车了吗')
      .description('🏷️ 来源作者显示名。会展示在数据来源署名里。'),
    weiboCookie: Schema.string()
      .role('secret')
      .role('textarea', { rows: [2, 5] })
      .default('')
      .description('🔐 微博 Cookie。必填，建议使用 <code>scripts/20260630/weibo_cookie.py</code> 登录导出。'),
    matchPattern: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default('^#[^#]*光遇[^#]*超话]#\\s*\\d{1,2}\\.\\d{1,2}\\s*')
      .description('🔎 筛选每日任务微博的正则表达式。微博文案格式变化时可以在这里调整。'),
  }).description('🔑 微博来源配置'),

  // ==================
  // 🌐 请求与缓存配置分组
  // ==================
  Schema.object({
    cacheMinutes: Schema.number()
      .min(0)
      .step(1)
      .default(20)
      .description('🧊 内存缓存分钟数。0 表示不缓存；建议保留缓存，避免同一天多次请求微博。'),
    requestTimeout: Schema.number()
      .min(1000)
      .step(500)
      .default(10000)
      .description('⏱️ 微博请求超时时间，单位毫秒。网络较慢时可以适当调大。'),
    userAgent: Schema.string()
      .role('textarea', { rows: [3, 5] })
      .default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0')
      .description('🕵️ 请求微博使用的 User-Agent。通常保持默认即可。'),
  }).description('🌐 请求与缓存配置'),

  // ==================
  // 💬 消息发送形式配置分组
  // ==================
  Schema.object({
    msgFormArr: Schema.array(
      Schema.union([
        Schema.const(MSG_FORM.TEXT_WITH_IMAGE).description(`【${MSG_FORM.TEXT_WITH_IMAGE}】📄➕🖼️ 先文后图`),
        Schema.const(MSG_FORM.IMAGE_WITH_TEXT).description(`【${MSG_FORM.IMAGE_WITH_TEXT}】🖼️➕📄 先图后文 <i>(适合qq官方bot)</i>`),
        Schema.const(MSG_FORM.TEXT).description(`【${MSG_FORM.TEXT}】📄 纯文字`),
        Schema.const(MSG_FORM.FORWARD).description(`【${MSG_FORM.FORWARD}】📦 图文合并转发 <i>(只适合 OneBot 平台)</i>`),
        Schema.const(MSG_FORM.PUPPETEER_IMAGE).description(`【${MSG_FORM.PUPPETEER_IMAGE}】🖼️ Puppeteer 卡片图 <i>(适合任何平台)</i>`),
      ]),
    )
      .default([MSG_FORM.FORWARD, MSG_FORM.PUPPETEER_IMAGE])
      .role('checkbox')
      .description([
        '📤 选择每日任务的发送形式，可多选',
        '📄➕🖼️ 先文后图：一条消息内先发送微博长文本，再发送全部图片',
        '🖼️➕📄 先图后文：一条消息内先发送全部图片，再发送微博长文本',
        '📄 纯文字：只发送微博长文本、数据来源和原文链接',
        '📦 图文合并转发：把文字和图片打包进 OneBot 合并转发，只适合 OneBot 平台',
        '🖼️ Puppeteer 卡片图：把文字和微博图片排版成圆角卡片图，适合任何平台',
      ].join('<br/>')),
  }).description('💬 消息发送形式配置'),

  // ==================
  // 🖼️ Puppeteer 卡片图配置分组
  // ==================
  Schema.object({
    imageType: Schema.union([
      Schema.const('png').description('🖼️ PNG'),
      Schema.const('jpeg').description('🌄 JPEG'),
      Schema.const('webp').description('🌐 WEBP'),
    ])
      .role('radio')
      .default('png')
      .description('🖼️ Puppeteer 卡片图输出格式。PNG 不支持质量参数。'),
    screenshotQuality: Schema.number()
      .role('slider')
      .min(1)
      .max(100)
      .step(1)
      .default(88)
      .description('🎚️ Puppeteer 卡片图截图质量，仅 JPEG / WEBP 生效。'),
    imageWidth: Schema.number()
      .min(640)
      .max(1600)
      .step(20)
      .default(980)
      .description('📐 Puppeteer 卡片图宽度，单位 px。'),
    useCustomFont: Schema.boolean()
      .default(true)
      .description('🔤 是否使用自定义字体路径。关闭后 Puppeteer 卡片图使用系统默认字体，并跳过默认字体下载。'),
    imageFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(DEFAULT_LXGW_WENKAI_PATH)
      .description('🔤 Puppeteer 卡片图字体路径。默认展示 process.cwd()/data/fonts/LXGWWenKaiMono-Regular.ttf；运行时自动映射到 ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf。留空则使用系统默认字体。'),
    autoDownloadFont: Schema.boolean()
      .default(true)
      .description('📥 插件启动时自动检查并下载 LXGWWenKaiMono-Regular.ttf。字体存在且 hash 校验通过时会跳过下载。'),
  }).description('🖼️ Puppeteer 卡片图配置'),
])

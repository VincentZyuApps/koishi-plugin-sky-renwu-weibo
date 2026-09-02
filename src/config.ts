import { Schema } from 'koishi'
import { DEFAULT_QQ_MARKDOWN_KEYBOARD, stringifyCompact } from './qq/keyboard'
import { DEFAULT_LXGW_WENKAI_PATH } from './utils/fonts'

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
  QQ_MARKDOWN: 'qq-markdown',
} as const

export type MsgFormType = typeof MSG_FORM[keyof typeof MSG_FORM]

/** 🔐 微博访问策略 */
export const WEIBO_ACCESS_MODE = {
  COOKIE_ONLY: 'cookie-only',
  GUEST_ONLY: 'guest-only',
  COOKIE_THEN_GUEST: 'cookie-then-guest',
  GUEST_THEN_COOKIE: 'guest-then-cookie',
} as const

export type WeiboAccessModeType = typeof WEIBO_ACCESS_MODE[keyof typeof WEIBO_ACCESS_MODE]

/** 🤖 QQ Markdown 文案整理模式 */
export const QQ_MARKDOWN_MODE = {
  STRUCTURED: 'structured',
  BLOCKQUOTE: 'blockquote',
} as const

export type QQMarkdownModeType = typeof QQ_MARKDOWN_MODE[keyof typeof QQ_MARKDOWN_MODE]

/** 🔘 QQ Markdown 按钮发送行为 */
export const QQ_MARKDOWN_BUTTON_MODE = {
  STANDALONE: 'standalone',
  APPEND_QQ_MARKDOWN: 'append-qq-markdown',
  APPEND_PUPPETEER_IMAGE: 'append-puppeteer-image',
} as const

export type QQMarkdownButtonModeType = typeof QQ_MARKDOWN_BUTTON_MODE[keyof typeof QQ_MARKDOWN_BUTTON_MODE]

/** 🗂️ append-puppeteer-image 的图片 URL 生成模式 */
export const QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE = {
  ASSETS: 'assets',
  SERVER: 'server',
} as const

export type QQMarkdownPuppeteerImageStorageModeType =
  typeof QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE[keyof typeof QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE]

export interface MsgFormEntry {
  mode: MsgFormType
  enabled: boolean
}

export interface ActivePushTarget {
  note: string
  platform: string
  selfId: string
  channelId: string
  enabled: boolean
}

// ====================
// 📋 配置接口定义
// ====================

export interface Config {
  // ==================
  // 📌 指令配置字段
  // ==================
  commandName: string

  // ==================
  // 🔑 微博请求配置字段
  // ==================
  uid: string
  authorName: string
  weiboAccessMode: WeiboAccessModeType
  weiboCookie: string
  matchPattern: string
  cacheMinutes: number
  requestTimeout: number
  userAgent: string

  // ==================
  // 💬 消息发送配置字段
  // ==================
  enableQuote: boolean
  enableWaitingHint: boolean
  msgFormArr: Array<MsgFormType | MsgFormEntry>
  strictOrderMode: boolean

  // ==================
  // 📣 主动消息推送配置字段
  // ==================
  enableActivePush: boolean
  activePushCron: string
  activePushTimezoneGmtOffset: number
  activePushUseCache: boolean
  activePushTargets: ActivePushTarget[]
  enableActivePushTestCommand: boolean
  enableConsoleWebuiTestArea: boolean

  // ==================
  // 🤖 QQ 官方 Bot Markdown 配置字段
  // ==================
  qqMarkdownPuppeteerImageStorageMode: QQMarkdownPuppeteerImageStorageModeType
  qqMarkdownPuppeteerImageSelfUrl: string
  qqMarkdownPuppeteerImageMaxFiles: number
  qqMarkdownMode: QQMarkdownModeType
  qqMarkdownButtonMode: QQMarkdownButtonModeType[]
  qqMarkdownKeyboardJson: string

  // ==================
  // 🖼️ Puppeteer 卡片图配置字段
  // ==================
  imageType: 'png' | 'jpeg' | 'webp'
  screenshotQuality: number
  imageWidth: number
  useCustomFont: boolean
  autoDownloadFont: boolean
  imageFontPath: string

  // ==================
  // 🐛 调试配置字段
  // ==================
  verboseSessionLog: boolean
  verboseConsoleLog: boolean
}

// ====================
// ⚙️ 配置 Schema 定义
// ====================

export const Config: Schema<Config> = Schema.intersect([
  // ==================
  // 📌 指令配置分组
  // ==================
  Schema.object({
    commandName: Schema.string()
      .default('今日光遇国服任务')
      .description('📌 触发命令名称。默认发送 <code>今日光遇国服任务</code> 获取当天国服每日任务。'),
  }).description('📌 指令配置'),

  // ==================
  // 🔑 微博请求配置分组
  // ==================
  Schema.object({
    uid: Schema.string()
      .default('7360748659')
      .description('👤 微博用户 UID。默认是 <code>@今天游离翻车了吗</code> 的 UID。'),
    authorName: Schema.string()
      .default('今天游离翻车了吗')
      .description('🏷️ 来源作者显示名。会展示在数据来源署名里。'),
    weiboAccessMode: Schema.union([
      Schema.const(WEIBO_ACCESS_MODE.COOKIE_ONLY).description('【🍪A】只使用 PC 微博网页登录态：Python/CDP 导出的 weibo.com Cookie'),
      Schema.const(WEIBO_ACCESS_MODE.GUEST_ONLY).description('【👤B】只使用无登录用户态：不使用 weiboCookie，优先走移动端公开接口和游客态'),
      Schema.const(WEIBO_ACCESS_MODE.COOKIE_THEN_GUEST).description('【🍪👤C】先 PC 微博网页登录态，失败后转无登录用户态'),
      Schema.const(WEIBO_ACCESS_MODE.GUEST_THEN_COOKIE).description('【👤🍪D】先无登录用户态，失败后转 PC 微博网页登录态'),
    ])
      .role('radio')
      .default(WEIBO_ACCESS_MODE.GUEST_THEN_COOKIE)
      .description('🔐 微博访问策略。默认 D：先尝试无登录用户态，必要时再使用 weiboCookie。命令选项 <code>--weibo &lt;mode&gt;</code> 可临时覆盖此配置，优先级高于配置项。'),
    weiboCookie: Schema.string()
      .role('secret')
      .role('textarea', { rows: [2, 5] })
      .default('')
      .description('🔐 微博 Cookie。访问策略包含 Cookie 登录态时使用，建议通过 <code>scripts/20260630/weibo_cookie.py</code> 登录导出。'),
    matchPattern: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default('(?:^#[^#]*光遇[^#]*超话]#\\s*\\d{1,2}\\.\\d{1,2}\\s*|^\\s*(?:sky)?光遇\\s*\\d{1,2}\\.\\d{1,2}\\s*(?:每日)?任务)')
      .description('🔎 筛选每日任务微博的正则表达式。微博文案格式变化时可以在这里调整；插件也会自动识别 07.05每日任务 这类日期文案作为兜底。'),
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
  }).description('🔑 微博请求配置'),

  // ==================
  // 💬 消息发送形式配置分组
  // ==================
  Schema.object({
    enableQuote: Schema.boolean()
      .default(true)
      .description('💬 bot 发送消息时，是否引用触发指令的消息。合并转发模式不会附带引用。'),
    enableWaitingHint: Schema.boolean()
      .default(true)
      .description('⏳ 是否启用「获取并生成中.... 请耐心等待」提示消息。每日任务消息全部发送完成后会尝试撤回。'),
    msgFormArr: Schema.array(Schema.object({
      mode: Schema.union([
        Schema.const(MSG_FORM.TEXT_WITH_IMAGE).description(`【📝 ${MSG_FORM.TEXT_WITH_IMAGE}】先文后图 (一条消息内先发送微博长文本，再发送全部图片)`),
        Schema.const(MSG_FORM.IMAGE_WITH_TEXT).description(`【🖼️ ${MSG_FORM.IMAGE_WITH_TEXT}】先图后文 (一条消息内先发送全部图片，再发送微博长文本)`),
        Schema.const(MSG_FORM.TEXT).description(`【🔤 ${MSG_FORM.TEXT}】纯文字 (只发送微博长文本、数据来源和原文链接)`),
        Schema.const(MSG_FORM.FORWARD).description(`【📦 ${MSG_FORM.FORWARD}】图文合并转发 (把文字和图片打包进 OneBot 合并转发)`),
        Schema.const(MSG_FORM.PUPPETEER_IMAGE).description(`【🎨 ${MSG_FORM.PUPPETEER_IMAGE}】Puppeteer 卡片图 (把文字和微博图片排版成圆角卡片图)`),
        Schema.const(MSG_FORM.QQ_MARKDOWN).description(`【🤖 ${MSG_FORM.QQ_MARKDOWN}】QQ Markdown (只有 QQ 官方 Bot 平台能用)`),
      ])
        .role('radio')
        .description('发送形式'),
      enabled: Schema.boolean()
        .default(true)
        .description('是否启用'),
    }))
      .role('table')
      .default([
        { mode: MSG_FORM.TEXT_WITH_IMAGE, enabled: false },
        { mode: MSG_FORM.IMAGE_WITH_TEXT, enabled: false },
        { mode: MSG_FORM.TEXT, enabled: false },
        { mode: MSG_FORM.FORWARD, enabled: true },
        { mode: MSG_FORM.PUPPETEER_IMAGE, enabled: true },
        { mode: MSG_FORM.QQ_MARKDOWN, enabled: true },
      ])
      .description([
        '每日任务发送形式表格，可调整顺序，可启用 / 禁用',
        `【📝 ${MSG_FORM.TEXT_WITH_IMAGE}】先文后图 (一条消息内先发送微博长文本，再发送全部图片)`,
        `【🖼️ ${MSG_FORM.IMAGE_WITH_TEXT}】先图后文 (一条消息内先发送全部图片，再发送微博长文本)`,
        `【🔤 ${MSG_FORM.TEXT}】纯文字 (只发送微博长文本、数据来源和原文链接)`,
        `【📦 ${MSG_FORM.FORWARD}】图文合并转发 (把文字和图片打包进 OneBot 合并转发，只适合 OneBot 平台)`,
        `【🎨 ${MSG_FORM.PUPPETEER_IMAGE}】Puppeteer 卡片图 (把文字和微博图片排版成圆角卡片图，适合任何平台)`,
        `【🤖 ${MSG_FORM.QQ_MARKDOWN}】QQ Markdown (发送 QQ 官方 Bot Markdown 正文消息，只有 QQ 官方 Bot 平台能用)`,
        '⚠️ 如果启用了多个相同发送形式，只有第一个会生效',
      ].join('<br/>')),
    strictOrderMode: Schema.boolean()
      .experimental()
      .default(true)
      .description([
        '是否严格按照上表顺序串行发送',
        '✅ 开启：按表格顺序逐个发送，顺序稳定，Puppeteer 渲染不会和其他发送形式抢资源',
        '❌ 关闭：多个发送形式并行发送，速度可能更快，但发送顺序不保证',
      ].join('<br/>')),
  }).description('💬 消息发送形式配置'),

  // ==================
  // 📣 主动消息推送配置分组
  // ==================
  Schema.object({
    enableActivePush: Schema.boolean()
      .default(false)
      .description('📣 是否启用 Cron 定时主动推送。关闭时不会注册定时任务；Console 手动测试不受此开关影响。'),
    activePushCron: Schema.string()
      .default('0 1,7,13,19 * * *')
      .description('⏰ 主动消息推送 Cron 表达式（5 段）。默认每天 01:00、07:00、13:00、19:00 触发。示例：<code>0 8 * * *</code> 表示每天 08:00；<code>*/30 * * * *</code> 表示每 30 分钟。'),
    activePushTimezoneGmtOffset: Schema.number()
      .min(-12)
      .max(14)
      .step(1)
      .default(8)
      .description('🌍 Cron 时区的 GMT 偏移，默认 <code>8</code> 表示 GMT+8。仅支持整数偏移，不处理夏令时。'),
    activePushUseCache: Schema.boolean()
      .default(false)
      .description('🧊 主动推送是否使用现有微博缓存。默认关闭：每次 Cron 或 Console 测试都会重新请求微博；开启后才遵循 cacheMinutes。'),
    activePushTargets: Schema.array(Schema.object({
      note: Schema.string()
        .default('')
        .description('📝 备注'),
      platform: Schema.string()
        .default('qq')
        .description('🎯 platform'),
      selfId: Schema.string()
        .default('')
        .description('🤖 Bot ID'),
      channelId: Schema.string()
        .default('')
        .description('📡 Channel ID'),
      enabled: Schema.boolean()
        .default(true)
        .description('✅ 是否启用'),
    }))
      .role('table')
      .default([{
        note: 'dev',
        platform: 'onebot',
        selfId: '3967912008',
        channelId: '958366323',
        enabled: true,
      }, {
        note: 'QQ 官方 Bot',
        platform: 'qq',
        selfId: '5685784309055952273',
        channelId: 'B81B087C21A62EA2F1E2D966E5533B82',
        enabled: true,
      }, {
        note: 'Discord',
        platform: 'discord',
        selfId: '1376778677991374909',
        channelId: '1347176007542509599',
        enabled: true,
      }, {
        note: 'Telegram',
        platform: 'telegram',
        selfId: '8762163282',
        channelId: '-1003966795552',
        enabled: true,
      }, {
        note: 'Lark',
        platform: 'lark',
        selfId: 'ou_e611dda7979f5d5a9c8e2ffdb87ca41c',
        channelId: 'oc_de7161c3b2f87e5708ccfabad4f314ea',
        enabled: true,
      }])
      .description([
        '🎯 主动推送目标列表。每个启用目标会独立发送；单个目标失败不会阻塞其他目标。',
        '<i><code>📝 备注</code>：仅用于 Console 和日志显示；留空时自动使用 platform / channelId。</i>',
        '<i><code>🎯 platform</code>：例如 qq、onebot、qqguild、discord。</i>',
        '<i><code>🤖 Bot ID</code>：填写后精确匹配；留空时向该平台所有已连接 Bot 发送。</i>',
        '<i><code>📡 Channel ID</code>：qq 官方群填写群 openid；onebot 普通群填写真实 QQ 群号。</i>',
        '<i><code>✅ 是否启用</code>：关闭后跳过此目标。</i>',
      ].join('<br/>')),
    enableActivePushTestCommand: Schema.boolean()
      .default(false)
      .description('🧪 是否注册 <code>${commandName}.主动推送测试</code> 管理员测试指令。默认关闭；仅 authority 3 可执行，使用已保存的主动推送目标，不依赖 Cron 总开关。'),
    enableConsoleWebuiTestArea: Schema.boolean()
      .default(true)
      .description('🧪 是否在 Koishi Console 的插件详情顶部注册主动推送测试区域。默认开启；仅管理员可二次确认并立即测试当前生效配置。'),
  }).description('📣 主动消息推送'),

  // ==================
  // 🤖 QQ 官方 Bot Markdown 适配配置分组
  // ==================
  Schema.object({
    qqMarkdownPuppeteerImageStorageMode: Schema.union([
      Schema.const(QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE.ASSETS).description('【🌐 assets】使用 Koishi assets 服务发送 Markdown 内嵌图片'),
      Schema.const(QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE.SERVER).description('【🗂️ server】使用 Koishi server 服务发送 Markdown 内嵌图片'),
    ])
      .role('radio')
      .default(QQ_MARKDOWN_PUPPETEER_IMAGE_STORAGE_MODE.SERVER)
      .description([
        '🗂️ append-puppeteer-image 的图片 URL 生成模式。仅在按钮行为勾选 append-puppeteer-image，且消息发送形式启用 puppeteer-image 时生效。standalone 与 append-qq-markdown 不使用此配置，也不依赖 assets 或 server。',
        '【🌐 assets】生成公网图片 URL。只能新增，不能删除，文件名由 assets 服务决定，通常无法自定义。',
        '【🗂️ server】从 ctx.baseDir/cache/sky-renwu-weibo 暴露临时图片。支持 yyyyMMdd-HHmmss 命名，并按数量上限仅保留最新图片。',
      ].join('<br>')),
    qqMarkdownPuppeteerImageSelfUrl: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default('')
      .description([
        '🌐 server 模式的公网 URL 覆盖值。',
        '示例：<code>http://your-public-ip:your-port</code>。',
        '仅在按钮行为勾选 append-puppeteer-image，且图片 URL 生成模式为 server 时生效。',
        '留空则回退 ctx.server.config.selfUrl。',
        'standalone 与 append-qq-markdown 不使用此配置。',
      ].join('<br/>')),
    qqMarkdownPuppeteerImageMaxFiles: Schema.number()
      .step(1)
      .default(5)
      .description([
        '🗃️ server 模式缓存图片数量上限。',
        '仅在按钮行为勾选 append-puppeteer-image，且图片 URL 生成模式为 server 时生效。',
        '缓存目录固定为 ctx.baseDir/cache/sky-renwu-weibo；仅保留最新 N 张，填写 <= 0 表示不设置上限。',
        'standalone 与 append-qq-markdown 不使用此配置。',
      ].join('<br/>')),
    qqMarkdownMode: Schema.union([
      Schema.const(QQ_MARKDOWN_MODE.STRUCTURED).description(`【🧩 ${QQ_MARKDOWN_MODE.STRUCTURED}】按正则整理段落 (尝试识别标题、任务条目和来源信息，排版更清晰)`),
      Schema.const(QQ_MARKDOWN_MODE.BLOCKQUOTE).description(`【💬 ${QQ_MARKDOWN_MODE.BLOCKQUOTE}】全文引用块 (把所有原文逐行放进 > 引用块)`),
    ])
      .role('radio')
      .default(QQ_MARKDOWN_MODE.STRUCTURED)
      .description([
        'QQ Markdown 文案整理模式',
        `【🧩 ${QQ_MARKDOWN_MODE.STRUCTURED}】按正则整理段落 (尝试识别标题、任务条目和来源信息，排版更清晰)`,
        `【💬 ${QQ_MARKDOWN_MODE.BLOCKQUOTE}】全文引用块 (简单粗暴地把所有原文逐行放进 > 引用块)`,
      ].join('<br/>')),
    qqMarkdownButtonMode: Schema.array(Schema.union([
      Schema.const(QQ_MARKDOWN_BUTTON_MODE.STANDALONE).description(`【🧷 ${QQ_MARKDOWN_BUTTON_MODE.STANDALONE}】单独发送 JSON 按钮消息`),
      Schema.const(QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN).description(`【📎 ${QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN}】挂在 QQ Markdown 后面`),
      Schema.const(QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE).description(`【🖼️ ${QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE}】挂在 Puppeteer 卡片图后面`),
    ]))
      .role('checkbox')
      .default([QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN, QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE])
      .description([
        'QQ Markdown 按钮发送行为，可多选。只对 QQ 官方 Bot 群聊生效，不影响 QQ 私信和其他平台的任何行为。',
        `【🧷 ${QQ_MARKDOWN_BUTTON_MODE.STANDALONE}】单独发送 JSON 按钮消息`,
        `【📎 ${QQ_MARKDOWN_BUTTON_MODE.APPEND_QQ_MARKDOWN}】挂在 QQ Markdown 后面`,
        `【🖼️ ${QQ_MARKDOWN_BUTTON_MODE.APPEND_PUPPETEER_IMAGE}】挂在 Puppeteer 卡片图后面`,
        '⚠️ append-puppeteer-image 才会使用上方的 assets/server 配置；standalone 与 append-qq-markdown 不使用它们。',
        '不想发送 QQ 按钮时保持空选即可。条件不满足时只提醒，不自动补发。',
      ].join('<br/>')),
    qqMarkdownKeyboardJson: Schema.string()
      .role('textarea', { rows: [5, 10] })
      .default(stringifyCompact(DEFAULT_QQ_MARKDOWN_KEYBOARD))
      .description('📋 QQ Markdown 按钮 JSON 配置。只在 qqMarkdownButtonMode 生效时使用；qqMarkdownButtonMode 只对 QQ 官方 Bot 群聊生效，不影响 QQ 私信和其他平台的任何行为。支持变量 <code>${commandName}</code>；JSON 解析失败时会自动退回默认按钮。'),
  }).description('🤖 QQ 官方 Bot Markdown 适配'),

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
    autoDownloadFont: Schema.boolean()
      .default(true)
      .description('📥 插件启动时自动检查并下载 LXGWWenKaiMono-Regular.ttf。字体存在且 hash 校验通过时会跳过下载。'),
    imageFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(DEFAULT_LXGW_WENKAI_PATH)
      .description('🔤 Puppeteer 卡片图字体路径。默认展示 process.cwd()/data/fonts/LXGWWenKaiMono-Regular.ttf；运行时自动映射到 ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf。留空则使用系统默认字体。'),
  }).description('🖼️ Puppeteer 卡片图配置'),

  // ==================
  // 🐛 调试配置分组
  // ==================
  Schema.object({
    verboseSessionLog: Schema.boolean()
      .default(false)
      .description('💬 是否在会话中输出详细调试信息。关闭时 QQ Markdown 按钮跳过提醒默认不会发送到会话；开启后才会同步发送到会话。'),
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🧾 是否在控制台输出详细调试信息。关闭时非 QQ 平台的 QQ Markdown 按钮跳过提醒不会输出到控制台；开启后会输出缓存、微博访问策略、游客态 Cookie 初始化、微博接口状态码、列表数量、匹配样本、渲染、发送、assets/server 图片 URL 生成和字体检查细节。'),
  }).description('🐛 调试配置'),
])

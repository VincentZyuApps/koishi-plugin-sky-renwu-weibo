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

/** 🖼️ 微博图片不完整时的发送行为 */
export const INCOMPLETE_IMAGE_BEHAVIOR = {
  SEND_AVAILABLE: 'send-available',
  TEXT_ONLY: 'text-only',
  SKIP: 'skip',
} as const

export type IncompleteImageBehaviorType =
  typeof INCOMPLETE_IMAGE_BEHAVIOR[keyof typeof INCOMPLETE_IMAGE_BEHAVIOR]

/** 🌐 图片下载重试时的 CDN 域名轮换策略 */
export const IMAGE_CDN_ROTATE_STRATEGY = {
  OFF: 'off',
  ON_FINAL_RETRY: 'on-final-retry',
  EACH_RETRY: 'each-retry',
  PARALLEL_RACE: 'parallel-race',
} as const

export type ImageCdnRotateStrategyType =
  typeof IMAGE_CDN_ROTATE_STRATEGY[keyof typeof IMAGE_CDN_ROTATE_STRATEGY]

/** 📐 图片下载重试时的尺寸降级策略 */
export const IMAGE_SIZE_DEGRADE_STRATEGY = {
  ALWAYS_LARGEST: 'always-largest',
  DEGRADE_FINAL_RETRY: 'degrade-final-retry',
  DEGRADE_EACH_RETRY: 'degrade-each-retry',
  START_MID: 'start-mid',
} as const

export type ImageSizeDegradeStrategyType =
  typeof IMAGE_SIZE_DEGRADE_STRATEGY[keyof typeof IMAGE_SIZE_DEGRADE_STRATEGY]

/** 🎯 今日任务微博的匹配严格度 */
export const DAILY_TASK_MATCH_STRICTNESS = {
  STRICT: 'strict',
  STANDARD: 'standard',
  LENIENT: 'lenient',
  LOOSE: 'loose',
} as const

export type DailyTaskMatchStrictnessType =
  typeof DAILY_TASK_MATCH_STRICTNESS[keyof typeof DAILY_TASK_MATCH_STRICTNESS]

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

/** 📱 特定平台 Puppeteer 卡片图发送模式 */
export const PLATFORM_PUPPETEER_IMAGE_MODE = {
  LONG: 'long',
  SLICE: 'slice',
  FILE: 'file',
} as const

export type PlatformPuppeteerImageModeType =
  typeof PLATFORM_PUPPETEER_IMAGE_MODE[keyof typeof PLATFORM_PUPPETEER_IMAGE_MODE]

export interface PlatformPuppeteerImageRule {
  platform: string
  mode: PlatformPuppeteerImageModeType
  sliceHeight: number
  overlapHeight: number
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
  commandAliases: string[]

  // ==================
  // 🔑 微博请求配置字段
  // ==================
  uid: string
  authorName: string
  weiboAccessMode: WeiboAccessModeType
  weiboCookie: string
  matchPattern: string
  dailyTaskMatchStrictness: DailyTaskMatchStrictnessType
  cacheMinutes: number
  discardCacheAcrossBeijingMidnight: boolean
  cacheMidnightOffsetMinutes: number
  requestTimeout: number
  userAgent: string

  // ==================
  // 🖼️ 微博图片下载配置字段
  // ==================
  imageDownloadConcurrency: number
  imageDownloadTimeout: number
  imageDownloadRetryCount: number
  imageDownloadRetryDelay: number
  imageDownloadMaxWait: number
  imageCdnRotateStrategy: ImageCdnRotateStrategyType
  imageSizeDegradeStrategy: ImageSizeDegradeStrategyType
  incompleteImageBehavior: IncompleteImageBehaviorType

  // ==================
  // 💬 消息发送配置字段
  // ==================
  enableQuote: boolean
  enableWaitingHint: boolean
  dailyTaskGeneralIntroHint: string
  dailyTaskPassiveIntroHint: string
  dailyTaskActiveIntroHint: string
  msgFormArr: Array<MsgFormType | MsgFormEntry>
  restrictForwardPlatforms: boolean
  forwardSupportedPlatforms: string[]
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
  platformPuppeteerImageRules: PlatformPuppeteerImageRule[]

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
    commandAliases: Schema.array(Schema.string())
      .role('table')
      .default([
        '今日光遇国服任务',
        '今日国服任务',
        '今日光遇',
        'today-sky-cn-request',
        'today-cn-request',
        'today-sky',
      ])
      .description('🏷️ 指令别名列表。每行一个别名；空白项会跳过，清空列表则不注册额外别名。'),
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
    dailyTaskMatchStrictness: Schema.union([
      Schema.const(DAILY_TASK_MATCH_STRICTNESS.STRICT).description('【🔒 strict / 严格】必须命中上面的正则 <b>且</b> 正文日期或发布时间是今天。防一切误判，但博主一旦改标题格式就可能漏掉当天任务。'),
      Schema.const(DAILY_TASK_MATCH_STRICTNESS.STANDARD).description('【⚖️ standard / 标准】命中正则，<b>或</b> 正文日期是今天。接近插件最初的判定逻辑，均衡取舍。'),
      Schema.const(DAILY_TASK_MATCH_STRICTNESS.LENIENT).description('【🍃 lenient / 宽松】正文能抠出日期就只看日期是否为今天；抠不到日期时才退回「命中正则且发布时间是今天」。防漏优先，博主改格式也能扛住。'),
      Schema.const(DAILY_TASK_MATCH_STRICTNESS.LOOSE).description('【🌊 loose / 最宽松】命中正则、正文日期是今天、发布时间是今天，三者任一满足即认。几乎不漏，但误判概率最高。'),
    ])
      .role('radio')
      .default(DAILY_TASK_MATCH_STRICTNESS.LENIENT)
      .description('🎯 今日任务微博的匹配严格度。用于在「宁可漏也不误判」与「宁可误判也不漏」之间权衡。默认 lenient：漏掉当天任务比偶尔误判更影响群友体验，且误判要求闲聊里恰好出现「今天日期+任务」字样，概率极低。'),
    cacheMinutes: Schema.number()
      .min(0)
      .step(1)
      .default(600)
      .description('🧊 内存缓存分钟数。0 表示不缓存；默认 600（10 小时）。因为光遇每日任务同一天内不变，缓存可以放长，避免同一天多次请求微博。'),
    discardCacheAcrossBeijingMidnight: Schema.boolean()
      .default(true)
      .description('🌙 是否在跨越北京时间「每日刷新分界点」后强制丢弃缓存。默认开启：即使缓存分钟数还没到，只要当前时间和缓存写入时间不在同一个「光遇日」，也会重新请求微博，确保新的一天拿到最新任务。'),
    cacheMidnightOffsetMinutes: Schema.number()
      .min(0)
      .max(720)
      .step(1)
      .default(67)
      .description('⏰ 「每日刷新分界点」相对北京时间 0 点的偏移分钟数。默认 67，即凌晨 1:07 才算进入新的一天。因为博主发布当天任务微博通常会晚于 0 点，留出偏移可以避开 0:00 到发博之间的空窗期。仅在上面的开关开启时生效。'),
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
  // 🖼️ 微博图片下载配置分组
  // ==================
  Schema.object({
    imageDownloadConcurrency: Schema.number()
      .min(1)
      .max(10)
      .step(1)
      .default(2)
      .description('🧵 图片下载并发数。默认 2，降低同时请求微博图片时的网络拥塞和失败概率。'),
    imageDownloadTimeout: Schema.number()
      .min(1000)
      .step(500)
      .default(20000)
      .description('⏱️ 单张图片下载超时时间，单位毫秒。'),
    imageDownloadRetryCount: Schema.number()
      .min(0)
      .max(10)
      .step(1)
      .default(2)
      .description('🔁 单张图片失败后的额外重试次数。默认 2，即每张图片最多尝试 3 次。'),
    imageDownloadRetryDelay: Schema.number()
      .min(0)
      .step(100)
      .default(1000)
      .description('⏳ 图片下载重试的初始等待时间，单位毫秒。后续重试按指数退避增加。'),
    imageDownloadMaxWait: Schema.number()
      .min(1000)
      .step(1000)
      .default(120000)
      .description('⌛ 整个微博图片下载阶段的最长等待时间，单位毫秒。到时后未成功的图片会记录为失败并继续后续发送流程。'),
    imageCdnRotateStrategy: Schema.union([
      Schema.const(IMAGE_CDN_ROTATE_STRATEGY.OFF).description('【🔒 off / 关闭】始终使用原始图片链接，重试时也不更换 CDN 域名。'),
      Schema.const(IMAGE_CDN_ROTATE_STRATEGY.ON_FINAL_RETRY).description('【🐢 on-final-retry / 保守】仅在最后一次重试时更换一个 CDN 域名，撞运气式兜底。'),
      Schema.const(IMAGE_CDN_ROTATE_STRATEGY.EACH_RETRY).description('【⚖️ each-retry / 均衡】每次重试都轮换到下一个 CDN 域名（wx2→wx3→wx4→wx1），专治个别节点抽风超时。换域名不损画质。'),
      Schema.const(IMAGE_CDN_ROTATE_STRATEGY.PARALLEL_RACE).description('【🚀 parallel-race / 激进】首次就同时向多个 CDN 域名发起请求，谁先返回用谁。⚠️ 请求量成倍增加，可能触发微博限流或反爬拦截，谨慎开启。'),
    ])
      .role('radio')
      .default(IMAGE_CDN_ROTATE_STRATEGY.EACH_RETRY)
      .description('🌐 图片下载重试时的 CDN 域名轮换策略。微博图床同一张图在 wx1~wx4 等多个镜像域名下都可访问，某个节点卡住时换个节点常能秒回。此策略与下面的尺寸降级策略各自独立推进，互不干扰。'),
    imageSizeDegradeStrategy: Schema.union([
      Schema.const(IMAGE_SIZE_DEGRADE_STRATEGY.ALWAYS_LARGEST).description('【💎 always-largest / 最高清】永远只用最大尺寸，超时也不降级；拿不到就缺那张图。画质优先。'),
      Schema.const(IMAGE_SIZE_DEGRADE_STRATEGY.DEGRADE_FINAL_RETRY).description('【🐢 degrade-final-retry / 保守】仅在最后一次重试时降一档尺寸保底，前面几次都保持最高清。默认值，兼顾画质与成功率。'),
      Schema.const(IMAGE_SIZE_DEGRADE_STRATEGY.DEGRADE_EACH_RETRY).description('【⚖️ degrade-each-retry / 均衡】每次重试都降一档尺寸（largest→mw2000→mw1024→mw690），更快拿到图，但画质下降也快。'),
      Schema.const(IMAGE_SIZE_DEGRADE_STRATEGY.START_MID).description('【🚀 start-mid / 激进】首次就直接从中等尺寸（mw2000）起步，几乎不缺图。⚠️ 默认牺牲画质换成功率。'),
    ])
      .role('radio')
      .default(IMAGE_SIZE_DEGRADE_STRATEGY.DEGRADE_FINAL_RETRY)
      .description('📐 图片下载重试时的尺寸降级策略。尺寸降级会损失画质，通常作为拿不到高清图时的兜底手段。想看大图可直接点开微博原文链接。此策略与上面的 CDN 轮换策略各自独立推进。'),
    incompleteImageBehavior: Schema.union([
      Schema.const(INCOMPLETE_IMAGE_BEHAVIOR.SEND_AVAILABLE).description('【🖼️ send-available】发送已经成功下载的图片，并明确标注图片数量。'),
      Schema.const(INCOMPLETE_IMAGE_BEHAVIOR.TEXT_ONLY).description('【🔤 text-only】忽略发送形式表，仅发送一条包含任务文字的回执。'),
      Schema.const(INCOMPLETE_IMAGE_BEHAVIOR.SKIP).description('【⏭️ skip】不发送任务内容，只发送图片下载未完成的状态说明。'),
    ])
      .role('radio')
      .default(INCOMPLETE_IMAGE_BEHAVIOR.SEND_AVAILABLE)
      .description('⚠️ 微博存在图片但未全部下载成功时的发送策略。所有发送形式都会使用同一批成功下载的图片。'),
  }).description('🖼️ 微博图片下载配置'),

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
    dailyTaskGeneralIntroHint: Schema.string()
      .role('textarea', { rows: [2, 3] })
      .default('📅给主人送上今日光遇国服任务喵✨\n💡 tip: 如果看到的不是今天的每日任务，可能是博主还没更新，可以稍等片刻后再试。⏳')
      .description('💌 通用文字提示。每种已启用发送形式都会先展示此内容；留空时跳过。'),
    dailyTaskPassiveIntroHint: Schema.string()
      .role('textarea', { rows: [2, 3] })
      .default('🔎我去，主人的自律这么厉害，居然还记得把我 每日任务 探测出来咯(✨')
      .description('💬 被动指令触发查询文字提示。普通用户执行查询指令时，在通用文字提示后展示；留空时跳过。'),
    dailyTaskActiveIntroHint: Schema.string()
      .role('textarea', { rows: [2, 3] })
      .default('📣按照主人定时计划按时给主人送上今日的 每日任务 喵⏰')
      .description('📣 主动推送文字提示。Cron、Console 立即推送和管理员测试指令都会在通用文字提示后展示；留空时跳过。'),
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
        '📋 每日任务发送形式表格，可调整顺序，可启用 / 禁用；<b>被动指令触发</b>与<b>主动 Cron 推送</b>都会按此表执行。',
        `<code>【📝 ${MSG_FORM.TEXT_WITH_IMAGE}】</code>先文后图 (一条消息内先发送微博长文本，再发送全部图片)`,
        `<code>【🖼️ ${MSG_FORM.IMAGE_WITH_TEXT}】</code>先图后文 (一条消息内先发送全部图片，再发送微博长文本)`,
        `<code>【🔤 ${MSG_FORM.TEXT}】</code>纯文字 (只发送微博长文本、数据来源和原文链接)`,
        `<code>【📦 ${MSG_FORM.FORWARD}】</code>图文合并转发 (把文字和图片打包进合并转发；是否限制平台由下方配置决定)`,
        `<code>【🎨 ${MSG_FORM.PUPPETEER_IMAGE}】</code>Puppeteer 卡片图 (把文字和微博图片排版成圆角卡片图，适合任何平台)`,
        `<code>【🤖 ${MSG_FORM.QQ_MARKDOWN}】</code>QQ Markdown (发送 QQ 官方 Bot Markdown 正文消息，只有 QQ 官方 Bot 平台能用)`,
        '🔁 相同发送形式可以重复添加；每个已启用条目都会按表格顺序独立发送一次。',
      ].join('<br/>')),
    restrictForwardPlatforms: Schema.boolean()
      .default(true)
      .description('📦 是否按下方平台列表限制 forward 图文合并转发。开启时只有列表内平台会发送；关闭时所有平台都会尝试发送。'),
    forwardSupportedPlatforms: Schema.array(Schema.string())
      .role('table')
      .default(['onebot', 'red', 'discord'])
      .description('📦 forward 图文合并转发允许的平台列表。仅在开启平台限制时生效；每行一个 Koishi platform 标识，清空列表表示不向任何平台发送 forward。'),
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
      .description([
        '⏰ 主动消息推送 Cron 表达式（5 段）。默认每天 01:00、07:00、13:00、19:00 触发。',
        '示例：`0 8 * * *` 表示每天 08:00。',
        '示例：`*/30 * * * *` 表示每 30 分钟。',
      ].join('<br>')),
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
    platformPuppeteerImageRules: Schema.array(Schema.object({
      platform: Schema.string()
        .default('telegram')
        .description('平台标识 (如 telegram、discord)'),
      mode: Schema.union([
        Schema.const(PLATFORM_PUPPETEER_IMAGE_MODE.LONG).description(`【🖼️ ${PLATFORM_PUPPETEER_IMAGE_MODE.LONG}】长图片 (强制完整长图直发)`),
        Schema.const(PLATFORM_PUPPETEER_IMAGE_MODE.SLICE).description(`【✂️ ${PLATFORM_PUPPETEER_IMAGE_MODE.SLICE}】图片切片 (按高度切分成多张图片)`),
        Schema.const(PLATFORM_PUPPETEER_IMAGE_MODE.FILE).description(`【📁 ${PLATFORM_PUPPETEER_IMAGE_MODE.FILE}】文件图片 (以文件形式发送长图)`),
      ])
        .role('radio')
        .default(PLATFORM_PUPPETEER_IMAGE_MODE.SLICE)
        .description('发送模式'),
      sliceHeight: Schema.number()
        .min(1000)
        .max(10000)
        .step(500)
        .default(5000)
        .description('切片高度 (px)'),
      overlapHeight: Schema.number()
        .default(25)
        .disabled()
        .description('切片重叠高度 (px，固定 25px 防止切分文字)'),
      enabled: Schema.boolean()
        .default(true)
        .description('是否启用'),
    }))
      .role('table')
      .default([
        {
          platform: 'telegram',
          mode: PLATFORM_PUPPETEER_IMAGE_MODE.SLICE,
          sliceHeight: 5000,
          overlapHeight: 25,
          enabled: true,
        },
      ])
      .description([
        '📱 <b>特定平台 Puppeteer 卡片图发送规则表格</b>',
        '针对 Telegram 等限制长图尺寸（宽+高 > 10000px 会报 <code>PHOTO_INVALID_DIMENSIONS</code>）的平台单独制定策略。',
        '未在表格中配置的平台默认发送完整长图。',
      ].join('<br/>')),
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

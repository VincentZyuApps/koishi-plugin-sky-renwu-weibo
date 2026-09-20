const pkg = require('../package.json')

const detailsStyle = 'margin:10px 0;border:1px solid var(--k-color-border, #909399);border-radius:8px;background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit);overflow:hidden;box-shadow:var(--k-card-shadow, 0 1px 3px rgb(0 0 0 / 12%));transition:var(--color-transition, border-color .2s ease, background-color .2s ease)'
const summaryStyle = 'padding:9px 12px;background:var(--k-hover-bg, rgba(127, 127, 127, .12));color:var(--k-text-dark, inherit);cursor:pointer;user-select:none'
const detailsBodyStyle = 'padding:2px 14px 8px;border-top:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit)'

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>Koishi 插件：光遇国服每日任务 sky-renwu-weibo</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-sky-renwu-weibo?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://npm-stat.com/charts.html?package=koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-sky-renwu-weibo?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/12627" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12627-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Forum">
  </a>
  <a href="https://qm.qq.com/q/rvrRosfKMw" target="_blank">
    <img src="https://img.shields.io/badge/awa群_zyu建的qq群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="awa群-zyu建的qq群">
  </a>
  <a href="https://qm.qq.com/q/oVxZoksppK" target="_blank">
    <img src="https://img.shields.io/badge/光遇Bot群-475328908-D63A4D?style=flat-square&logo=qq&logoColor=white" alt="光遇Bot群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入 awa群-zyu建的qq群：<b style="color: #12B7F5;">1085190201</b> 🎉</p>
<p>🤖 光遇 Bot / QQ 官方 Bot / Koishi 相关交流，也欢迎加入光遇 Bot QQ 群：<b style="color: #EA5252;">475328908</b></p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #ff8a00;">🧩 可选依赖与 QQ 图片体积提醒</b></summary>
<div style="${detailsBodyStyle}">
<p><b>🖼️ puppeteer 是可选服务：</b>只有启用 <code>puppeteer-image</code> 卡片图发送形式时才需要，用于把每日任务渲染成图片。</p>
<p><b>📦 forward 平台限制：</b>开启 <code>restrictForwardPlatforms</code> 时，只有 <code>forwardSupportedPlatforms</code> 列表中的平台会发送图文合并转发；默认允许 onebot、red、discord。关闭开关后所有平台都会尝试发送；开启且列表为空时全部跳过。</p>
<p><b>🌐 assets / server 是可选服务：</b>只有启用 QQ Markdown 按钮行为 <code>append-puppeteer-image</code> 时才会按配置模式使用，用于把 Puppeteer 卡片图转换成 QQ 官方 Bot 可访问的公网图片 URL。</p>
<p><b>⚠️ QQ JSON 按钮限制：</b><code>qqMarkdownButtonMode</code> 只对 QQ 官方 Bot 群聊生效，不影响 QQ 私信和其他平台的任何行为。</p>
<p><b>⚠️ QQ 平台图片体积提醒：</b>在 QQ 官方 Bot 平台使用 <code>puppeteer-image</code> 或 <code>append-puppeteer-image</code> 时，建议把 <code>imageType</code> 改为 <code>jpeg</code> 或 <code>webp</code>，并适当调低 <code>screenshotQuality</code>；默认 PNG 长图可能过大，导致 QQ 平台不接受或不渲染图片。</p>
<p><b>🧷 standalone 与 append-qq-markdown：</b>这两种按钮行为不会使用上面的 assets / server 配置，也不依赖它们。</p>
<p><b>⚠️ assets 模式：</b>只能新增图片，不能删除，文件名由 assets 服务决定，通常无法自定义。</p>
<p><b>⚠️ server 模式：</b>会把临时图片写到 <code>ctx.baseDir/cache/sky-renwu-weibo</code>，支持时间命名，并按数量上限仅保留最新图片；<code>qqMarkdownPuppeteerImageMaxFiles &lt;= 0</code> 表示不设置上限。请确保本插件配置的公网 URL 或 Koishi <code>server.selfUrl</code> 可被 QQ 官方 Bot 访问。</p>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #2f855a;">📣 主动消息推送与 Console 测试</b></summary>
<div style="${detailsBodyStyle}">
<p><b>💌 场景文字提示：</b>每种已启用发送形式都会先展示 <code>dailyTaskGeneralIntroHint</code>，再展示场景提示。普通用户查询使用 <code>dailyTaskPassiveIntroHint</code>；Cron、Console 立即推送和管理员测试指令使用 <code>dailyTaskActiveIntroHint</code>。留空时跳过对应行；独立 QQ JSON 按钮保持原有内容，不包含这些提示。</p>
<p><b>⏰ Cron 定时推送：</b>启用 <code>enableActivePush</code> 后，插件会按 <code>activePushCron</code> 抓取当天任务，并向 <code>activePushTargets</code> 中所有启用目标主动发送。默认表达式 <code>0 1,7,13,19 * * *</code> 表示每天 01:00、07:00、13:00、19:00。</p>
<p><b>🌍 GMT 偏移：</b><code>activePushTimezoneGmtOffset</code> 默认 <code>8</code>，即 GMT+8；只支持整数偏移，不处理夏令时。</p>
<p><b>🧊 缓存：</b><code>activePushUseCache</code> 默认关闭，因此每次 Cron 或 Console 测试都会重新请求微博；开启后才遵循现有 <code>cacheMinutes</code>。</p>
<p><b>🖼️ 图片下载：</b>图片按 <code>imageDownloadConcurrency</code> 限并发下载，并按 <code>imageDownloadTimeout</code>、<code>imageDownloadRetryCount</code>、<code>imageDownloadRetryDelay</code> 与 <code>imageDownloadMaxWait</code> 控制重试和总等待。所有发送形式只使用同一批成功图片，并显示成功数/总数；<code>incompleteImageBehavior</code> 可选择发送成功子集、强制文字回执或跳过任务内容。</p>
<p><b>🎯 目标表：</b>每行配置备注、platform、selfId、Channel ID 和启用开关。<code>selfId</code> 留空时会向该平台所有已连接 Bot 发送；QQ 官方群请在 Channel ID 填写群 openid。</p>
<p><b>🤖 QQ 官方 Bot：</b>主动推送会保留 QQ Markdown、JSON 按钮和 Puppeteer 卡片图策略；<code>qq-markdown</code> 与按钮只对 <code>platform=qq</code> 的官方群聊目标生效。</p>
<p><b>🧪 Console 测试：</b>开启 <code>enableConsoleWebuiTestArea</code> 并保存后，插件详情顶部会注册测试区域。仅 authority 3 管理员可二次确认并点击立即推送；手动测试不受 <code>enableActivePush</code> 限制。</p>
<p><b>💬 管理员测试指令：</b>开启 <code>enableActivePushTestCommand</code> 后，可由 authority 3 管理员执行 <code>\${commandName}.主动推送测试</code>。该指令使用已保存的主动推送目标，不依赖 <code>enableActivePush</code>；无论 verbose 开关状态都会回执简要结果，开启对应 verbose 后才补充逐目标详情。</p>
<p><b>⚠️ 失败行为：</b>抓取失败始终写入 Console；开启 <code>verboseSessionLog</code> 时，失败说明还会发送到全部启用目标。单个目标发送失败只记录 Console，不阻塞其他目标。</p>
</div>
</details>

<p>通过微博 Ajax 获取光遇国服每日任务，默认数据源为 <a href="https://weibo.com/u/7360748659" target="_blank"><code>@今天游离翻车了吗</code></a>。</p>

<blockquote style="margin: 18px 0; padding: 14px 18px; border-left: 6px solid #ff8200; border-radius: 8px; background: #4a1208; color: #fff7ed; font-weight: 800; line-height: 1.7; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);">
  <b style="color: #ffb000;">🙏 特别感谢微博博主 <a href="https://weibo.com/u/7360748659" target="_blank" style="text-decoration: none;"><code style="color: #5f1300; background: #ffd166; padding: 2px 6px; border-radius: 4px; font-weight: 900;">@今天游离翻车了吗</code></a></b><br>
  <span style="font-size: 16px; color: #fff7ed;">多年来稳定更新光遇每日任务内容。这个插件只是做自动化获取和转发，真正持续维护每日攻略内容的是博主本人。</span>
</blockquote>

<blockquote style="margin: 18px 0; padding: 14px 18px; border-left: 6px solid #e63946; border-radius: 8px; background: #3b0d12; color: #fff1f2; font-weight: 800; line-height: 1.7; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);">
  <b style="color: #ff8fa3;">🙏 特别感谢 <a href="https://github.com/Kaguya233qwq/nonebot_plugin_sky" target="_blank" style="color: #ffc2cc; font-weight: 900;">github.com/Kaguya233qwq/nonebot_plugin_sky</a></b><br>
  <span style="font-size: 16px; color: #fff1f2;">该仓库提供了微博爬虫思路参考。本插件在 TypeScript + Koishi 环境中重新实现相关流程。</span>
</blockquote>

<h3>📌 指令</h3>

<pre>
默认指令名称：<code>今日光遇国服任务</code>
</pre>

<p>命令名称可在配置项 <code>commandName</code> 中修改。</p>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #b45309;">🔐 微博访问策略与 Cookie</b></summary>
<div style="${detailsBodyStyle}">

<p>推荐保持默认访问策略 【D】：先尝试移动端无登录用户态，失败或未匹配到今日任务时再 fallback 到 PC 微博网页登录态。</p>
<p>默认情况下可以先不填写 <code>weiboCookie</code>。如果移动端公开接口受限、无登录用户态没有匹配到今日任务，或想提高兜底稳定性，再使用 PC 微博网页登录态作为 fallback。</p>

<h4>📌 临时覆盖微博访问策略</h4>
<p>可用 <code>--weibo &lt;mode&gt;</code> 临时覆盖微博访问策略，优先级高于配置项 <code>weiboAccessMode</code>。
<br>
<code>mode</code> 不区分大小写，可选：<code>cookie-only</code> / <code>guest-only</code> / <code>cookie-then-guest</code> / <code>guest-then-cookie</code>。</p>
<pre>
<code>
今日光遇国服任务 --weibo guest-only
</code>
<code>
今日光遇国服任务 --weibo COOKIE-ONLY
</code>
</pre>

<h4>🔐 Cookie 获取和安全说明</h4>

<p>需要 Cookie fallback 时，可以运行仓库内的辅助脚本打开浏览器手动登录：</p>
<p>Cookie 辅助脚本只使用 Python 标准库，也不需要 <code>pip install</code>。</p>

<p>由于安全原因，插件不会内置任何微博登录 Cookie，也不建议把 Cookie 写进源码、README、issue 或聊天记录中。请自行登录微博并获取自己的 Cookie。</p>

<p>当前推荐配置流程是：先保持默认 D 使用移动端无登录用户态；需要 Cookie fallback 时，再通过 Python 脚本使用 CDP 获取本机 PC 浏览器里的 <code>weibo.com</code> 登录态，并把导出的 Cookie 复制到 Koishi 配置项 <code>weiboCookie</code>。</p>

<p>由于浏览器安全策略和跨域限制，Koishi Console 页面暂时无法直接读取 <code>weibo.com</code> 的登录 Cookie，因此获取 Cookie 的流程目前没有内置到浏览器 WebUI 中。插件运行时也不会自动读取本地 <code>weibo_cookie.private.txt</code>，这个文件只用于把内容复制到配置项。</p>

<pre>
<code>python scripts/20260630/weibo_cookie.py --browser "chrome浏览器可执行文件路径"</code>
</pre>

<p>登录完成后，脚本会生成 <code>scripts/20260630/weibo_cookie.private.txt</code>，把文件内容填入插件配置项 <code>weiboCookie</code>。访问策略 A/C/D 会使用这个配置项，策略 B 不使用它；插件不会自动读取本地 txt 文件。</p>

<h4>⚠️ 注意</h4>

<p><code>weibo_cookie.private.txt</code>、<code>latest.debug.log</code> 和 <code>.browser-profile</code> 都包含隐私信息，不要发给别人，也不要提交到 Git。</p>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #d97706;">🎯 今日任务匹配严格度 dailyTaskMatchStrictness</b></summary>
<div style="${detailsBodyStyle}">
<p>判断一条微博是不是「今天的每日任务」，插件手里有三个信号：<b>A</b> 命中配置的 <code>matchPattern</code> 正则（如 <code>光遇9.20每日任务</code>）、<b>B</b> 正文里抠出的日期是今天（如 <code>9月20日任务</code>）、<b>C</b> 发布时间是北京时间今天。此配置控制这三个信号如何组合，从严到宽。</p>
<p><b>🔒 strict / 严格：</b>必须 A 命中，<b>且</b> (B 或 C 是今天)。防一切误判，但博主一旦改标题格式让正则不命中，就可能漏掉当天任务。</p>
<p><b>⚖️ standard / 标准：</b>A 命中，<b>或</b> B 是今天。接近插件最初的判定逻辑。</p>
<p><b>🍃 lenient / 宽松（默认）：</b>正文能抠出日期就只看日期是否为今天；抠不到日期时才退回「A 命中且 C 是今天」。防漏优先，博主改格式也能扛住。</p>
<p><b>🌊 loose / 最宽松：</b>A、B、C 任一满足即认。几乎不漏，但误判概率最高。</p>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #d97706; border-radius: 6px; background: rgba(217, 119, 6, .1);">
<b>💡 怎么选？</b>核心是在「宁可漏也不误判」（strict）与「宁可误判也不漏」（loose）之间权衡。默认 lenient 的判断是：漏掉当天任务群友就看不到，比偶尔误判更影响体验；而误判要求博主在闲聊里恰好写出「今天的日期 + 任务」字样，概率极低。<br>
<b>🚫 绝不发昨天的任务：</b>无论哪档，只要正文日期能抠出且不是今天，都不会命中——插件会明确返回「今天还没发送任务微博」，不会把昨天的当今天发。
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #0ea5e9;">🌐 图片下载：CDN 域名轮换策略 imageCdnRotateStrategy</b></summary>
<div style="${detailsBodyStyle}">
<p>微博图床同一张图在多个镜像域名下都可访问（如 <code>wx1~wx4.sinaimg.cn</code>、<code>tvax1~tvax4.sinaimg.cn</code>）。个别 CDN 节点偶发抽风、卡住超时时，换一个域名往往能立刻拿到图。此策略控制「下载重试时是否 / 如何轮换域名」。</p>
<p><b>🔒 off / 关闭：</b>始终用原始链接，重试也不换域名。</p>
<p><b>🐢 on-final-retry / 保守：</b>只在最后一次重试才换一个域名，撞运气式兜底。</p>
<p><b>⚖️ each-retry / 均衡（默认）：</b>每次重试轮换到下一个域名（wx2→wx3→wx4→wx1）。专治日志里那种「同一张图连撞同一节点多次超时」的情况。换域名不损失任何画质，是纯赚的手段。</p>
<p><b>🚀 parallel-race / 激进：</b>首次就同时向多个域名发起请求，谁先返回用谁，命中后中止其余请求。速度最快，但 <b style="color: #e11d48;">请求量成倍增加，可能触发微博限流或反爬拦截</b>，谨慎开启。</p>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #0ea5e9; border-radius: 6px; background: rgba(14, 165, 233, .1);">
<b>💡 实现细节：</b>域名轮换是纯 URL 字符串替换，只认 <code>xxx{数字}.sinaimg.cn</code> 这类 host。<b>格式不认识时会原样退回原链接</b>，不会瞎改。轮换步数以「当前是第几次重试」推进，和下面的尺寸降级策略各自独立、互不干扰。
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #16a34a;">📐 图片下载：尺寸降级策略 imageSizeDegradeStrategy</b></summary>
<div style="${detailsBodyStyle}">
<p>微博图 URL 路径里带尺寸标识（<code>large</code> / <code>mw2000</code> / <code>mw1024</code> / <code>mw690</code> …）。大图偶尔下载很慢甚至超时，此时降一档尺寸常能快速拿到图。此策略控制「下载重试时是否 / 如何降级尺寸」。降级会损失画质，通常作为拿不到高清图时的兜底。</p>
<p><b>💎 always-largest / 最高清：</b>永远只用最大尺寸，超时也不降；拿不到就缺那张图。画质优先。</p>
<p><b>🐢 degrade-final-retry / 保守（默认）：</b>只在最后一次重试才降一档尺寸保底，前面几次都保持最高清。兼顾画质与成功率。</p>
<p><b>⚖️ degrade-each-retry / 均衡：</b>每次重试都降一档（largest→mw2000→mw1024→mw690），更快拿到图，但画质下降也快。</p>
<p><b>🚀 start-mid / 激进：</b>首次就直接从中等尺寸（mw2000）起步，几乎不缺图，默认牺牲画质换成功率。</p>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #16a34a; border-radius: 6px; background: rgba(22, 163, 74, .1);">
<b>💡 想看大图？</b>本插件核心价值是提醒群友「今天有哪些任务」，画质低甚至只有文字也够用。真想看高清大图，直接点开消息里的微博原文链接即可。尺寸降级同样是纯 URL 字符串替换，识别不到尺寸段时原样退回。
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #7c3aed;">🧊 缓存策略：跨天丢弃与「光遇日」分界</b></summary>
<div style="${detailsBodyStyle}">
<p>光遇国服每日任务在北京时间凌晨固定刷新，同一天内内容不变，因此 <code>cacheMinutes</code> 默认放长到 <b>600（10 小时）</b>，减少重复请求微博。</p>
<p><b>🌙 discardCacheAcrossBeijingMidnight（默认开启）：</b>即使缓存分钟数还没到期，只要缓存写入时间和当前时间不在同一个「光遇日」，也会强制丢弃缓存、重新请求，确保新的一天拿到最新任务。</p>
<p><b>⏰ cacheMidnightOffsetMinutes（默认 67）：</b>「每日刷新分界点」相对北京时间 0 点的偏移分钟数。默认 67 即凌晨 <b>1:07</b> 才算进入新的一天。</p>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #7c3aed; border-radius: 6px; background: rgba(124, 58, 237, .1);">
<b>💡 为什么要偏移，不直接卡 0 点？</b>博主发布当天任务微博通常晚于 0 点（可能 0:30、1:00 才发）。如果 0 点一到就丢缓存，0:00 到博主发博之间会有空窗期，容易抓到「还没更新的今天」。留出偏移可以绕开这段空窗。<br>
<b>🚫 抓到昨天的任务怎么办？</b>插件会<b>优先按微博正文里的「X月X日任务」日期</b>判断任务归属哪天（抠不到日期才退回按发布时间）。只要正文日期不是今天，插件就明确返回「今天还没发送任务微博」的提示，<b>绝不把昨天的任务当今天发</b>。
</blockquote>
</div>
</details>
`

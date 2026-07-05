const pkg = require('../package.json')

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>Koishi 插件：光遇国服每日任务 sky-renwu-weibo</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-sky-renwu-weibo?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo" target="_blank">
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
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
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

<details>
<summary><h2 style="color: #ff8a00; font-weight: 900; font-size: 24px; margin: 20px 0;">🧩 可选依赖与 QQ 图片体积提醒（点击展开）</h2></summary>
<p><b>🖼️ puppeteer 是可选服务：</b>只有启用 <code>puppeteer-image</code> 卡片图发送形式时才需要，用于把每日任务渲染成图片。</p>
<p><b>🌐 assets / server 是可选服务：</b>只有启用 QQ Markdown 按钮行为 <code>append-puppeteer-image</code> 时才会按配置模式使用，用于把 Puppeteer 卡片图转换成 QQ 官方 Bot 可访问的公网图片 URL。</p>
<p><b>⚠️ QQ 平台图片体积提醒：</b>在 QQ 官方 Bot 平台使用 <code>puppeteer-image</code> 或 <code>append-puppeteer-image</code> 时，建议把 <code>imageType</code> 改为 <code>jpeg</code> 或 <code>webp</code>，并适当调低 <code>screenshotQuality</code>；默认 PNG 长图可能过大，导致 QQ 平台不接受或不渲染图片。</p>
<p><b>🧷 standalone 与 append-qq-markdown：</b>这两种按钮行为不会使用上面的 assets / server 配置，也不依赖它们。</p>
<p><b>⚠️ assets 模式：</b>只能新增图片，不能删除，文件名由 assets 服务决定，通常无法自定义。</p>
<p><b>⚠️ server 模式：</b>会把临时图片写到 <code>ctx.baseDir/cache/sky-renwu-weibo</code>，支持时间命名，并按数量上限仅保留最新图片；<code>qqMarkdownPuppeteerImageMaxFiles &lt;= 0</code> 表示不设置上限。请确保本插件配置的公网 URL 或 Koishi <code>server.selfUrl</code> 可被 QQ 官方 Bot 访问。</p>
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

<details>
<summary><h3>🔐 微博访问策略与 Cookie（点击展开）</h3></summary>

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
</details>
`

const pkg = require('../package.json')

export const usage = `
<h2>📅✅ koishi-plugin-sky-renwu-weibo v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-sky-renwu-weibo?style=flat-square" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-sky-renwu-weibo?style=flat-square" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-sky-renwu-weibo" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/xxxxx" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-xxxxx-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Koishi Forum">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>


<p>通过微博 Ajax 获取光遇国服每日任务，默认数据源为 <code>@今天游离翻车了吗</code>。</p>

<blockquote>
  🙏 特别感谢微博博主 <code>@今天游离翻车了吗</code> 多年来稳定更新光遇每日任务内容。这个插件只是做自动化获取和转发，真正持续维护每日攻略内容的是博主本人。
</blockquote>

<h3>📌 指令</h3>

<pre>
<code>今日国服</code>
</pre>

<p>命令名称可在配置项 <code>commandName</code> 中修改。</p>

<h3>🔐 微博 Cookie</h3>

<p>微博接口通常需要登录 Cookie。可以运行仓库内的辅助脚本打开浏览器手动登录：</p>

<p>由于安全原因，插件不会内置任何微博登录 Cookie，也不建议把 Cookie 写进源码、README、issue 或聊天记录中。请自行登录微博并获取自己的 Cookie。</p>

<p>由于浏览器安全策略和跨域限制，Koishi Console 页面暂时无法直接读取 <code>weibo.com</code> 的登录 Cookie，因此获取 Cookie 的流程目前没有内置到浏览器 WebUI 中。后续如果找到更稳定、安全的实现方式，可能会在新版本中提供更方便的获取流程。</p>

<pre>
<code>python scripts/20260630/weibo_cookie.py --browser "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"</code>
</pre>

<p>登录完成后，脚本会生成 <code>scripts/20260630/weibo_cookie.private.txt</code>，把文件内容填入插件配置项 <code>weiboCookie</code>。</p>

<h3>💬 发送形式</h3>
<ul>
  <li>📄➕🖼️ <b>先文后图</b>：一条消息内先发送微博长文本，再发送全部图片。</li>
  <li>🖼️➕📄 <b>先图后文</b>：一条消息内先发送全部图片，再发送微博长文本。</li>
  <li>📄 <b>纯文字</b>：只发送微博长文本、数据来源和原文链接。</li>
  <li>📦 <b>图文合并转发</b>：把文字和图片打包进 OneBot 合并转发。</li>
  <li>🖼️ <b>Puppeteer 卡片图</b>：把文字和微博图片排版成一张圆角卡片图。</li>
</ul>

<p><code>puppeteer-image</code> 模式需要启用 Koishi 的 <code>puppeteer</code> 服务；未启用时插件会跳过该发送形式。</p>
<p>开启 <code>enableWaitingHint</code> 后，触发指令时会先发送“爬取并生成中.... 请耐心等待”提示，所有发送形式完成后会尝试撤回。开启 <code>enableQuote</code> 后，普通消息会引用触发指令；<code>forward</code> 合并转发模式不会附带引用。</p>

<h3>⚙️ 过滤器设置</h3>

<p>如果你的 Koishi 环境启用了过滤器，请确认该插件允许接收目标频道 / 群聊 / 平台消息。否则插件可能已经加载，但命令不会触发。</p>

<h3>🔧 配置项</h3>

<ul>
  <li><code>uid</code>：微博用户 UID，默认 <code>7360748659</code>。</li>
  <li><code>matchPattern</code>：筛选每日任务微博的正则表达式。</li>
  <li><code>cacheMinutes</code>：内存缓存分钟数，避免重复请求微博。</li>
  <li><code>enableQuote</code>：发送普通消息时是否引用触发指令；合并转发模式除外。</li>
  <li><code>enableWaitingHint</code>：爬取和生成期间是否发送等待提示，完成后会尝试撤回。</li>
  <li><code>msgFormArr</code>：每日任务发送形式，可多选。</li>
  <li><code>imageType</code>、<code>screenshotQuality</code>、<code>imageWidth</code>：Puppeteer 卡片图相关配置。</li>
  <li><code>useCustomFont</code>、<code>imageFontPath</code>、<code>autoDownloadFont</code>：Puppeteer 卡片图字体路径和自动下载设置。</li>
</ul>

<h3>🔤 字体缓存</h3>

<p>Puppeteer 卡片图默认使用 <code>LXGWWenKaiMono-Regular.ttf</code>。插件加载时会检查 <code>ctx.baseDir/data/fonts</code>，字体存在且 hash 校验通过时会跳过下载；缺失或校验失败时会尝试从 Gitee / GitHub 下载。关闭 <code>useCustomFont</code> 后将使用系统默认字体。</p>

<h3>⚠️ 注意</h3>

<p><code>weibo_cookie.private.txt</code>、<code>latest.debug.log</code> 和 <code>.browser-profile</code> 都包含隐私信息，不要发给别人，也不要提交到 Git。</p>
`

const pkg = require('../package.json')

export const usage = `
<h1>Koishi 插件：光遇国服每日任务 sky-renwu-weibo</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

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
  <a href="https://forum.koishi.xyz/t/topic/12627" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12627-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Koishi Forum">
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

<h2 style="color: #ff8a00; font-weight: 900; font-size: 24px; margin: 20px 0;">🧩 可选依赖：按需开启 <b>puppeteer</b> 和 <b>assets</b> 服务</h2>
<p><b>🖼️ puppeteer 是可选服务：</b>只有启用 <code>puppeteer-image</code> 卡片图发送形式时才需要，用于把每日任务渲染成图片。</p>
<p><b>🌐 assets 是可选服务：</b>只有启用 QQ Markdown 按钮行为 <code>append-puppeteer-image</code> 时才需要，用于把 Puppeteer 卡片图上传成 QQ 官方 Bot 可访问的公网图片 URL。</p>
<p><b>⚠️ 提醒：</b>如果要让 QQ 官方 Bot 访问 assets 图片，请确保 Koishi <code>assets</code> 的 <code>selfUrl</code> 公网可访问。</p>

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
默认指令名称：<code>今日国服</code>
</pre>

<p>命令名称可在配置项 <code>commandName</code> 中修改。</p>

<h3>🔐 微博 Cookie</h3>

<p>微博接口通常需要登录 Cookie。可以运行仓库内的辅助脚本打开浏览器手动登录：</p>

<p>由于安全原因，插件不会内置任何微博登录 Cookie，也不建议把 Cookie 写进源码、README、issue 或聊天记录中。请自行登录微博并获取自己的 Cookie。</p>

<p>由于浏览器安全策略和跨域限制，Koishi Console 页面暂时无法直接读取 <code>weibo.com</code> 的登录 Cookie，因此获取 Cookie 的流程目前没有内置到浏览器 WebUI 中。后续如果找到更稳定、安全的实现方式，可能会在新版本中提供更方便的获取流程。</p>

<pre>
<code>python scripts/20260630/weibo_cookie.py --browser "chrome浏览器可执行文件路径"</code>
</pre>

<p>登录完成后，脚本会生成 <code>scripts/20260630/weibo_cookie.private.txt</code>，把文件内容填入插件配置项 <code>weiboCookie</code>。</p>

<h3>⚠️ 注意</h3>

<p><code>weibo_cookie.private.txt</code>、<code>latest.debug.log</code> 和 <code>.browser-profile</code> 都包含隐私信息，不要发给别人，也不要提交到 Git。</p>
`

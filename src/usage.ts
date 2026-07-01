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
<code>python scripts/20260630/weibo_cookie.py --browser "chrome浏览器可执行文件路径"</code>
</pre>

<p>登录完成后，脚本会生成 <code>scripts/20260630/weibo_cookie.private.txt</code>，把文件内容填入插件配置项 <code>weiboCookie</code>。</p>

<h3>⚠️ 注意</h3>

<p><code>weibo_cookie.private.txt</code>、<code>latest.debug.log</code> 和 <code>.browser-profile</code> 都包含隐私信息，不要发给别人，也不要提交到 Git。</p>
`

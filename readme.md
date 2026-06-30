# koishi-plugin-sky-renwu-weibo

[![npm](https://img.shields.io/npm/v/koishi-plugin-sky-renwu-weibo?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-sky-renwu-weibo?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-sky-renwu-weibo)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-sky-renwu-weibo)

[![Koishi Forum](https://img.shields.io/badge/Koishi%20Forum-xxxxx-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/xxxxx)
[![QQ群](https://img.shields.io/badge/QQ群-xxxxx-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/xxxxx)

🌤️ 通过微博 Ajax 获取光遇国服每日任务捏。默认数据源为微博 `@今天游离翻车了吗`。

## 📌 指令

```text
今日国服
```

命令名称可以在配置项 `commandName` 中修改。

## 🔐 微博 Cookie

微博接口通常需要登录 Cookie。可以运行仓库内的辅助脚本打开浏览器手动登录并导出 Cookie：

```powershell
python scripts/20260630/weibo_cookie.py --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

脚本会打开浏览器，登录完成后回到终端按 Enter，会生成：

```text
scripts/20260630/weibo_cookie.private.txt
```

把文件内容填入 Koishi 插件配置项 `weiboCookie`。

## 💬 输出方式

插件配置项 `msgFormArr` 支持多选：

- 📄➕🖼️ `text-with-image`：图文，一条消息内发送微博长文本和全部图片
- 📄 `text`：纯文字，只发送微博长文本、数据来源和原文链接
- 📦 `forward`：图文合并转发，把文字和图片打包进 OneBot 合并转发
- 🖼️ `image`：Puppeteer 卡片图，把文字和微博图片排版成一张圆角卡片图

默认只启用 `text-with-image`。

`image` 模式需要启用 Koishi 的 `puppeteer` 服务；未启用时插件会跳过该发送形式。

## 🔧 配置项

- `uid`：微博用户 UID，默认 `7360748659`
- `authorName`：来源作者显示名
- `weiboCookie`：微博登录 Cookie，必填
- `matchPattern`：筛选每日任务微博的正则表达式
- `cacheMinutes`：内存缓存分钟数，默认 `20`
- `requestTimeout`：微博请求超时时间，单位毫秒
- `userAgent`：请求微博使用的 User-Agent
- `msgFormArr`：消息发送形式，多选
- `imageType`：Puppeteer 卡片图输出格式
- `screenshotQuality`：Puppeteer 卡片图截图质量
- `imageWidth`：Puppeteer 卡片图宽度
- `useCustomFont`：是否使用自定义字体路径，关闭后使用系统默认字体
- `imageFontPath`：Puppeteer 卡片图字体路径
- `autoDownloadFont`：自动下载并校验默认字体

## ⚙️ 过滤器设置

如果你的 Koishi 环境启用了过滤器，请确认该插件允许接收目标频道 / 群聊 / 平台消息。否则插件可能已经加载，但命令不会触发。

## 🔤 字体缓存

Puppeteer 卡片图默认使用 `LXGWWenKaiMono-Regular.ttf`。插件加载时会检查：

```text
ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf
```

字体存在且 hash 校验通过时会跳过下载；缺失或校验失败时会尝试从 Gitee / GitHub 下载。配置项 `useCustomFont=false` 或 `imageFontPath` 为空时会使用系统默认字体。

## ⚠️ 注意

`weibo_cookie.private.txt`、`latest.debug.log` 和 `.browser-profile` 都包含隐私信息，不要发给别人，也不要提交到 Git。

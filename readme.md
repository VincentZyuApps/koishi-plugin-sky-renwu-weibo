# koishi-plugin-sky-renwu-weibo

[![npm](https://img.shields.io/npm/v/koishi-plugin-sky-renwu-weibo?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-sky-renwu-weibo?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sky-renwu-weibo)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-sky-renwu-weibo)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-sky-renwu-weibo)

[![Koishi Forum](https://img.shields.io/badge/Koishi%20Forum-xxxxx-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/xxxxx)
[![QQ群](https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/ZN7fxZ3qCq)

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

🌤️ 通过微博 Ajax 获取光遇国服每日任务捏。默认数据源为微博 `@今天游离翻车了吗`。

> 🙏 特别感谢微博博主 `@今天游离翻车了吗` 多年来稳定更新光遇每日任务内容。这个插件只是做自动化获取和转发，真正持续维护每日攻略内容的是博主本人。

## 📌 指令

```text
今日国服
```

命令名称可以在配置项 `commandName` 中修改。

## 🔐 微博 Cookie

微博接口通常需要登录 Cookie。可以运行仓库内的辅助脚本打开有头浏览器，手动登录微博后导出 `weibo.com` Cookie。

由于安全原因，插件不会内置任何微博登录 Cookie，也不建议把 Cookie 写进源码、README、issue 或聊天记录中。请自行登录微博并获取自己的 Cookie。

由于浏览器安全策略和跨域限制，Koishi Console 页面暂时无法直接读取 `weibo.com` 的登录 Cookie，因此获取 Cookie 的流程目前没有内置到浏览器 WebUI 中。后续如果找到更稳定、安全的实现方式，可能会在新版本中提供更方便的获取流程。

脚本说明见：[scripts/readme.md](./scripts/readme.md)

```bash
# 🪟 on Windows
python scripts\20260630\weibo_cookie.py --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
# 🐧 on Linux
python scripts/20260630/weibo_cookie.py --browser "/usr/bin/google-chrome"
```

运行后目录大致如下：

```text
scripts/
└── 20260630/
    ├── weibo_cookie.py             # 打开有头浏览器，登录微博并导出 Cookie
    ├── latest.debug.log            # 调试日志，包含本地运行信息
    ├── weibo_cookie.private.txt    # 需要填入配置项 weiboCookie 的值
    └── .browser-profile/           # 隔离浏览器用户数据目录，可能包含登录态
```

把 `weibo_cookie.private.txt` 的内容填入 Koishi 插件配置项 `weiboCookie`。

## 💬 输出方式

插件配置项 `msgFormArr` 支持多选：

- 📄➕🖼️ `text-with-image`：图文，一条消息内发送微博长文本和全部图片
- 📄 `text`：纯文字，只发送微博长文本、数据来源和原文链接
- 📦 `forward`：图文合并转发，把文字和图片打包进 OneBot 合并转发
- 🖼️ `puppeteer-image`：Puppeteer 卡片图，把文字和微博图片排版成一张圆角卡片图

默认只启用 `text-with-image`。

`puppeteer-image` 模式需要启用 Koishi 的 `puppeteer` 服务；未启用时插件会跳过该发送形式。

## 🔧 配置项

### 🔑 微博来源配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `commandName` | `string` | `"今日国服"` | 触发命令名称 |
| `uid` | `string` | `"7360748659"` | 微博用户 UID，默认是 `@今天游离翻车了吗` |
| `authorName` | `string` | `"今天游离翻车了吗"` | 来源作者显示名，会展示在数据来源署名里 |
| `weiboCookie` | `string` | `""` | 微博登录 Cookie，必填；可用 `scripts/20260630/weibo_cookie.py` 导出 |
| `matchPattern` | `string` | 默认正则 | 筛选每日任务微博的正则表达式，微博文案格式变化时可调整 |

### 🌐 请求与缓存配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `cacheMinutes` | `number` | `20` | 内存缓存分钟数；`0` 表示不缓存 |
| `requestTimeout` | `number` | `10000` | 微博请求超时时间，单位毫秒 |
| `userAgent` | `string` | Edge/Chrome UA | 请求微博使用的 User-Agent，通常保持默认即可 |

### 💬 消息发送形式配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `msgFormArr` | `string[]` | `["forward", "puppeteer-image"]` | 每日任务发送形式，可多选：`text-with-image`、`text`、`forward`、`puppeteer-image` |

### 🖼️ Puppeteer 卡片图配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `imageType` | `"png" \| "jpeg" \| "webp"` | `"png"` | Puppeteer 卡片图输出格式；PNG 不支持质量参数 |
| `screenshotQuality` | `number` | `88` | Puppeteer 卡片图截图质量，仅 JPEG / WEBP 生效 |
| `imageWidth` | `number` | `980` | Puppeteer 卡片图宽度，单位 px |
| `useCustomFont` | `boolean` | `true` | 是否使用自定义字体路径；关闭后使用系统默认字体，并跳过默认字体下载 |
| `imageFontPath` | `string` | `process.cwd()/data/fonts/LXGWWenKaiMono-Regular.ttf` | Puppeteer 卡片图字体路径；运行时自动映射到 `ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf` |
| `autoDownloadFont` | `boolean` | `true` | 是否自动下载并校验默认字体 |

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

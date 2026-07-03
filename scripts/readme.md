# 🔧 scripts

## 🔐 weibo_cookie.py

🌐 用于打开有头浏览器，手动登录微博后导出 `weibo.com` Cookie。

> [!IMPORTANT]
>
> 这个脚本只使用 Python 标准库，不需要安装任何第三方库，也不需要 `pip install`。
>
> 建议使用 Python `3.10` - `3.13`，优先推荐和作者同款的 Python `3.13`。脚本使用了 Python 3.10+ 的类型标注语法，Python 3.9 及以下不建议使用。

## 🧠 CDP 原理

这个脚本使用的是 **CDP（Chrome DevTools Protocol）**。

- 启动 Chrome / Edge 时会附带 `--remote-debugging-port`，让浏览器暴露本机 DevTools 调试端口。
- 脚本会先访问本地 HTTP 接口 `/json/version` 和 `/json/list`，找到微博页面对应的 `webSocketDebuggerUrl`。
- 然后通过 WebSocket 连接页面调试地址，并调用 CDP 的 `Network.enable` 与 `Network.getAllCookies`。
- 最后只保留 `weibo.com` 及其子域名的 Cookie，写入本地 `weibo_cookie.private.txt`。

整个实现只依赖 Python 标准库；包括 WebSocket 客户端也是脚本里手写的最小实现，没有额外依赖。

![微博 Cookie 脚本示例](../docs/images/example.get-weibo-cookie-via-python.png)

脚本会优先使用 `--browser` 传入的浏览器路径；如果没有传入，会依次尝试寻找下面这些默认路径：

```text
C:\Program Files\Google\Chrome\Application\chrome.exe
C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
C:\Program Files\Microsoft\Edge\Application\msedge.exe
/usr/bin/google-chrome
/usr/bin/chromium
```

你也可以使用 `--browser` 参数指定浏览器路径。

```bash
# 🪟 on Windows：使用默认路径自动查找
python .\20260630\weibo_cookie.py
# 🪟 on Windows：也可以使用 --browser 指定浏览器路径
python .\20260630\weibo_cookie.py --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
# 🐧 on Linux：使用默认路径自动查找
python ./20260630/weibo_cookie.py
# 🐧 on Linux：也可以使用 --browser 指定浏览器路径
python ./20260630/weibo_cookie.py --browser "/usr/bin/google-chrome"
```

## 📁 目录结构

运行后目录大致如下：

```text
scripts/
└── 20260630/
    ├── weibo_cookie.py             # 🌐 打开有头浏览器，登录微博并导出 Cookie
    ├── latest.debug.log            # 🧾 调试日志，包含本地运行信息
    ├── weibo_cookie.private.txt    # 🔐 需要填入配置项 weiboCookie 的值
    └── .browser-profile/           # 🗂️ 隔离浏览器用户数据目录，可能包含登录态
```

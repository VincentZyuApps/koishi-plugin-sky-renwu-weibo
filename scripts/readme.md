# 🔧 scripts

## 🔐 weibo_cookie.py

🌐 用于打开有头浏览器，手动登录微博后导出 `weibo.com` Cookie。

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

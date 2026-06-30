# 🔧 scripts

## 🔐 weibo_cookie.py

🌐 用于打开有头浏览器，手动登录微博后导出 `weibo.com` Cookie。

```bash
# 🪟 on Windows
python .\20260630\weibo_cookie.py --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
# 🐧 on Linux
python ./20260630/weibo_cookie.py --browser "/usr/bin/google-chrome"
```

## 📁 目录结构

运行后目录大致如下：

```text
scripts/
└── 20260630/
    ├── weibo_cookie.py             # 打开有头浏览器，登录微博并导出 Cookie
    ├── latest.debug.log            # 调试日志，包含本地运行信息
    ├── weibo_cookie.private.txt    # 需要填入配置项 weiboCookie 的值
    └── .browser-profile/           # 隔离浏览器用户数据目录，可能包含登录态
```

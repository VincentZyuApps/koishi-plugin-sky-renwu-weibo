# 🔧 scripts

## 🔐 weibo_cookie.py

🌐 用于打开有头浏览器，手动登录微博后导出 `weibo.com` Cookie。

```bash
# 🪟 on Windows
python .\20260630\weibo_cookie.py --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
# 🐧 on Linux
python ./20260630/weibo_cookie.py --browser "/usr/bin/google-chrome"
```

## 📁 输出文件

脚本会在同级日期目录生成：

```text
latest.debug.log
weibo_cookie.private.txt
.browser-profile/
```

其中`weibo_cookie.private.txt`的内容就是需要填入配置项`weiboCookie`的值

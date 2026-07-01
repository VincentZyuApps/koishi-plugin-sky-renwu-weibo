import os
import json
import sys
import time
import base64
import socket
import struct
from pathlib import Path
import argparse
import subprocess
import urllib.error
import urllib.parse
import urllib.request


# 📌 脚本所在目录。所有临时文件都放在脚本目录下，方便排查和清理。
SCRIPT_DIR = Path(__file__).resolve().parent
# 🧾 每次运行都会重写这个日志文件；遇到失败时优先看这里。
LOG_PATH = SCRIPT_DIR / "latest.debug.log"
# 🔐 导出的 Cookie 会写到这里。这个文件等同登录凭据，不要提交到 Git。
COOKIE_PATH = SCRIPT_DIR / "weibo_cookie.private.txt"
# 🌐 默认打开游离博主主页，登录后更容易确认微博账号状态是否正常。
TARGET_URL = "https://weibo.com/u/7360748659"

# 🔎 未传入 --browser 时按顺序尝试这些常见浏览器路径。
# 🪟 Windows 优先找 Chrome / Edge；🐧 Linux 优先找 google-chrome / chromium。
FALLBACK_BROWSER_PATHS = (
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
)

# 🎨 彩色输出开关：
# - 默认只在交互式终端开启颜色。
# - 设置 NO_COLOR 可关闭颜色。
# - 设置 FORCE_COLOR 可强制开启颜色，适合某些终端/日志工具。
STYLE_ENABLED = os.environ.get("NO_COLOR") is None and (
    sys.stdout.isatty() or os.environ.get("FORCE_COLOR")
)

RESET = "0"
BOLD = "1"
DIM = "2"
ITALIC = "3"
RED = "31"
GREEN = "32"
YELLOW = "33"
BLUE = "34"
MAGENTA = "35"
CYAN = "36"


# 🎛️ 下面这组样式函数只负责终端显示，不影响脚本逻辑。
# 🧪 如果终端颜色异常，可以先设置 NO_COLOR=1 排除 ANSI 转义问题。
def styled(text: str, *codes: str) -> str:
    if not STYLE_ENABLED:
        return text
    return f"\033[{';'.join(codes)}m{text}\033[0m"


def title(text: str) -> str:
    return styled(text, BOLD, CYAN)


def ok(text: str) -> str:
    return styled(text, BOLD, GREEN)


def warn(text: str) -> str:
    return styled(text, BOLD, YELLOW)


def err(text: str) -> str:
    return styled(text, BOLD, RED)


def info(text: str) -> str:
    return styled(text, BLUE)


def hint(text: str) -> str:
    return styled(text, DIM)


def emphasis(text: str) -> str:
    return styled(text, BOLD, ITALIC)


def print_banner() -> None:
    print()
    print(title("✨ 微博 Cookie 导出助手"))
    print(hint("   手动登录微博后，脚本会通过本地 Chrome DevTools 读取 weibo.com Cookie。"))
    print(hint("   Cookie 是登录凭据，请只保存在本机，不要发给别人。"))
    print()


def print_step(index: int, message: str) -> None:
    print(f"{styled(f'[{index}]', BOLD, MAGENTA)} {message}")


def print_kv(label: str, value: object) -> None:
    print(f"  {styled(label + ':', BOLD)} {value}")


def print_default_browsers() -> None:
    print(hint("  未传入 --browser，正在按下面的默认路径依次查找："))
    for candidate in FALLBACK_BROWSER_PATHS:
        print(hint(f"  - {candidate}"))


def log(message: str) -> None:
    # 🧾 简单文件日志：只记录关键路径和错误，避免把完整 Cookie 写进日志。
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG_PATH.open("a", encoding="utf-8") as file:
        file.write(f"[{timestamp}] {message}\n")


def find_browser(explicit_path: str | None) -> str:
    # 🧭 查找顺序：用户手动指定的 --browser 最高优先级，其次才是默认路径。
    candidates = []
    if explicit_path:
        candidates.append(explicit_path)
    candidates.extend(FALLBACK_BROWSER_PATHS)

    for candidate in candidates:
        # 🏠 expanduser 支持 ~/xxx 这种用户目录写法，方便 Linux / macOS 手动指定。
        path = Path(candidate).expanduser()
        if path.is_file():
            return str(path)

    raise FileNotFoundError(
        "没有找到浏览器。请通过 --browser 指定 Chrome/Edge 路径。"
    )


def http_json(url: str):
    # 🌉 Chrome DevTools 提供本地 HTTP JSON 接口，例如 /json/version 和 /json/list。
    # ⏱️ 这里 timeout 保持较短，方便 wait_for_debugger 快速轮询。
    with urllib.request.urlopen(url, timeout=2) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_debugger(port: int, timeout: int) -> None:
    # ⏳ 浏览器启动后 DevTools 端口不会立刻可用，所以这里轮询等待。
    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        try:
            http_json(f"http://127.0.0.1:{port}/json/version")
            return
        except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
            last_error = error
            time.sleep(0.5)
    raise TimeoutError(f"浏览器调试端口未就绪: {last_error}")


def open_new_tab(port: int, url: str) -> None:
    # 🪟 某些浏览器启动参数已经能打开目标页；这里额外尝试新开标签页作为兜底。
    # 🧯 /json/new 在部分浏览器版本上可能不可用，失败时记录日志但不中断流程。
    encoded = urllib.parse.quote(url, safe="")
    try:
        http_json(f"http://127.0.0.1:{port}/json/new?{encoded}")
    except urllib.error.HTTPError as error:
        log(f"打开新标签页接口不可用，已忽略: HTTP {error.code}")


def get_page_websocket_url(port: int) -> str:
    # 🔌 /json/list 会列出当前可调试页面，每个页面都有一个 WebSocket 调试地址。
    targets = http_json(f"http://127.0.0.1:{port}/json/list")
    # 🎯 优先选择 weibo.com 页面，避免读到空白页或浏览器默认页的 Cookie 上下文。
    for target in targets:
        if target.get("type") == "page" and "weibo.com" in target.get("url", ""):
            return target["webSocketDebuggerUrl"]
    # 🧩 如果还没跳到 weibo.com，也先拿任意 page，后续 CDP 仍可能读到全局 Cookie。
    for target in targets:
        if target.get("type") == "page":
            return target["webSocketDebuggerUrl"]
    raise RuntimeError(f"没有找到可用页面，请确认浏览器打开了 {TARGET_URL}")


class CdpSocket:
    # 🧠 这里手写了最小 WebSocket 客户端，只用 Python 标准库，不依赖 websocket-client。
    # 🔧 只实现 CDP 调用需要的文本帧发送/接收，够用且方便离线运行。
    def __init__(self, websocket_url: str):
        host, port, path = self._parse_url(websocket_url)
        self.sock = socket.create_connection((host, port), timeout=5)
        self._handshake(host, port, path)
        self.next_id = 1

    @staticmethod
    def _parse_url(url: str):
        # 🔍 CDP 返回的地址一般是 ws://127.0.0.1:9222/devtools/page/xxxx。
        if not url.startswith("ws://"):
            raise ValueError(f"不支持的 WebSocket 地址: {url}")
        without_scheme = url[len("ws://") :]
        host_port, path = without_scheme.split("/", 1)
        if ":" in host_port:
            host, port_text = host_port.rsplit(":", 1)
            port = int(port_text)
        else:
            host = host_port
            port = 80
        return host, port, "/" + path

    def _handshake(self, host: str, port: int, path: str) -> None:
        # 🤝 WebSocket 握手：按 RFC 6455 发送 Upgrade 请求。
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        self.sock.sendall(request.encode("ascii"))
        response = self.sock.recv(4096)
        if b" 101 " not in response.split(b"\r\n", 1)[0]:
            raise RuntimeError("WebSocket 握手失败")

    def call(self, method: str, params: dict | None = None):
        # 📡 CDP 请求格式：{"id": n, "method": "...", "params": {...}}。
        # 🧾 响应里会带同一个 id；收到其他事件消息时直接跳过。
        call_id = self.next_id
        self.next_id += 1
        payload = json.dumps(
            {"id": call_id, "method": method, "params": params or {}},
            separators=(",", ":"),
        ).encode("utf-8")
        self._send_frame(payload)

        while True:
            data = self._recv_frame()
            message = json.loads(data.decode("utf-8"))
            if message.get("id") != call_id:
                continue
            if "error" in message:
                raise RuntimeError(f"CDP 调用失败 {method}: {message['error']}")
            return message.get("result", {})

    def close(self) -> None:
        # 🧹 关闭 socket 时忽略系统级异常，避免清理阶段掩盖真正错误。
        try:
            self.sock.close()
        except OSError:
            pass

    def _send_frame(self, payload: bytes) -> None:
        # 📦 客户端发 WebSocket 帧必须 mask，这里手动构造最小文本帧。
        length = len(payload)
        header = bytearray([0x81])
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        mask = os.urandom(4)
        masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        self.sock.sendall(bytes(header) + mask + masked)

    def _recv_frame(self) -> bytes:
        # 📥 接收服务端文本帧。Chrome CDP 返回的一般是未 mask 的 JSON 文本帧。
        first = self._recv_exact(2)
        opcode = first[0] & 0x0F
        length = first[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self._recv_exact(8))[0]
        masked = bool(first[1] & 0x80)
        mask = self._recv_exact(4) if masked else b""
        payload = self._recv_exact(length)
        if masked:
            payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        if opcode == 0x8:
            raise RuntimeError("WebSocket 已关闭")
        return payload

    def _recv_exact(self, size: int) -> bytes:
        # 🧱 socket.recv 不保证一次拿满指定字节数，所以这里循环读满。
        chunks = bytearray()
        while len(chunks) < size:
            chunk = self.sock.recv(size - len(chunks))
            if not chunk:
                raise RuntimeError("WebSocket 连接中断")
            chunks.extend(chunk)
        return bytes(chunks)


def get_weibo_cookie(port: int) -> str:
    # 🍪 Cookie 读取流程：
    # 1. 找到微博页面的 CDP WebSocket 地址。
    # 2. 启用 Network 域。
    # 3. 调用 Network.getAllCookies 读取浏览器当前登录态。
    websocket_url = get_page_websocket_url(port)
    cdp = CdpSocket(websocket_url)
    try:
        cdp.call("Network.enable")
        result = cdp.call("Network.getAllCookies")
    finally:
        cdp.close()

    # 🧹 只保留 weibo.com 及其子域 Cookie，避免把其他站点 Cookie 混进去。
    cookies = [
        cookie
        for cookie in result.get("cookies", [])
        if cookie.get("domain", "").lstrip(".").endswith("weibo.com")
    ]
    if not cookies:
        raise RuntimeError("没有读到 weibo.com Cookie，请确认已经登录微博。")

    return "; ".join(f"{cookie['name']}={cookie['value']}" for cookie in cookies)


def main() -> int:
    # 🧰 命令行参数尽量保持简单：默认路径可直接运行，排障时再手动指定 browser/port/profile。
    parser = argparse.ArgumentParser(description="打开浏览器登录微博，并导出 weibo.com Cookie。")
    parser.add_argument("--browser", help="Chrome/Edge 可执行文件路径。")
    parser.add_argument("--port", type=int, default=9222, help="Chrome DevTools 调试端口。")
    parser.add_argument("--timeout", type=int, default=20, help="等待调试端口启动的秒数。")
    parser.add_argument(
        "--user-data-dir",
        default=str(SCRIPT_DIR / ".browser-profile"),
        help="浏览器用户数据目录。默认使用脚本同目录的隔离登录目录。",
    )
    args = parser.parse_args()

    # 🧾 每次运行清空旧日志，避免把上一次错误和本次错误混在一起看。
    LOG_PATH.write_text("", encoding="utf-8")
    log("脚本启动")
    print_banner()

    try:
        print_step(1, "🔎 查找可用浏览器")
        if args.browser:
            print_kv("指定路径", styled(args.browser, CYAN))
        else:
            print_default_browsers()
        browser = find_browser(args.browser)
        # 🗂️ 使用独立 profile，避免污染用户日常浏览器配置，也方便保留微博登录态。
        profile_dir = Path(args.user_data_dir).resolve()
        print(ok("  ✓ 已找到浏览器"))
        print_kv("浏览器", styled(browser, CYAN))

        print_step(2, "📁 准备隔离浏览器用户数据目录")
        profile_dir.mkdir(parents=True, exist_ok=True)
        print_kv("用户数据目录", styled(str(profile_dir), CYAN))

        command = [
            browser,
            f"--remote-debugging-port={args.port}",
            f"--user-data-dir={profile_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            TARGET_URL,
        ]
        # 🧭 只记录浏览器和 profile 路径，不记录 Cookie 内容。
        log(f"使用浏览器: {browser}")
        log(f"用户数据目录: {profile_dir}")

        print_step(3, "🚀 启动浏览器并打开微博页面")
        print_kv("目标页面", styled(TARGET_URL, CYAN))
        print_kv("调试端口", styled(str(args.port), CYAN))
        process = subprocess.Popen(command)
        print(info("  ⏳ 正在等待浏览器调试端口就绪..."))
        wait_for_debugger(args.port, args.timeout)
        open_new_tab(args.port, TARGET_URL)
        print(ok("  ✓ 浏览器已打开"))

        print_step(4, "🧭 请在浏览器里完成微博登录")
        print(warn("  请手动登录微博，并确认页面已打开游离博主主页。"))
        print(f"  {emphasis('登录完成后回到这里按 Enter。')} {hint('直接 Ctrl+C 可取消。')}")
        input()

        print_step(5, "🍪 读取 weibo.com Cookie")
        print(info("  正在通过本地 DevTools 读取 Cookie..."))
        cookie = get_weibo_cookie(args.port)
        # 🔐 只把 Cookie 写入 private 文件，不打印完整 Cookie，降低误复制风险。
        COOKIE_PATH.write_text(cookie, encoding="utf-8")
        log(f"Cookie 已保存: {COOKIE_PATH}")
        cookie_count = cookie.count(";") + 1 if cookie else 0
        print(ok("  ✓ Cookie 导出成功"))
        print_kv("Cookie 数量", styled(str(cookie_count), GREEN))
        print_kv("保存位置", styled(str(COOKIE_PATH), CYAN))
        print(warn("  ⚠ 这个文件包含登录凭据，不要发给别人，也不要提交到 Git。"))

        if process.poll() is None:
            print(hint("  浏览器保持打开。确认 Cookie 可用后可以手动关闭。"))
        print()
        return 0
    except KeyboardInterrupt:
        # 🛑 用户主动 Ctrl+C 取消时返回 130，符合常见终端约定。
        log("用户取消")
        print()
        print(warn("🛑 已取消。"))
        return 130
    except Exception as error:
        # 🧯 失败时终端只展示摘要，详细信息写入 latest.debug.log。
        log(f"错误: {type(error).__name__}: {error}")
        print()
        print(err(f"❌ 失败：{error}"))
        print_kv("调试日志", styled(str(LOG_PATH), CYAN))
        print(hint("  如果没有自动找到浏览器，可以使用 --browser 参数手动指定 Chrome / Edge 路径。"))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

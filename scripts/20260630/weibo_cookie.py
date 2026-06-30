import os
import json
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


SCRIPT_DIR = Path(__file__).resolve().parent
LOG_PATH = SCRIPT_DIR / "latest.debug.log"
COOKIE_PATH = SCRIPT_DIR / "weibo_cookie.private.txt"
TARGET_URL = "https://weibo.com/u/7360748659"

FALLBACK_BROWSER_PATHS = (
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
)


def log(message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG_PATH.open("a", encoding="utf-8") as file:
        file.write(f"[{timestamp}] {message}\n")


def find_browser(explicit_path: str | None) -> str:
    candidates = []
    if explicit_path:
        candidates.append(explicit_path)
    candidates.extend(FALLBACK_BROWSER_PATHS)

    for candidate in candidates:
        path = Path(candidate).expanduser()
        if path.is_file():
            return str(path)

    raise FileNotFoundError(
        "没有找到浏览器。请通过 --browser 指定 Chrome/Edge 路径。"
    )


def http_json(url: str):
    with urllib.request.urlopen(url, timeout=2) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_debugger(port: int, timeout: int) -> None:
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
    encoded = urllib.parse.quote(url, safe="")
    try:
        http_json(f"http://127.0.0.1:{port}/json/new?{encoded}")
    except urllib.error.HTTPError as error:
        log(f"打开新标签页接口不可用，已忽略: HTTP {error.code}")


def get_page_websocket_url(port: int) -> str:
    targets = http_json(f"http://127.0.0.1:{port}/json/list")
    for target in targets:
        if target.get("type") == "page" and "weibo.com" in target.get("url", ""):
            return target["webSocketDebuggerUrl"]
    for target in targets:
        if target.get("type") == "page":
            return target["webSocketDebuggerUrl"]
    raise RuntimeError(f"没有找到可用页面，请确认浏览器打开了 {TARGET_URL}")


class CdpSocket:
    def __init__(self, websocket_url: str):
        host, port, path = self._parse_url(websocket_url)
        self.sock = socket.create_connection((host, port), timeout=5)
        self._handshake(host, port, path)
        self.next_id = 1

    @staticmethod
    def _parse_url(url: str):
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
        try:
            self.sock.close()
        except OSError:
            pass

    def _send_frame(self, payload: bytes) -> None:
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
        chunks = bytearray()
        while len(chunks) < size:
            chunk = self.sock.recv(size - len(chunks))
            if not chunk:
                raise RuntimeError("WebSocket 连接中断")
            chunks.extend(chunk)
        return bytes(chunks)


def get_weibo_cookie(port: int) -> str:
    websocket_url = get_page_websocket_url(port)
    cdp = CdpSocket(websocket_url)
    try:
        cdp.call("Network.enable")
        result = cdp.call("Network.getAllCookies")
    finally:
        cdp.close()

    cookies = [
        cookie
        for cookie in result.get("cookies", [])
        if cookie.get("domain", "").lstrip(".").endswith("weibo.com")
    ]
    if not cookies:
        raise RuntimeError("没有读到 weibo.com Cookie，请确认已经登录微博。")

    return "; ".join(f"{cookie['name']}={cookie['value']}" for cookie in cookies)


def main() -> int:
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

    LOG_PATH.write_text("", encoding="utf-8")
    log("脚本启动")

    try:
        browser = find_browser(args.browser)
        profile_dir = Path(args.user_data_dir).resolve()
        profile_dir.mkdir(parents=True, exist_ok=True)
        command = [
            browser,
            f"--remote-debugging-port={args.port}",
            f"--user-data-dir={profile_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            TARGET_URL,
        ]
        log(f"使用浏览器: {browser}")
        log(f"用户数据目录: {profile_dir}")

        process = subprocess.Popen(command)
        wait_for_debugger(args.port, args.timeout)
        open_new_tab(args.port, TARGET_URL)

        print("浏览器已打开。请在浏览器里手动登录微博，并确认已打开游离博主主页。")
        print("登录完成后回到这里按 Enter；直接 Ctrl+C 可取消。")
        input()

        cookie = get_weibo_cookie(args.port)
        COOKIE_PATH.write_text(cookie, encoding="utf-8")
        log(f"Cookie 已保存: {COOKIE_PATH}")
        print(f"已保存 Cookie 到: {COOKIE_PATH}")
        print("这个文件包含登录凭据，不要发给别人，也不要提交到 Git。")

        if process.poll() is None:
            print("浏览器保持打开。确认 Cookie 可用后可以手动关闭。")
        return 0
    except KeyboardInterrupt:
        log("用户取消")
        print("已取消。")
        return 130
    except Exception as error:
        log(f"错误: {type(error).__name__}: {error}")
        print(f"失败：{error}")
        print(f"调试日志: {LOG_PATH}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

// ==UserScript==
// @name         Weibo Cookie Helper for sky-renwu-weibo
// @namespace    https://github.com/shuyeyun/sky-renwu-weibo
// @version      2026.07.09.1
// @description  在微博页面右下角显示当前 weibo.com Cookie，方便复制到 Koishi 插件 sky-renwu-weibo 的 weiboCookie 配置项。
// @author       sky-renwu-weibo
// @homepageURL  https://weibo.com/u/7360748659
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://m.weibo.cn/*
// @match        https://passport.weibo.com/*
// @match        https://login.sina.com.cn/*
// @grant        GM_cookie
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// @noframes
// ==/UserScript==

// 推荐先打开游离博主主页，登录后更容易确认微博账号状态是否正常。
// 推荐页面：https://weibo.com/u/7360748659

(function () {
  'use strict';

  const PANEL_ID = 'sky-renwu-weibo-cookie-helper';
  const COOKIE_DOMAINS = [
    'weibo.com',
    '.weibo.com',
    'www.weibo.com',
    '.www.weibo.com',
    'm.weibo.cn',
    '.m.weibo.cn',
    'passport.weibo.com',
    '.passport.weibo.com',
    'login.sina.com.cn',
    '.sina.com.cn',
  ];
  const COOKIE_URLS = [
    'https://weibo.com/',
    'https://www.weibo.com/',
    'https://weibo.com/u/7360748659',
    'https://m.weibo.cn/',
    'https://passport.weibo.com/',
    'https://login.sina.com.cn/',
  ];
  const REQUIRED_LOGIN_COOKIE_NAMES = ['SUB'];
  const IMPORTANT_COOKIE_NAMES = [
    'SUB',
    'SUBP',
    'SSOLoginState',
    'ALF',
    'SCF',
    'XSRF-TOKEN',
    'WBPSESS',
    'MLOGIN',
    'M_WEIBOCN_PARAMS',
  ];
  const AUTO_REFRESH_MS = 5000;

  let state = {
    cookieText: '',
    cookieSource: '',
    cookieCount: 0,
    importantFound: [],
    missingRequired: [],
    loginReady: false,
    lastUpdated: 0,
    collapsed: false,
  };

  initStyle();
  const panel = createPanel();
  document.documentElement.appendChild(panel.root);
  bindEvents(panel);
  refreshCookie(panel, { silent: false });
  window.setInterval(() => refreshCookie(panel, { silent: true }), AUTO_REFRESH_MS);

  function initStyle() {
    const css = `
#${PANEL_ID} {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2147483647;
  width: min(520px, calc(100vw - 36px));
  color: #1f2937;
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  letter-spacing: 0;
}
#${PANEL_ID}, #${PANEL_ID} * {
  box-sizing: border-box;
}
#${PANEL_ID} .srw-card {
  overflow: hidden;
  border: 1px solid rgba(31, 41, 55, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(10px);
}
#${PANEL_ID} .srw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(31, 41, 55, 0.10);
  background: #f8fafc;
}
#${PANEL_ID} .srw-title {
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${PANEL_ID} .srw-head-actions,
#${PANEL_ID} .srw-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
#${PANEL_ID} button {
  height: 30px;
  border: 1px solid rgba(31, 41, 55, 0.16);
  border-radius: 6px;
  padding: 0 10px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  cursor: pointer;
}
#${PANEL_ID} button:hover {
  background: #f3f4f6;
}
#${PANEL_ID} button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
#${PANEL_ID} button:disabled:hover {
  background: #ffffff;
}
#${PANEL_ID} button.srw-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}
#${PANEL_ID} button.srw-primary:hover {
  background: #1d4ed8;
}
#${PANEL_ID} .srw-body {
  padding: 12px;
}
#${PANEL_ID} .srw-meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  margin-bottom: 10px;
  color: #4b5563;
}
#${PANEL_ID} .srw-meta-line {
  min-width: 0;
  overflow-wrap: anywhere;
}
#${PANEL_ID} .srw-status {
  margin-top: 8px;
  min-height: 20px;
  color: #4b5563;
}
#${PANEL_ID} .srw-status[data-tone="ok"] {
  color: #047857;
}
#${PANEL_ID} .srw-status[data-tone="warn"] {
  color: #b45309;
}
#${PANEL_ID} .srw-status[data-tone="error"] {
  color: #b91c1c;
}
#${PANEL_ID} textarea {
  display: block;
  width: 100%;
  height: 112px;
  min-height: 112px;
  max-height: min(46vh, 420px);
  resize: vertical;
  overflow: auto;
  border: 1px solid rgba(31, 41, 55, 0.18);
  border-radius: 6px;
  padding: 9px 10px;
  background: #ffffff;
  color: #111827;
  font: 12px/1.45 Consolas, "SFMono-Regular", Menlo, monospace;
  letter-spacing: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
#${PANEL_ID} .srw-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 10px;
}
#${PANEL_ID}.srw-collapsed .srw-body {
  display: none;
}
#${PANEL_ID}.srw-collapsed {
  width: min(340px, calc(100vw - 36px));
}
@media (max-width: 560px) {
  #${PANEL_ID} {
    right: 10px;
    bottom: 10px;
    width: calc(100vw - 20px);
  }
  #${PANEL_ID} .srw-head {
    align-items: flex-start;
  }
  #${PANEL_ID} .srw-head-actions,
  #${PANEL_ID} .srw-actions {
    gap: 6px;
  }
  #${PANEL_ID} button {
    padding: 0 8px;
  }
}`;

    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createPanel() {
    const root = document.createElement('div');
    root.id = PANEL_ID;
    root.innerHTML = `
      <div class="srw-card">
        <div class="srw-head">
          <div class="srw-title">微博 Cookie 助手</div>
          <div class="srw-head-actions">
            <button type="button" data-action="refresh" title="重新读取 Cookie">刷新</button>
            <button type="button" data-action="toggle" title="收起或展开面板">收起</button>
          </div>
        </div>
        <div class="srw-body">
          <div class="srw-meta">
            <div class="srw-meta-line" data-role="source">读取方式：准备中</div>
            <div class="srw-meta-line" data-role="login">登录态：待检测</div>
            <div class="srw-meta-line" data-role="count">Cookie 数量：0</div>
            <div class="srw-meta-line" data-role="important">关键字段：待检测</div>
            <div class="srw-meta-line">用途：复制后填入 Koishi 插件配置项 weiboCookie</div>
          </div>
          <textarea data-role="cookie" spellcheck="false" wrap="soft" aria-label="微博 Cookie"></textarea>
          <div class="srw-actions">
            <button type="button" data-action="select">全选</button>
            <button type="button" class="srw-primary" data-action="copy">复制 Cookie</button>
          </div>
          <div class="srw-status" data-role="status"></div>
        </div>
      </div>
    `;

    return {
      root,
      source: root.querySelector('[data-role="source"]'),
      login: root.querySelector('[data-role="login"]'),
      count: root.querySelector('[data-role="count"]'),
      important: root.querySelector('[data-role="important"]'),
      textarea: root.querySelector('[data-role="cookie"]'),
      status: root.querySelector('[data-role="status"]'),
      toggle: root.querySelector('[data-action="toggle"]'),
    };
  }

  function bindEvents(panel) {
    panel.root.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const action = button.getAttribute('data-action');
      if (action === 'refresh') {
        await refreshCookie(panel, { silent: false });
      } else if (action === 'select') {
        selectCookie(panel);
      } else if (action === 'copy') {
        await copyCookie(panel);
      } else if (action === 'toggle') {
        togglePanel(panel);
      }
    });

    panel.textarea.addEventListener('focus', () => {
      panel.textarea.select();
    });
  }

  async function refreshCookie(panel, options) {
    const previous = state.cookieText;
    try {
      const result = await readWeiboCookies();
      state = {
        ...state,
        cookieText: result.cookieText,
        cookieSource: result.source,
        cookieCount: result.cookieCount,
        importantFound: result.importantFound,
        missingRequired: result.missingRequired,
        loginReady: result.loginReady,
        lastUpdated: Date.now(),
      };
      render(panel);

      if (!state.cookieText) {
        setStatus(panel, '没有读到微博 Cookie，请确认当前页面已经登录微博。', 'warn');
        return;
      }

      if (!state.loginReady) {
        const missing = state.missingRequired.length ? state.missingRequired.join(', ') : 'SUB';
        setStatus(panel, `当前缺少 ${missing}，这不是完整登录 Cookie。请先登录微博；如果登录后仍缺少，说明当前脚本只能读到页面可见 Cookie。`, 'warn');
        return;
      }

      if (previous !== state.cookieText || !options.silent) {
        const names = state.importantFound.length ? state.importantFound.join(', ') : '未发现关键登录字段';
        setStatus(panel, `已读取完整登录 Cookie，可复制。关键字段：${names}`, 'ok');
      }
    } catch (error) {
      render(panel);
      setStatus(panel, `读取失败：${error && error.message ? error.message : String(error)}`, 'error');
    }
  }

  async function readWeiboCookies() {
    if (typeof GM_cookie !== 'undefined' && GM_cookie && typeof GM_cookie.list === 'function') {
      const cookies = await listCookiesByGmCookie();
      if (cookies.length) {
        return buildCookieResult(cookies, 'Tampermonkey GM_cookie');
      }
    }

    const cookies = parseDocumentCookie(document.cookie);
    return buildCookieResult(cookies, 'document.cookie');
  }

  async function listCookiesByGmCookie() {
    const map = new Map();
    const queries = [
      ...COOKIE_URLS.map((url) => ({ url })),
      ...COOKIE_DOMAINS.map((domain) => ({ domain })),
      { url: location.href },
    ];
    for (const details of queries) {
      const cookies = await gmCookieList(details).catch(() => []);
      for (const cookie of cookies) {
        if (!cookie || !cookie.name) continue;
        const normalizedDomain = String(cookie.domain || details.domain || location.hostname);
        if (!isWeiboRelatedDomain(normalizedDomain)) continue;
        map.set(`${cookie.name}\n${normalizedDomain}\n${cookie.path || '/'}`, {
          name: cookie.name,
          value: cookie.value || '',
          domain: normalizedDomain,
          path: cookie.path || '/',
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aImportant = IMPORTANT_COOKIE_NAMES.includes(a.name) ? 0 : 1;
      const bImportant = IMPORTANT_COOKIE_NAMES.includes(b.name) ? 0 : 1;
      if (aImportant !== bImportant) return aImportant - bImportant;
      return a.name.localeCompare(b.name);
    });
  }

  function gmCookieList(details) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (cookies, error) => {
        if (settled) return;
        settled = true;
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve(Array.isArray(cookies) ? cookies : []);
      };

      try {
        const result = GM_cookie.list(details, done);
        if (result && typeof result.then === 'function') {
          result.then((cookies) => done(cookies), (error) => {
            if (settled) return;
            settled = true;
            reject(error);
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function parseDocumentCookie(cookieText) {
    return String(cookieText || '')
      .split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf('=');
        if (index < 0) return null;
        return {
          name: pair.slice(0, index).trim(),
          value: pair.slice(index + 1).trim(),
          domain: location.hostname,
          path: '/',
        };
      })
      .filter((cookie) => cookie && cookie.name);
  }

  function buildCookieResult(cookies, source) {
    const byName = new Map();
    for (const cookie of cookies) {
      if (!cookie || !cookie.name) continue;
      byName.set(cookie.name, cookie.value || '');
    }

    const ordered = Array.from(byName.entries()).sort(([a], [b]) => {
      const aImportant = IMPORTANT_COOKIE_NAMES.includes(a) ? 0 : 1;
      const bImportant = IMPORTANT_COOKIE_NAMES.includes(b) ? 0 : 1;
      if (aImportant !== bImportant) return aImportant - bImportant;
      return a.localeCompare(b);
    });
    const cookieText = ordered.map(([name, value]) => `${name}=${value}`).join('; ');
    const importantFound = IMPORTANT_COOKIE_NAMES.filter((name) => byName.has(name));
    const missingRequired = REQUIRED_LOGIN_COOKIE_NAMES.filter((name) => !byName.has(name) || !String(byName.get(name) || '').trim());
    const loginReady = missingRequired.length === 0;

    return {
      cookieText,
      source,
      cookieCount: ordered.length,
      importantFound,
      missingRequired,
      loginReady,
    };
  }

  function isWeiboRelatedDomain(domain) {
    const normalized = String(domain || '').replace(/^\./, '').toLowerCase();
    return normalized === 'weibo.com'
      || normalized.endsWith('.weibo.com')
      || normalized === 'weibo.cn'
      || normalized.endsWith('.weibo.cn')
      || normalized === 'sina.com.cn'
      || normalized.endsWith('.sina.com.cn');
  }

  function render(panel) {
    panel.textarea.value = state.cookieText;
    panel.source.textContent = `读取方式：${state.cookieSource || '准备中'}`;
    panel.login.textContent = state.loginReady
      ? '登录态：已检测到 SUB，可用于插件'
      : `登录态：不完整，缺少 ${state.missingRequired.length ? state.missingRequired.join(', ') : 'SUB'}`;
    panel.count.textContent = `Cookie 数量：${state.cookieCount}`;
    panel.important.textContent = `关键字段：${state.importantFound.length ? state.importantFound.join(', ') : '未发现 SUB / SUBP 等登录字段'}`;
  }

  function selectCookie(panel) {
    panel.textarea.focus();
    panel.textarea.select();
    setStatus(panel, '已全选 Cookie，可以 Ctrl+C 复制。', 'ok');
  }

  async function copyCookie(panel) {
    if (!state.cookieText) {
      setStatus(panel, '当前没有可复制的 Cookie，请先登录微博或点击刷新。', 'warn');
      return;
    }
    if (!state.loginReady) {
      setStatus(panel, '缺少 SUB，未复制。登录后刷新；如果仍缺少 SUB，这就是浏览器脚本读取 HttpOnly Cookie 的限制，请继续用 Python/CDP 脚本导出。', 'warn');
      return;
    }

    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(state.cookieText, 'text');
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(state.cookieText);
      } else {
        panel.textarea.focus();
        panel.textarea.select();
        document.execCommand('copy');
      }
      setStatus(panel, '已复制 Cookie，可以粘贴到 Koishi 配置项 weiboCookie。', 'ok');
    } catch (error) {
      panel.textarea.focus();
      panel.textarea.select();
      setStatus(panel, '自动复制失败，已全选 Cookie，请手动 Ctrl+C。', 'warn');
    }
  }

  function togglePanel(panel) {
    state.collapsed = !state.collapsed;
    panel.root.classList.toggle('srw-collapsed', state.collapsed);
    panel.toggle.textContent = state.collapsed ? '展开' : '收起';
  }

  function setStatus(panel, message, tone) {
    const time = new Date().toLocaleTimeString();
    panel.status.textContent = `${message}（${time}）`;
    panel.status.setAttribute('data-tone', tone || '');
  }
})();

import axios, { AxiosInstance } from 'axios'
import type { Context } from 'koishi'
import { WEIBO_ACCESS_MODE, type Config } from './config'
import { logInfo } from './utils/logger'

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const TASK_DATE_RE = /(?:^|\D)(\d{1,2})(?:[-/.]|月)(\d{1,2})(?:日)?\s*(?:每日)?任务/

type WeiboAccessRoute = 'cookie' | 'guest'
type WeiboListSource = 'mymblog' | 'waterfall' | 'mobile-container'

const WEIBO_DEBUG_LOGGERS = new WeakMap<AxiosInstance, (message: string) => void>()

interface WeiboImageVariant {
  url?: string
}

interface WeiboPictureUrls {
  large?: WeiboImageVariant
  original?: WeiboImageVariant
  largest?: WeiboImageVariant
  mw2000?: WeiboImageVariant
  mw1024?: WeiboImageVariant
  mw960?: WeiboImageVariant
  mw690?: WeiboImageVariant
  bmiddle?: WeiboImageVariant
  thumbnail?: WeiboImageVariant
  [key: string]: WeiboImageVariant | string | undefined
}

interface WeiboRawPost {
  id?: string | number
  idstr?: string | number
  mid?: string | number
  mblogid?: string
  bid?: string
  text_raw?: string
  text?: string
  longTextContent_raw?: string
  longTextContent?: string
  created_at?: string
  pic_infos?: Record<string, WeiboPictureUrls>
  pic_ids?: string[]
  pics?: WeiboPictureUrls[]
  mix_media_info?: {
    items?: Array<{ data?: WeiboPictureUrls }>
  }
  isLongText?: boolean
}

interface WeiboPost {
  id: string
  mblogid: string
  textRaw: string
  createdAt: Date
  url: string
  imageUrls: string[]
  isLongText: boolean
}

interface DailyFetchAttempt {
  result: DailyResult
  matched: boolean
  source: WeiboListSource
}

export interface DailyResult {
  text: string
  imageUrls: string[]
  imageBuffers: Buffer[]
  sourceUrl?: string
  fetchedAt: number
}

class CookieStore {
  private readonly values = new Map<string, string>()

  constructor(cookieString = '') {
    this.addCookieString(cookieString)
  }

  get size() {
    return this.values.size
  }

  get names() {
    return Array.from(this.values.keys()).join(',') || '(empty)'
  }

  addCookieString(cookieString: string) {
    for (const chunk of cookieString.split(';')) {
      const pair = chunk.trim()
      if (!pair || !pair.includes('=')) continue
      const [name, ...valueParts] = pair.split('=')
      const value = valueParts.join('=')
      if (!name.trim()) continue
      this.values.set(name.trim(), value.trim())
    }
  }

  addSetCookieHeader(setCookie: unknown) {
    if (!setCookie) return
    const headers = Array.isArray(setCookie) ? setCookie : [setCookie]
    for (const header of headers) {
      if (typeof header !== 'string') continue
      const pair = header.split(';', 1)[0]
      this.addCookieString(pair)
    }
  }

  toHeader() {
    return Array.from(this.values.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }
}

export function createWeiboClient(config: Config) {
  if (!config.weiboCookie.trim()) {
    throw new Error('请先在插件配置中填写微博 Cookie，或把微博访问策略改为允许无登录用户态。')
  }

  return createAxiosClient(config, config.weiboCookie)
}

export async function fetchChineseServerDaily(
  ctx: Context,
  config: Config,
): Promise<DailyResult> {
  const routes = resolveAccessRoutes(config)
  const errors: string[] = []
  let noMatchResult: DailyResult | undefined

  logInfo(ctx, config, '', `微博访问策略开始: mode=${config.weiboAccessMode}, routes=${routes.join(' -> ')}, hasCookie=${Boolean(config.weiboCookie.trim())}, uid=${config.uid}, timeout=${config.requestTimeout}, matchPattern=${config.matchPattern}`)

  for (const route of routes) {
    if (route === 'cookie' && !config.weiboCookie.trim()) {
      const message = '未配置 weiboCookie，跳过 Cookie 登录态'
      if (config.weiboAccessMode === WEIBO_ACCESS_MODE.COOKIE_ONLY) {
        errors.push('Cookie 登录态不可用：请先填写 weiboCookie')
      } else {
        logInfo(ctx, config, '', message)
      }
      continue
    }

    try {
      const client = route === 'cookie'
        ? createWeiboClient(config)
        : await createGuestWeiboClient(ctx, config)
      const attempt = await fetchDailyByClient(ctx, client, config, route)
      logInfo(ctx, config, '', `微博访问完成: route=${route}, source=${attempt.source}, matched=${attempt.matched}`)

      if (attempt.matched) return attempt.result
      noMatchResult ||= attempt.result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${routeLabel(route)}：${message}`)
      logInfo(ctx, config, '', `微博访问失败，将按策略尝试下一链路: route=${route}, error=${message}`)
    }
  }

  if (noMatchResult) return noMatchResult

  if (errors.length) {
    throw new Error(`微博请求失败：${errors.join('；')}`)
  }

  throw new Error('微博请求失败：没有可用的微博访问链路。')
}

async function fetchDailyByClient(
  ctx: Context,
  client: AxiosInstance,
  config: Config,
  route: WeiboAccessRoute,
): Promise<DailyFetchAttempt> {
  setWeiboDebugLogger(client, ctx, config)
  const { posts, source } = await fetchUserPosts(client, config.uid, route)
  logInfo(ctx, config, '', `微博列表拉取完成: route=${route}, source=${source}, count=${posts.length}`)

  const pattern = new RegExp(config.matchPattern)
  logPostMatchSamples(ctx, config, posts, pattern, route, source)
  const post = posts.find((item) => isDailyTaskPost(item, pattern))

  if (!post) {
    logInfo(ctx, config, '', `未匹配到今日每日任务微博: route=${route}, source=${source}`)
    return {
      matched: false,
      source,
      result: {
        text: '【🌏 国服】今日任务还未更新',
        imageUrls: [],
        imageBuffers: [],
        fetchedAt: Date.now(),
      },
    }
  }

  logInfo(ctx, config, '', `匹配到每日任务微博: route=${route}, source=${source}, mblogid=${post.mblogid}, id=${post.id}, imageUrls=${post.imageUrls.length}, url=${post.url}`)
  const longText = await fetchLongText(client, post, config.uid)
  logInfo(ctx, config, '', `微博长文拉取完成: hasLongText=${Boolean(longText)}, length=${(longText || '').length}`)
  const imageBuffers = await fetchImages(ctx, client, config, post.imageUrls)
  logInfo(ctx, config, '', `微博图片下载完成: success=${imageBuffers.length}, total=${post.imageUrls.length}`)
  const text = [
    longText || post.textRaw || '【🌏 国服】今日任务还未更新',
    '------------',
    `【📡 数据来源：微博@${config.authorName}】`,
    `原文链接：${post.url}`,
  ].join('\n')

  return {
    matched: true,
    source,
    result: {
      text,
      imageUrls: post.imageUrls,
      imageBuffers,
      sourceUrl: post.url,
      fetchedAt: Date.now(),
    },
  }
}

function createAxiosClient(config: Config, cookie: string | CookieStore = '') {
  const cookieText = typeof cookie === 'string' ? cookie : cookie.toHeader()
  const headers: Record<string, string> = {
    'user-agent': config.userAgent,
    referer: `https://www.weibo.com/u/${config.uid}`,
    'client-version': '3.0.0',
    'sec-ch-ua': '"Microsoft Edge";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    'sec-ch-ua-platform': '"Windows"',
  }
  if (cookieText.trim()) {
    headers.cookie = cookieText.trim()
  }

  const client = axios.create({
    timeout: config.requestTimeout,
    responseType: 'json',
    validateStatus: () => true,
    headers,
  })

  if (cookie instanceof CookieStore) {
    client.interceptors.request.use((request) => {
      const currentCookie = cookie.toHeader()
      if (!currentCookie) return request

      const requestHeaders = request.headers as { set?: (name: string, value: string) => void, cookie?: string }
      if (typeof requestHeaders.set === 'function') {
        requestHeaders.set('cookie', currentCookie)
      } else {
        requestHeaders.cookie = currentCookie
      }
      return request
    })
    client.interceptors.response.use((response) => {
      cookie.addSetCookieHeader(response.headers?.['set-cookie'])
      return response
    })
  }

  return client
}

async function createGuestWeiboClient(ctx: Context, config: Config) {
  const store = new CookieStore()
  logInfo(ctx, config, '', '开始初始化无登录游客态 Cookie')
  await applyDesktopVisitorCookies(ctx, config, store)
  await applyMobileVisitorCookies(ctx, config, store)

  const cookie = store.toHeader()
  logInfo(ctx, config, '', cookie
    ? `无登录游客 Cookie 准备完成: cookieCount=${store.size}, cookieNames=${store.names}`
    : '未获取到游客 Cookie，将直接访问微博公开接口')

  return createAxiosClient(config, store)
}

async function applyDesktopVisitorCookies(ctx: Context, config: Config, store: CookieStore) {
  const targetUrl = `https://weibo.com/u/${config.uid}`
  const visitorUrl = [
    'https://passport.weibo.com/visitor/visitor',
    `?entry=miniblog&a=enter&url=${encodeURIComponent(targetUrl)}`,
    `&domain=weibo.com&ua=${encodeURIComponent(config.userAgent)}`,
    `&_rand=${Date.now() / 1000}&sudaref=`,
  ].join('')

  try {
    const response = await axios.get(visitorUrl, {
      timeout: config.requestTimeout,
      responseType: 'text',
      validateStatus: () => true,
      headers: { 'user-agent': config.userAgent },
    })
    store.addSetCookieHeader(response.headers['set-cookie'])

    const requestId = /var request_id = "([^"]+)"/.exec(String(response.data))?.[1]
    logInfo(ctx, config, '', `桌面游客态 visitor: status=${response.status}, hasRequestId=${Boolean(requestId)}, cookieCount=${store.size}, cookieNames=${store.names}`)
    if (!requestId) return

    const form = new URLSearchParams({
      cb: 'visitor_gray_callback',
      ver: '20250916',
      request_id: requestId,
      tid: '',
      from: 'weibo',
      webdriver: 'false',
      rid: String(Date.now()),
      return_url: targetUrl,
    })
    const genResponse = await axios.post('https://passport.weibo.com/visitor/genvisitor2', form.toString(), {
      timeout: config.requestTimeout,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        'user-agent': config.userAgent,
        referer: visitorUrl,
        cookie: store.toHeader(),
        'content-type': 'application/x-www-form-urlencoded',
      },
    })
    store.addSetCookieHeader(genResponse.headers['set-cookie'])

    const payloadText = /visitor_gray_callback\((\{.*\})\)\s*;?\s*$/s.exec(String(genResponse.data))?.[1]
    logInfo(ctx, config, '', `桌面游客态 genvisitor2: status=${genResponse.status}, hasPayload=${Boolean(payloadText)}, cookieCount=${store.size}, cookieNames=${store.names}`)
    if (!payloadText) return

    const payload = JSON.parse(payloadText)
    logInfo(ctx, config, '', `桌面游客态 genvisitor2 payload: retcode=${payload?.retcode}, hasSub=${Boolean(payload?.data?.sub)}, hasSubp=${Boolean(payload?.data?.subp)}`)
    if (Number(payload?.retcode || 0) !== 20000000) return

    const sub = String(payload?.data?.sub || '')
    const subp = String(payload?.data?.subp || '')
    if (!sub || !subp) return

    const crossdomainUrl = [
      'https://login.sina.com.cn/visitor/visitor',
      `?a=crossdomain&s=${encodeURIComponent(sub)}&sp=${encodeURIComponent(subp)}`,
      `&from=weibo&_rand=${Date.now() / 1000}&entry=miniblog&url=${encodeURIComponent(targetUrl)}`,
    ].join('')
    const crossdomainResponse = await axios.get(crossdomainUrl, {
      timeout: config.requestTimeout,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        'user-agent': config.userAgent,
        referer: visitorUrl,
        cookie: store.toHeader(),
      },
    })
    store.addSetCookieHeader(crossdomainResponse.headers['set-cookie'])
    logInfo(ctx, config, '', `桌面游客态 crossdomain: status=${crossdomainResponse.status}, cookieCount=${store.size}, cookieNames=${store.names}`)
  } catch (error) {
    logInfo(ctx, config, '', `微博桌面游客态初始化失败，继续尝试公开接口: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function applyMobileVisitorCookies(ctx: Context, config: Config, store: CookieStore) {
  const targetUrl = getMobileTargetUrl(config.uid)
  const visitorUrl = [
    'https://visitor.passport.weibo.cn/visitor/visitor',
    `?entry=sinawap&a=enter&url=${encodeURIComponent(targetUrl)}`,
    `&domain=.weibo.cn&sudaref=&ua=php-sso_sdk_client-0.6.36&_rand=${Date.now() / 1000}`,
  ].join('')

  try {
    const response = await axios.get(visitorUrl, {
      timeout: config.requestTimeout,
      responseType: 'text',
      validateStatus: () => true,
      headers: { 'user-agent': MOBILE_UA, cookie: store.toHeader() },
    })
    store.addSetCookieHeader(response.headers['set-cookie'])

    const requestId = /var request_id = "([^"]+)"/.exec(String(response.data))?.[1]
    logInfo(ctx, config, '', `移动游客态 visitor: status=${response.status}, hasRequestId=${Boolean(requestId)}, cookieCount=${store.size}, cookieNames=${store.names}`)
    if (!requestId) return

    const form = new URLSearchParams({
      cb: 'visitor_gray_callback',
      ver: '20250916',
      request_id: requestId,
      tid: '',
      from: 'weibo',
      webdriver: 'false',
      rid: String(Date.now()),
      return_url: targetUrl,
    })
    const genResponse = await axios.post('https://visitor.passport.weibo.cn/visitor/genvisitor2', form.toString(), {
      timeout: config.requestTimeout,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        'user-agent': MOBILE_UA,
        referer: visitorUrl,
        cookie: store.toHeader(),
        'content-type': 'application/x-www-form-urlencoded',
      },
    })
    store.addSetCookieHeader(genResponse.headers['set-cookie'])
    const payloadText = /visitor_gray_callback\((\{.*\})\)\s*;?\s*$/s.exec(String(genResponse.data))?.[1]
    let retcode = ''
    try {
      retcode = payloadText ? String(JSON.parse(payloadText)?.retcode ?? '') : ''
    } catch {}
    logInfo(ctx, config, '', `移动游客态 genvisitor2: status=${genResponse.status}, retcode=${retcode || '(unknown)'}, cookieCount=${store.size}, cookieNames=${store.names}`)

    const warmupResponse = await axios.get(targetUrl, {
      timeout: config.requestTimeout,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        'user-agent': MOBILE_UA,
        referer: 'https://m.weibo.cn/',
        cookie: store.toHeader(),
      },
    })
    store.addSetCookieHeader(warmupResponse.headers['set-cookie'])
    logInfo(ctx, config, '', `移动游客态 warmup: status=${warmupResponse.status}, cookieCount=${store.size}, cookieNames=${store.names}`)
  } catch (error) {
    logInfo(ctx, config, '', `微博移动游客态初始化失败，继续尝试公开接口: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function resolveAccessRoutes(config: Config): WeiboAccessRoute[] {
  switch (config.weiboAccessMode) {
    case WEIBO_ACCESS_MODE.COOKIE_ONLY:
      return ['cookie']
    case WEIBO_ACCESS_MODE.GUEST_ONLY:
      return ['guest']
    case WEIBO_ACCESS_MODE.COOKIE_THEN_GUEST:
      return ['cookie', 'guest']
    case WEIBO_ACCESS_MODE.GUEST_THEN_COOKIE:
    default:
      return ['guest', 'cookie']
  }
}

function routeLabel(route: WeiboAccessRoute) {
  return route === 'cookie' ? 'Cookie 登录态' : '无登录用户态'
}

function setWeiboDebugLogger(client: AxiosInstance, ctx: Context, config: Config) {
  WEIBO_DEBUG_LOGGERS.set(client, (message) => logInfo(ctx, config, '', message))
}

function logWeiboDebug(client: AxiosInstance, message: string) {
  WEIBO_DEBUG_LOGGERS.get(client)?.(message)
}

async function fetchUserPosts(
  client: AxiosInstance,
  uid: string,
  route: WeiboAccessRoute,
): Promise<{ posts: WeiboPost[], source: WeiboListSource }> {
  const sources: WeiboListSource[] = route === 'guest'
    ? ['mobile-container', 'mymblog', 'waterfall']
    : ['mymblog', 'waterfall', 'mobile-container']
  const errors: string[] = []

  for (const source of sources) {
    try {
      logWeiboDebug(client, `开始尝试微博列表接口: source=${source}, uid=${uid}`)
      const posts = await fetchPostsBySource(client, uid, source)
      logWeiboDebug(client, `微博列表接口完成: source=${source}, count=${posts.length}`)
      if (posts.length) return { posts, source }
      errors.push(`${source} 返回空列表`)
    } catch (error) {
      errors.push(`${source} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`微博列表接口均不可用：${errors.join('；')}`)
}

async function fetchPostsBySource(client: AxiosInstance, uid: string, source: WeiboListSource) {
  if (source === 'mobile-container') return fetchPostsMobileContainer(client, uid)
  if (source === 'waterfall') return fetchPostsWaterfall(client, uid)
  return fetchPostsMymblog(client, uid)
}

async function fetchPostsMymblog(client: AxiosInstance, uid: string): Promise<WeiboPost[]> {
  const response = await client.get('https://weibo.com/ajax/statuses/mymblog', {
    params: { uid, page: 0, feature: 0 },
    headers: {
      'x-requested-with': 'XMLHttpRequest',
      accept: 'application/json, text/plain, */*',
      referer: `https://weibo.com/u/${uid}`,
    },
  })
  if (response.status === 403) return []
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = response.data
  logWeiboDebug(client, `mymblog 响应: status=${response.status}, ok=${data?.ok}, listCount=${Array.isArray(data?.data?.list) ? data.data.list.length : '(none)'}`)
  if (data?.ok === 0 && /登录|login/i.test(String(data?.message || data?.msg || ''))) {
    return []
  }
  if (data?.ok !== 1) {
    throw new Error(data?.msg || data?.message || '微博列表接口返回异常')
  }

  const list = data?.data?.list
  if (!Array.isArray(list)) return []

  return normalizePosts(list, uid)
}

async function fetchPostsWaterfall(client: AxiosInstance, uid: string): Promise<WeiboPost[]> {
  const response = await client.get('https://weibo.com/ajax/profile/getWaterFallContent', {
    params: { uid },
    headers: {
      'x-requested-with': 'XMLHttpRequest',
      accept: 'application/json, text/plain, */*',
      referer: `https://weibo.com/u/${uid}`,
    },
  })
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}`)
  }

  const list = response.data?.data?.list
  logWeiboDebug(client, `waterfall 响应: status=${response.status}, listCount=${Array.isArray(list) ? list.length : '(none)'}`)
  if (!Array.isArray(list)) return []

  return normalizePosts(list, uid)
}

async function fetchPostsMobileContainer(client: AxiosInstance, uid: string): Promise<WeiboPost[]> {
  const containerid = await fetchMobileTimelineContainerid(client, uid)
  const targetUrl = getMobileTargetUrl(uid)
  const response = await client.get('https://m.weibo.cn/api/container/getIndex', {
    params: {
      type: 'uid',
      value: uid,
      containerid,
    },
    headers: {
      'user-agent': MOBILE_UA,
      accept: 'application/json, text/plain, */*',
      referer: targetUrl,
    },
  })
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}`)
  }
  if (Number(response.data?.ok || 0) !== 1) return []

  const cards = response.data?.data?.cards
  logWeiboDebug(client, `mobile-container 响应: status=${response.status}, ok=${response.data?.ok}, containerid=${containerid}, cards=${Array.isArray(cards) ? cards.length : '(none)'}`)
  if (!Array.isArray(cards)) return []

  const posts = cards
    .map((card) => card?.mblog)
    .filter((post): post is WeiboRawPost => Boolean(post && typeof post === 'object'))

  return normalizePosts(posts, uid)
}

async function fetchMobileTimelineContainerid(client: AxiosInstance, uid: string) {
  const fallback = `107603${uid}`
  const targetUrl = getMobileTargetUrl(uid)
  try {
    const response = await client.get('https://m.weibo.cn/api/container/getIndex', {
      params: { type: 'uid', value: uid },
      headers: {
        'user-agent': MOBILE_UA,
        accept: 'application/json, text/plain, */*',
        referer: targetUrl,
      },
    })
    if (response.status !== 200 || Number(response.data?.ok || 0) !== 1) return fallback

    const tabs = response.data?.data?.tabsInfo?.tabs
    logWeiboDebug(client, `mobile containerid 响应: status=${response.status}, ok=${response.data?.ok}, tabs=${Array.isArray(tabs) ? tabs.length : '(none)'}`)
    if (!Array.isArray(tabs)) return fallback

    const candidates = tabs
      .map((tab) => {
        const containerid = String(tab?.containerid || '').trim()
        if (!containerid) return undefined

        const title = String(tab?.title || tab?.name || '')
        const tabType = String(tab?.tab_type || tab?.tabKey || tab?.type || '').toLowerCase()
        let score = 0
        if (containerid === fallback) score += 100
        if (containerid.startsWith('107603')) score += 20
        if (containerid.includes(uid)) score += 10
        if (title.includes('微博') || ['weibo', 'profile'].includes(tabType)) score += 5

        return { containerid, score }
      })
      .filter((item): item is { containerid: string, score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score)

    const selected = candidates[0]?.containerid || fallback
    logWeiboDebug(client, `mobile containerid 选择: selected=${selected}, fallback=${fallback}, candidates=${candidates.map((item) => `${item.containerid}:${item.score}`).join(',') || '(empty)'}`)
    return selected
  } catch {
    return fallback
  }
}

async function fetchLongText(client: AxiosInstance, post: WeiboPost, uid: string) {
  const statusId = post.id || post.mblogid

  if (statusId) {
    const mobileText = await fetchMobileLongText(client, statusId)
    if (mobileText) return mobileText
  }

  const desktopId = post.mblogid || post.id
  if (!desktopId) return ''

  const response = await client.get('https://weibo.com/ajax/statuses/longtext', {
    params: { id: desktopId },
    headers: {
      'x-requested-with': 'XMLHttpRequest',
      accept: 'application/json, text/plain, */*',
      referer: `https://weibo.com/u/${uid}`,
    },
  })
  if (response.status !== 200 || response.data?.ok !== 1) {
    return ''
  }

  return extractBestText(response.data?.data || {})
}

async function fetchMobileLongText(client: AxiosInstance, statusId: string) {
  try {
    const response = await client.get('https://m.weibo.cn/statuses/extend', {
      params: { id: statusId },
      headers: {
        'user-agent': MOBILE_UA,
        accept: 'application/json, text/plain, */*',
        referer: `https://m.weibo.cn/status/${statusId}`,
      },
    })
    if (response.status !== 200) return ''
    return extractBestText(response.data?.data || {})
  } catch {
    return ''
  }
}

async function fetchImages(
  ctx: Context,
  client: AxiosInstance,
  config: Config,
  urls: string[],
) {
  const results = await Promise.allSettled(urls.map(async (url) => {
    const response = await client.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      headers: { referer: 'https://weibo.com/' },
    })
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`)
    }
    return Buffer.from(response.data)
  }))

  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value]
    logInfo(ctx, config, `微博图片下载失败，已跳过第 ${index + 1} 张: ${result.reason}`)
    return []
  })
}

function normalizePosts(posts: WeiboRawPost[], uid: string): WeiboPost[] {
  const seen = new Set<string>()
  const normalized: WeiboPost[] = []

  for (const post of posts) {
    const id = String(post.idstr || post.id || post.mid || '').trim()
    const mblogid = String(post.mblogid || post.bid || post.idstr || post.id || '').trim()
    const key = id || mblogid
    if (!key || seen.has(key)) continue
    seen.add(key)

    normalized.push({
      id,
      mblogid,
      textRaw: extractBestText(post),
      createdAt: parseWeiboDate(String(post.created_at || '')),
      url: `https://www.weibo.com/${uid}/${mblogid || id}`,
      imageUrls: parseImageUrls(post),
      isLongText: Boolean(post.isLongText),
    })
  }

  return normalized
}

function logPostMatchSamples(
  ctx: Context,
  config: Config,
  posts: WeiboPost[],
  pattern: RegExp,
  route: WeiboAccessRoute,
  source: WeiboListSource,
) {
  const samples = posts.slice(0, 5).map((post, index) => {
    const configuredPatternMatched = matchesConfiguredPattern(post.textRaw, pattern)
    const taskDate = extractTaskDateFromText(post.textRaw, post.createdAt)
    const taskDateMatched = taskDate === formatBeijingDate(new Date())
    return [
      `#${index + 1}`,
      `id=${post.id || '(empty)'}`,
      `mblogid=${post.mblogid || '(empty)'}`,
      `created=${Number.isNaN(post.createdAt.getTime()) ? '(invalid)' : post.createdAt.toISOString()}`,
      `beijingDay=${formatBeijingDate(post.createdAt)}`,
      `isToday=${isTodayInBeijing(post.createdAt)}`,
      `pattern=${configuredPatternMatched}`,
      `taskDate=${taskDate || '(none)'}`,
      `taskDateToday=${taskDateMatched}`,
      `matched=${isDailyTaskPost(post, pattern)}`,
      `images=${post.imageUrls.length}`,
      `text="${previewText(post.textRaw)}"`,
    ].join(' ')
  })
  logInfo(ctx, config, '', samples.length
    ? `微博匹配样本: route=${route}, source=${source}; ${samples.join(' | ')}`
    : `微博匹配样本: route=${route}, source=${source}; (empty)`)
}

function isDailyTaskPost(post: WeiboPost, pattern: RegExp) {
  if (!isTodayInBeijing(post.createdAt)) return false
  if (matchesConfiguredPattern(post.textRaw, pattern)) return true

  const taskDate = extractTaskDateFromText(post.textRaw, post.createdAt)
  return taskDate === formatBeijingDate(new Date())
}

function matchesConfiguredPattern(text: string, pattern: RegExp) {
  pattern.lastIndex = 0
  return pattern.test(text)
}

function extractTaskDateFromText(text: string, reference: Date) {
  const match = TASK_DATE_RE.exec(text)
  if (!match) return ''

  const now = new Date()
  const ref = Number.isNaN(reference.getTime()) ? now : reference
  const month = Number(match[1])
  const day = Number(match[2])
  const candidate = buildLocalDate(ref.getFullYear(), month, day, 0, 0, 0)

  if (candidate.getTime() > now.getTime() + 7 * 86_400_000) {
    candidate.setFullYear(candidate.getFullYear() - 1)
  } else if (candidate.getTime() < now.getTime() - 350 * 86_400_000) {
    candidate.setFullYear(candidate.getFullYear() + 1)
  }

  return formatBeijingDate(candidate)
}

function extractBestText(post: Partial<WeiboRawPost>) {
  for (const key of ['longTextContent_raw', 'longTextContent', 'text_raw', 'text'] as const) {
    const value = post[key]
    if (typeof value === 'string' && value.trim()) {
      return normalizeText(value)
    }
  }
  return ''
}

function normalizeText(value: string) {
  let text = value.replace(/\r\n/g, '\n').trim()
  if (!text) return ''

  if (/<[^>]+>/.test(text)) {
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
  }

  return decodeHtml(text).replace(/\u00a0/g, ' ').trim()
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function previewText(value: string, maxLength = 100) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function parseImageUrls(post: WeiboRawPost) {
  const urls: string[] = []
  const seen = new Set<string>()

  function add(url: string | undefined) {
    if (!url || seen.has(url)) return
    seen.add(url)
    urls.push(url)
  }

  for (const pic of post.pics || []) {
    add(pickImageUrl(pic))
  }

  const infos = post.pic_infos || {}
  for (const picId of post.pic_ids || []) {
    add(pickImageUrl(infos[picId]))
  }
  for (const info of Object.values(infos)) {
    add(pickImageUrl(info))
  }

  for (const item of post.mix_media_info?.items || []) {
    add(pickImageUrl(item.data))
  }

  return urls
}

function pickImageUrl(pic: WeiboPictureUrls | undefined) {
  if (!pic || typeof pic !== 'object') return undefined

  for (const key of ['largest', 'large', 'original', 'mw2000', 'mw1024', 'mw960', 'mw690', 'bmiddle', 'thumbnail']) {
    const value = pic[key]
    if (typeof value === 'string' && value.startsWith('http')) return value
    if (value && typeof value === 'object' && typeof value.url === 'string') return value.url
  }

  const fallback = pic.url
  return typeof fallback === 'string' && fallback.startsWith('http') ? fallback : undefined
}

function parseWeiboDate(value: string) {
  const text = value.trim()
  if (!text) return new Date(0)

  const now = new Date()
  if (text === '刚刚' || text === '刚刚发布') return now

  const minute = /^(\d+)\s*分钟前$/.exec(text)
  if (minute) return new Date(now.getTime() - Number(minute[1]) * 60_000)

  const hour = /^(\d+)\s*小时前$/.exec(text)
  if (hour) return new Date(now.getTime() - Number(hour[1]) * 3_600_000)

  const today = /^今天\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (today) {
    return buildLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate(), Number(today[1]), Number(today[2]), Number(today[3] || 0))
  }

  const yesterday = /^昨天\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (yesterday) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    return buildLocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), Number(yesterday[1]), Number(yesterday[2]), Number(yesterday[3] || 0))
  }

  const monthDay = /^(\d{1,2})(?:[-/.]|月)(\d{1,2})(?:日)?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (monthDay) {
    const month = Number(monthDay[1])
    const day = Number(monthDay[2])
    const candidate = buildLocalDate(now.getFullYear(), month, day, Number(monthDay[3]), Number(monthDay[4]), Number(monthDay[5] || 0))
    if (candidate.getTime() > now.getTime() + 7 * 86_400_000) {
      candidate.setFullYear(candidate.getFullYear() - 1)
    }
    return candidate
  }

  const standard = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?(?:\s*[+-]\d{4})?$/.exec(text)
  if (standard) {
    return buildLocalDate(Number(standard[1]), Number(standard[2]), Number(standard[3]), Number(standard[4]), Number(standard[5]), Number(standard[6] || 0))
  }

  const direct = new Date(text)
  if (!Number.isNaN(direct.getTime())) return direct

  return new Date(0)
}

function buildLocalDate(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  return new Date(year, month - 1, day, hour, minute, second)
}

function getMobileTargetUrl(uid: string) {
  return `https://m.weibo.cn/u/${uid}?luicode=10000011&lfid=231583&launchid=10000360-page_H5`
}

function isTodayInBeijing(date: Date) {
  return formatBeijingDate(date) === formatBeijingDate(new Date())
}

function formatBeijingDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

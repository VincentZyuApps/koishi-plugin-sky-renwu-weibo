import axios, { AxiosInstance } from 'axios'
import type { Context } from 'koishi'
import type { Config } from './config'

interface WeiboPictureUrls {
  large?: { url?: string }
  original?: { url?: string }
  largest?: { url?: string }
  mw2000?: { url?: string }
  bmiddle?: { url?: string }
  thumbnail?: { url?: string }
}

interface WeiboRawPost {
  mblogid: string
  text_raw?: string
  text?: string
  created_at: string
  pic_infos?: Record<string, WeiboPictureUrls>
}

interface WeiboPost {
  mblogid: string
  textRaw: string
  createdAt: Date
  url: string
  imageUrls: string[]
}

export interface DailyResult {
  text: string
  imageUrls: string[]
  imageBuffers: Buffer[]
  sourceUrl?: string
  fetchedAt: number
}

export function createWeiboClient(config: Config) {
  if (!config.weiboCookie) {
    throw new Error('请先在插件配置中填写微博 Cookie。')
  }

  return axios.create({
    timeout: config.requestTimeout,
    responseType: 'json',
    headers: {
      'user-agent': config.userAgent,
      cookie: config.weiboCookie,
      referer: `https://www.weibo.com/u/${config.uid}`,
      'client-version': '3.0.0',
      'sec-ch-ua': '"Microsoft Edge";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
      'sec-ch-ua-platform': '"Windows"',
    },
  })
}

export async function fetchChineseServerDaily(
  client: AxiosInstance,
  config: Config,
  logger?: ReturnType<Context['logger']>,
): Promise<DailyResult> {
  const posts = await fetchUserPosts(client, config.uid)
  debugLog(logger, config, `微博列表拉取完成: count=${posts.length}`)
  const pattern = new RegExp(config.matchPattern)
  const post = posts.find((item) => isTodayInBeijing(item.createdAt) && pattern.test(item.textRaw))

  if (!post) {
    debugLog(logger, config, '未匹配到今日每日任务微博')
    return {
      text: '【国服】今日任务还未更新',
      imageUrls: [],
      imageBuffers: [],
      fetchedAt: Date.now(),
    }
  }

  debugLog(logger, config, `匹配到每日任务微博: mblogid=${post.mblogid}, imageUrls=${post.imageUrls.length}, url=${post.url}`)
  const longText = await fetchLongText(client, post.mblogid)
  debugLog(logger, config, `微博长文拉取完成: hasLongText=${Boolean(longText)}, length=${(longText || '').length}`)
  const imageBuffers = await fetchImages(client, post.imageUrls, logger)
  debugLog(logger, config, `微博图片下载完成: success=${imageBuffers.length}, total=${post.imageUrls.length}`)
  const text = [
    longText || post.textRaw || '【国服】今日任务还未更新',
    '------------',
    `【数据来源：微博@${config.authorName}】`,
    `原文链接：${post.url}`,
  ].join('\n')

  return {
    text,
    imageUrls: post.imageUrls,
    imageBuffers,
    sourceUrl: post.url,
    fetchedAt: Date.now(),
  }
}

async function fetchUserPosts(client: AxiosInstance, uid: string, page = 0): Promise<WeiboPost[]> {
  const response = await client.get('https://weibo.com/ajax/statuses/mymblog', {
    params: { uid, page, feature: 0 },
  })
  const data = response.data

  if (data?.ok !== 1) {
    throw new Error(data?.msg || '微博列表接口返回异常')
  }

  const list = data?.data?.list
  if (!Array.isArray(list)) {
    throw new Error('微博列表为空或格式异常')
  }

  return list.map((item: WeiboRawPost) => ({
    mblogid: item.mblogid,
    textRaw: item.text_raw || item.text || '',
    createdAt: parseWeiboDate(item.created_at),
    url: `https://www.weibo.com/${uid}/${item.mblogid}`,
    imageUrls: parseImageUrls(item),
  }))
}

async function fetchLongText(client: AxiosInstance, mblogid: string) {
  const response = await client.get('https://weibo.com/ajax/statuses/longtext', {
    params: { id: mblogid },
  })
  const data = response.data

  if (data?.ok !== 1) {
    return ''
  }

  return data?.data?.longTextContent || ''
}

async function fetchImages(
  client: AxiosInstance,
  urls: string[],
  logger?: ReturnType<Context['logger']>,
) {
  const results = await Promise.allSettled(urls.map(async (url) => {
    const response = await client.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      headers: { referer: 'https://weibo.com/' },
    })
    return Buffer.from(response.data)
  }))

  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value]
    logger?.warn(`微博图片下载失败，已跳过第 ${index + 1} 张: ${result.reason}`)
    return []
  })
}

function parseImageUrls(post: WeiboRawPost) {
  const infos = post.pic_infos || {}
  return Object.values(infos)
    .map((item) => item.large?.url || item.original?.url || item.largest?.url || item.mw2000?.url || item.bmiddle?.url || item.thumbnail?.url)
    .filter((url): url is string => Boolean(url))
}

function parseWeiboDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0)
  }
  return parsed
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

function debugLog(
  logger: ReturnType<Context['logger']> | undefined,
  config: Config,
  message: string,
) {
  if (config.verboseConsoleLog) {
    logger?.info(`[debug] ${message}`)
  }
}

import { formatImageDownloadStatus, type DailyResult } from '../weibo'

export function formatDailyText(result: DailyResult, intro = '') {
  return [intro, formatImageDownloadStatus(result), result.text]
    .filter(Boolean)
    .join('\n\n')
}

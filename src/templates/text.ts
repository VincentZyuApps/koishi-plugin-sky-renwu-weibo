import type { DailyResult } from '../weibo'

export function formatDailyText(result: DailyResult, intro = '') {
  return [intro, result.text]
    .filter(Boolean)
    .join('\n\n')
}

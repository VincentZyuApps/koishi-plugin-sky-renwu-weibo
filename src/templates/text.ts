import type { DailyResult } from '../weibo'
import { DAILY_TASK_HINT_TEXT } from './common/hint'

export function formatDailyText(result: DailyResult) {
  return [DAILY_TASK_HINT_TEXT, '', result.text]
    .filter(Boolean)
    .join('\n')
}

import type { Config } from '../../config'

export type DailyMessageScene = 'passive' | 'active'

export function formatDailyMessageIntro(config: Config, scene: DailyMessageScene) {
  const sceneHint = scene === 'active'
    ? config.dailyTaskActiveIntroHint
    : config.dailyTaskPassiveIntroHint

  return [config.dailyTaskGeneralIntroHint, sceneHint]
    .map((hint) => String(hint || '').trim())
    .filter(Boolean)
    .join('\n')
}

export function formatDailyMessageIntroMarkdown(intro: string) {
  return String(intro || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `> ${line}`)
    .join('\n')
}

import type { Client } from '@koishijs/plugin-console'
import { resolve } from 'path'
import type { Context } from 'koishi'
import type { ActivePushTarget, Config } from './config'
import type { ActivePushProgress, ActivePushResult, ActivePushService } from './active'

declare module '@koishijs/plugin-console' {
  interface Events {
    'sky-renwu-weibo/active-status'(): ReturnType<ActivePushService['getStatus']>
    'sky-renwu-weibo/active-push'(targets: ActivePushTarget[] | undefined, runId: string): Promise<ActivePushResult>
  }
}

interface ActivePushProgressPayload extends ActivePushProgress {
  runId: string
}

export function applyActivePushConsole(ctx: Context, config: Config, service: ActivePushService) {
  if (!config.enableConsoleWebuiTestArea) return

  ctx.inject(['console'], (consoleCtx) => {
    consoleCtx.console.addListener('sky-renwu-weibo/active-status', () => service.getStatus(), { authority: 3 })
    consoleCtx.console.addListener('sky-renwu-weibo/active-push', async function (this: Client, targets, runId) {
      const progressRunId = String(runId || '')
      return service.trigger('console', targets, async (progress) => {
        const body: ActivePushProgressPayload = { runId: progressRunId, ...progress }
        this.send({ type: 'sky-renwu-weibo/active-push-progress', body })
      })
    }, { authority: 3 })
    consoleCtx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}

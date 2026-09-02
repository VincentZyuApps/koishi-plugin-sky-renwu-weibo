import type {} from '@koishijs/plugin-console'
import { resolve } from 'path'
import type { Context } from 'koishi'
import type { ActivePushTarget, Config } from './config'
import type { ActivePushResult, ActivePushService } from './active'

declare module '@koishijs/plugin-console' {
  interface Events {
    'sky-renwu-weibo/active-status'(): ReturnType<ActivePushService['getStatus']>
    'sky-renwu-weibo/active-push'(targets?: ActivePushTarget[]): Promise<ActivePushResult>
  }
}

export function applyActivePushConsole(ctx: Context, config: Config, service: ActivePushService) {
  if (!config.enableConsoleWebuiTestArea) return

  ctx.inject(['console'], (consoleCtx) => {
    consoleCtx.console.addListener('sky-renwu-weibo/active-status', () => service.getStatus(), { authority: 3 })
    consoleCtx.console.addListener('sky-renwu-weibo/active-push', (targets) => service.trigger('console', targets), { authority: 3 })
    consoleCtx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}

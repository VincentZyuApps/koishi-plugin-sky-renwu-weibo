import type { Context } from '@koishijs/client'
import Push from './push.vue'

export default (ctx: Context) => {
  ctx.slot({
    type: 'plugin-details',
    component: Push,
    order: 0,
  })
}

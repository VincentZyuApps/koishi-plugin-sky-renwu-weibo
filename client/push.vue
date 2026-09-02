<template>
  <section v-if="isCurrentPlugin" class="active-panel">
    <header class="active-header">
      <div>
        <h3>主动消息推送测试</h3>
        <p>使用当前生效的主动推送配置抓取并发送一次每日任务。</p>
      </div>
      <k-button @click="refresh" :disabled="loading">🔄 刷新状态</k-button>
    </header>

    <div v-if="status" class="active-summary">
      <div class="active-summary-item">
        <span>定时推送</span>
        <strong>{{ status.enabled ? '已启用' : '未启用' }}</strong>
      </div>
      <div class="active-summary-item">
        <span>Cron</span>
        <strong>{{ status.cron }}</strong>
      </div>
      <div class="active-summary-item">
        <span>时区</span>
        <strong>GMT{{ status.timezoneGmtOffset >= 0 ? '+' : '' }}{{ status.timezoneGmtOffset }}</strong>
      </div>
      <div class="active-summary-item">
        <span>目标</span>
        <strong>{{ enabledTargetCount }}</strong>
      </div>
      <div class="active-summary-item">
        <span>缓存</span>
        <strong>{{ status.useCache ? '使用' : '强制刷新' }}</strong>
      </div>
    </div>

    <div v-if="displayTargets.length" class="active-targets">
      <table>
        <thead>
          <tr>
            <th>📝 备注</th>
            <th>🎯 platform</th>
            <th>🤖 Bot ID</th>
            <th>📡 Channel ID</th>
            <th>✅ 是否启用</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="target in displayTargets" :key="targetKey(target)">
            <td>{{ target.note }}</td>
            <td>{{ target.platform }}</td>
            <td>{{ target.selfId }}</td>
            <td>{{ target.channelId }}</td>
            <td>{{ target.enabled ? '是' : '否' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <k-comment v-else type="warning">
      当前没有启用的主动推送目标，请先保存插件配置后再测试。
    </k-comment>

    <div class="active-actions">
      <k-button type="primary" @click="trigger" :disabled="sending || !enabledTargetCount">
        {{ sending ? '📤 推送中...' : '🚀 立即推送' }}
      </k-button>
      <span>此按钮不受 Cron 总开关影响，但需要管理员权限与二次确认。</span>
    </div>

    <k-comment v-if="result" :type="result.ok ? 'success' : 'error'">
      <strong>{{ result.ok ? '推送完成' : '推送未完成' }}</strong>
      <p>{{ result.message }}</p>
      <ul v-if="result.targets.length">
        <li v-for="target in result.targets" :key="targetResultKey(target)">
          {{ target.ok ? '成功' : '失败' }}：{{ target.note }} - {{ target.message }}
        </li>
      </ul>
    </k-comment>
  </section>
</template>

<script lang="ts" setup>
import { send } from '@koishijs/client'
import { computed, inject, onMounted, ref } from 'vue'

interface ActiveStatus {
  enabled: boolean
  cron: string
  timezoneGmtOffset: number
  useCache: boolean
  enabledTargetCount: number
  targets: Array<{
    note: string
    platform: string
    selfId: string
    channelId: string
    enabled?: boolean
  }>
}

interface ActivePushTarget {
  note: string
  platform: string
  selfId: string
  channelId: string
  enabled: boolean
}

interface ActiveResult {
  ok: boolean
  trigger: 'cron' | 'console'
  message: string
  targets: Array<{
    note: string
    platform: string
    selfId?: string
    channelId: string
    ok: boolean
    message: string
  }>
}

const local: any = inject('manager.settings.local')
const status = ref<ActiveStatus>()
const result = ref<ActiveResult>()
const loading = ref(false)
const sending = ref(false)

const isCurrentPlugin = computed(() => {
  const name = String(local?.value?.name || '')
  return name === 'sky-renwu-weibo' || name === 'koishi-plugin-sky-renwu-weibo' || name.includes('sky-renwu-weibo')
})

const displayTargets = computed<ActivePushTarget[]>(() => {
  const configuredTargets = local?.value?.config?.activePushTargets
  const targets = Array.isArray(configuredTargets) ? configuredTargets : status.value?.targets || []
  return targets.map((target) => ({
    note: String(target?.note || '').trim(),
    platform: String(target?.platform || '').trim(),
    selfId: String(target?.selfId || '').trim(),
    channelId: String(target?.channelId || '').trim(),
    enabled: target?.enabled !== false,
  }))
})

const enabledTargetCount = computed(() => displayTargets.value.filter((target) => target.enabled).length)

function targetKey(target: ActivePushTarget) {
  return `${target.note}:${target.platform}:${target.selfId}:${target.channelId}`
}

function targetResultKey(target: ActiveResult['targets'][number]) {
  return `${target.note}:${target.platform}:${target.selfId}:${target.channelId}`
}

async function refresh() {
  loading.value = true
  try {
    status.value = await send('sky-renwu-weibo/active-status' as any)
  } finally {
    loading.value = false
  }
}

async function trigger() {
  if (!window.confirm('⚠️ 将使用当前表格配置，向所有启用目标发送一次每日任务。📣 确认继续吗？ 🚀')) return

  sending.value = true
  result.value = undefined
  try {
    result.value = await send('sky-renwu-weibo/active-push' as any, displayTargets.value)
  } catch (error) {
    result.value = {
      ok: false,
      trigger: 'console',
      message: error instanceof Error ? error.message : String(error),
      targets: [],
    }
  } finally {
    sending.value = false
    await refresh()
  }
}

onMounted(() => {
  void refresh()
})
</script>

<style lang="scss" scoped>
.active-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.active-header,
.active-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.active-header h3,
.active-header p,
.active-actions span,
.active-panel p {
  margin: 0;
}

.active-header h3 {
  font-size: 18px;
}

.active-header p,
.active-actions span,
.active-target span {
  color: var(--k-color-muted);
}

.active-summary {
  display: flex;
  flex-wrap: wrap;
  border: 1px solid var(--k-color-border);
}

.active-summary-item {
  display: flex;
  flex: 1 1 130px;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 8px 12px;
  border-right: 1px solid var(--k-color-border);
}

.active-summary-item:last-child {
  border-right: 0;
}

.active-summary-item span {
  color: var(--k-color-muted);
  font-size: 12px;
}

.active-summary-item strong {
  overflow-wrap: anywhere;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.active-targets {
  overflow-x: auto;
}

.active-targets table {
  width: 100%;
  min-width: 720px;
  border: 1px solid var(--k-color-border);
  border-collapse: collapse;
}

.active-targets th,
.active-targets td {
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
  border: 1px solid var(--k-color-border);
}

.active-targets td {
  font-size: 10px;
  white-space: nowrap;
}

.active-targets th {
  color: var(--k-color-text);
  font-weight: 600;
  background: var(--k-color-card);
}

.active-panel li {
  overflow-wrap: anywhere;
}

.active-panel ul {
  margin: 8px 0 0;
  padding-left: 20px;
}
</style>

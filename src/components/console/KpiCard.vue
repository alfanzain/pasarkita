<script setup lang="ts">
// Headline number for the staff dashboard: label, value, context line and optional 7-point trend.
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import SparkLine from '@/components/SparkLine.vue'

const props = defineProps<{
  label: string
  value: string
  icon: string
  hint?: string
  tone?: 'ok' | 'bad' | 'warn' | 'info'
  series?: number[]
  to?: string
  progress?: number
}>()
</script>

<template>
  <component :is="props.to ? RouterLink : 'div'" :to="props.to" class="kpi" :class="{ link: props.to }">
    <div class="kpi-top">
      <span class="kpi-label">{{ props.label }}</span>
      <span class="kpi-ico"><AppIcon :name="props.icon" :size="16" /></span>
    </div>
    <div class="kpi-mid">
      <span class="kpi-value mono">{{ props.value }}</span>
      <SparkLine
        v-if="props.series && props.series.some((v) => v > 0)"
        :values="props.series"
        :width="80"
        :height="28"
        color="var(--brand)"
        class="kpi-spark"
      />
    </div>
    <div v-if="props.progress !== undefined" class="kpi-bar" aria-hidden="true">
      <span :style="{ width: Math.min(100, Math.max(0, props.progress)) + '%' }" />
    </div>
    <div v-if="props.hint" class="kpi-hint" :class="props.tone ? 'kpi-' + props.tone : ''">{{ props.hint }}</div>
  </component>
</template>

<style scoped>
.kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  color: var(--ink);
  text-decoration: none;
  font-weight: inherit;
  min-width: 0;
}
.kpi.link:hover {
  border-color: var(--line-strong);
}
.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpi-label {
  font-size: 0.86rem;
  color: var(--ink-2);
  font-weight: 500;
}
.kpi-ico {
  color: var(--muted);
}
.kpi-mid {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}
.kpi-value {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  white-space: nowrap;
}
.kpi-spark {
  width: 80px;
  height: 28px;
  color: var(--brand);
  flex: none;
}
.kpi-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}
.kpi-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
}
.kpi-hint {
  font-size: 0.8rem;
  color: var(--muted);
}
.kpi-ok {
  color: var(--ok);
}
.kpi-bad {
  color: var(--bad);
}
.kpi-warn {
  color: var(--warn);
}
.kpi-info {
  color: var(--info);
}
@media (max-width: 640px) {
  .kpi-value {
    font-size: 1.3rem;
  }
  .kpi-spark {
    display: none;
  }
}
</style>

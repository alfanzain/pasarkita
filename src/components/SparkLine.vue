<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ values: number[]; width?: number; height?: number; color?: string }>(), {
  color: undefined,
  width: 96,
  height: 32,
})

const d = computed(() => {
  const v = props.values
  if (v.length < 2) return ''
  const min = Math.min(...v)
  const max = Math.max(...v)
  const span = max - min || 1
  return v
    .map((y, i) => {
      const x = (i / (v.length - 1)) * (props.width - 4) + 2
      const yy = props.height - 3 - ((y - min) / span) * (props.height - 6)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`
    })
    .join(' ')
})
const up = computed(() => {
  const v = props.values
  return v.length > 1 && (v[v.length - 1] ?? 0) >= (v[0] ?? 0)
})
</script>

<template>
  <svg :width="props.width" :height="props.height" aria-hidden="true">
    <path :d="d" fill="none" :style="{ stroke: props.color ?? (up ? 'var(--bad)' : 'var(--ok)') }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

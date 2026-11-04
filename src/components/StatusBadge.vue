<script setup lang="ts">
import { computed } from 'vue'
import { toneFor } from '@/utils/format'

const props = defineProps<{ status: string; label: string }>()
const tone = computed(() => toneFor(props.status))
// A symbol accompanies the color so status is readable without color perception.
const symbol = computed(
  () => ({ ok: '✓', warn: '…', bad: '!', info: '•', muted: '–' })[tone.value],
)
</script>

<template>
  <span class="badge" :class="'tone-' + tone">
    <span aria-hidden="true">{{ symbol }}</span>
    {{ props.label }}
  </span>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{ tone?: 'ok' | 'warn' | 'bad' | 'info'; title?: string; items?: string[] }>(),
  { tone: 'info' },
)
const icon = { ok: 'check', warn: 'clock', bad: 'alert', info: 'info' }
</script>

<template>
  <div class="alert" :class="'tone-' + props.tone" :role="props.tone === 'bad' ? 'alert' : 'status'">
    <AppIcon :name="icon[props.tone]" :size="26" />
    <div class="alert-body grow">
      <div v-if="props.title" class="bold">{{ props.title }}</div>
      <ul v-if="props.items?.length">
        <li v-for="i in props.items" :key="i">{{ i }}</li>
      </ul>
      <slot />
    </div>
  </div>
</template>

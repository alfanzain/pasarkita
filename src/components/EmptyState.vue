<script setup lang="ts">
import AppIcon from './AppIcon.vue'
const props = withDefaults(defineProps<{ icon?: string; title: string; text?: string }>(), { icon: 'info' })
</script>

<template>
  <div class="empty card center">
    <div class="empty-icon"><AppIcon :name="props.icon" :size="36" /></div>
    <h3>{{ props.title }}</h3>
    <p v-if="props.text" class="muted">{{ props.text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  padding: 28px 16px;
}
.empty-icon {
  width: 68px;
  height: 68px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--muted);
}
</style>

<script setup lang="ts">
// Toolbar above staff lists: search on the left, filters in the middle, actions on the right.
import AppIcon from '@/components/AppIcon.vue'

const model = defineModel<string>({ default: '' })
const props = withDefaults(defineProps<{ placeholder?: string; label?: string }>(), {
  placeholder: 'Cari…',
  label: 'Cari',
})
</script>

<template>
  <div class="fb">
    <label class="fb-search">
      <span class="sr-only">{{ props.label }}</span>
      <AppIcon name="search" :size="16" />
      <input v-model="model" type="search" class="fb-input" :placeholder="props.placeholder" />
    </label>
    <div v-if="$slots.default" class="fb-filters">
      <slot />
    </div>
    <div v-if="$slots.actions" class="fb-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.fb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  /* Never squeezed below a usable search box; wraps under siblings instead. */
  flex: 1 1 280px;
  min-width: 0;
}
.fb-search {
  position: relative;
  flex: 1 1 260px;
  max-width: 380px;
  display: flex;
  align-items: center;
  color: var(--muted);
}
.fb-search :deep(svg) {
  position: absolute;
  left: 10px;
  pointer-events: none;
}
.fb-input {
  width: 100%;
  height: var(--ctl);
  padding: 0 10px 0 32px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  font: inherit;
  font-size: 0.93rem;
  color: var(--ink);
  box-shadow: 0 1px 1px rgb(16 24 40 / 4%);
}
.fb-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgb(14 94 78 / 15%);
}
.fb-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.fb-filters :deep(.select) {
  width: auto;
  min-width: 140px;
}
.fb-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
@media (max-width: 640px) {
  .fb-search {
    max-width: none;
    flex-basis: 100%;
  }
  .fb-filters :deep(.select) {
    flex: 1;
    min-width: 0;
  }
}
</style>

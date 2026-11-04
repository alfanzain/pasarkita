<script setup lang="ts">
// Each page opens with a plain-language title and a one-line explanation.
// Staff screens can add primary actions on the right via the `actions` slot.
const props = defineProps<{ title: string; help?: string }>()
</script>

<template>
  <header class="page-header">
    <div class="ph-text">
      <h1>{{ props.title }}</h1>
      <p v-if="props.help" class="muted">{{ props.help }}</p>
    </div>
    <div v-if="$slots.actions" class="ph-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.page-header p {
  margin: 0;
}
.ph-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
:global([data-ui='console'] .page-header) {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 24px;
  margin-bottom: 20px;
}
:global([data-ui='console'] .ph-text) {
  flex: 1 1 360px;
  min-width: 0;
}
:global([data-ui='console'] .page-header h1) {
  margin: 0 0 2px;
}
:global([data-ui='console'] .page-header p) {
  font-size: 0.93rem;
  max-width: 72ch;
}
:global([data-ui='console'] .ph-actions) {
  margin-top: 0;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

// Live checklist so users see what's still missing instead of a cryptic error after submit.
const props = defineProps<{ password: string }>()
const rules = computed(() => [
  { ok: props.password.length >= 8, text: 'Minimal 8 karakter' },
  { ok: /[0-9]/.test(props.password), text: 'Ada angka (0-9)' },
  { ok: /[^A-Za-z0-9]/.test(props.password), text: 'Ada karakter spesial, contoh: # ! @' },
])
</script>

<template>
  <ul class="pw" aria-label="Syarat kata sandi">
    <li v-for="r in rules" :key="r.text" :class="r.ok ? 'tone-ok' : 'tone-muted'">
      <span aria-hidden="true">{{ r.ok ? '✓' : '○' }}</span>
      {{ r.text }}
      <span class="sr-only">{{ r.ok ? 'terpenuhi' : 'belum' }}</span>
    </li>
  </ul>
</template>

<style scoped>
.pw {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  gap: 6px;
}
.pw li {
  background: none;
  font-weight: 600;
  display: flex;
  gap: 8px;
}
</style>

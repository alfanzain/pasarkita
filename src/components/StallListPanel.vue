<script setup lang="ts">
// List alternative to the map: some users find tapping a small map box hard, a list is easier.
// Sits beside the map on wide screens and below it on phones.
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import type { Stall } from '@/types'

const props = withDefaults(
  defineProps<{
    title?: string
    stalls: Stall[]
    // Main line next to the stall code, e.g. shop name or price.
    detail: (s: Stall) => string
    // Second line; defaults to the stall location.
    sub?: (s: Stall) => string
    selectedId?: string | null
    empty?: string
    // Hide the built-in search when the page already filters the list.
    searchable?: boolean
  }>(),
  { searchable: true },
)
const emit = defineEmits<{ select: [stall: Stall] }>()
const q = ref('')

const shown = computed(() => {
  const t = q.value.trim().toLowerCase()
  if (!t) return props.stalls
  return props.stalls.filter(
    (s) =>
      s.code.toLowerCase().includes(t) ||
      s.location.toLowerCase().includes(t) ||
      props.detail(s).toLowerCase().includes(t),
  )
})
</script>

<template>
  <section class="card panel">
    <h2 v-if="props.title">{{ props.title }}</h2>
    <input
      v-if="props.searchable"
      v-model="q" type="search" class="input" placeholder="Cari kode atau nama" aria-label="Cari di daftar" />
    <p v-if="!shown.length" class="muted" style="margin: 12px 0 0">{{ props.empty ?? 'Tidak ada lapak.' }}</p>
    <ul v-else class="items">
      <li v-for="s in shown" :key="s.id">
        <button
          type="button"
          class="item"
          :class="{ on: s.id === props.selectedId }"
          :aria-pressed="s.id === props.selectedId"
          @click="emit('select', s)"
        >
          <span class="code mono">{{ s.code }}</span>
          <span class="grow">
            <span class="bold d-block">{{ props.detail(s) }}</span>
            <span class="small muted">{{ props.sub ? props.sub(s) : s.location }}</span>
          </span>
          <AppIcon name="chevron" :size="20" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel h2 {
  margin: 0;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 60vh;
  overflow-y: auto;
}
/* Below a full-width map on wide screens: spread the list into columns instead of a scroll box. */
@media (min-width: 900px) {
  .items {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    max-height: none;
    overflow: visible;
  }
}
.item {
  appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--tap);
  padding: 10px 12px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.item:hover {
  border-color: var(--brand);
}
.item.on {
  border-color: var(--accent-strong);
  background: var(--accent-soft);
}
.code {
  flex: none;
  min-width: 52px;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand);
  font-weight: 700;
  text-align: center;
}
.d-block {
  display: block;
}
</style>

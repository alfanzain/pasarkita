<script setup lang="ts">
// Announcement card. With `clamp`, long text is cut to 3 lines and can be expanded.
import { nextTick, onMounted, ref } from 'vue'
import type { Announcement } from '@/types'
import { tanggal } from '@/utils/format'

const props = defineProps<{ item: Announcement; clamp?: boolean }>()
const body = ref<HTMLElement | null>(null)
const open = ref(false)
const overflows = ref(false)

onMounted(async () => {
  await nextTick()
  const el = body.value
  if (props.clamp && el) overflows.value = el.scrollHeight > el.clientHeight + 1
})
</script>

<template>
  <article class="card">
    <span class="small muted">{{ tanggal(props.item.createdAt) }}</span>
    <h3>{{ props.item.title }}</h3>
    <p ref="body" class="body" :class="{ clamped: props.clamp && !open }">{{ props.item.body }}</p>
    <button v-if="overflows" type="button" class="more" :aria-expanded="open" @click="open = !open">
      {{ open ? 'Tutup' : 'Baca selengkapnya' }}
    </button>
  </article>
</template>

<style scoped>
h3 {
  margin-top: 4px;
}
.body {
  margin: 0;
  white-space: pre-line;
}
.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.more {
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 700;
  color: var(--brand);
  min-height: 44px;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}
</style>

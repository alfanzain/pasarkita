<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AnnouncementCard from '@/components/AnnouncementCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { visibleAnnouncements } from '@/services/info'

const PAGE = 10
const q = ref('')
const limit = ref(PAGE)

const matches = computed(() => {
  const t = q.value.trim().toLowerCase()
  const all = visibleAnnouncements()
  if (!t) return all
  return all.filter((a) => a.title.toLowerCase().includes(t) || a.body.toLowerCase().includes(t))
})
const shown = computed(() => matches.value.slice(0, limit.value))
const remaining = computed(() => matches.value.length - shown.value.length)

watch(q, () => (limit.value = PAGE))
</script>

<template>
  <div class="stack-lg">
    <PageHeader title="Pengumuman" help="Semua pengumuman resmi dari UPT Pasar, yang terbaru di atas." />

    <div class="search">
      <AppIcon name="search" :size="24" />
      <input
        v-model="q"
        type="search"
        class="input"
        placeholder="Cari pengumuman, contoh: listrik"
        aria-label="Cari pengumuman"
      />
    </div>
    <p class="bold" style="margin: 0" aria-live="polite">
      {{ q.trim() ? `${matches.length} pengumuman ditemukan` : `${matches.length} pengumuman` }}
    </p>

    <EmptyState
      v-if="!matches.length"
      icon="megaphone"
      :title="q.trim() ? 'Tidak ditemukan' : 'Belum ada pengumuman'"
      :text="q.trim() ? 'Coba kata lain.' : undefined"
    />
    <template v-else>
      <ul class="list card-grid">
        <li v-for="a in shown" :key="a.id">
          <AnnouncementCard :item="a" clamp />
        </li>
      </ul>
      <button v-if="remaining > 0" type="button" class="btn btn-outline btn-block" @click="limit += PAGE">
        Tampilkan {{ Math.min(PAGE, remaining) }} lagi
        <span class="muted small">(sisa {{ remaining }})</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.search {
  position: relative;
}
.search svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
}
.search .input {
  padding-left: 50px;
}
</style>

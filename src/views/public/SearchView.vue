<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StallInfoSheet from '@/components/StallInfoSheet.vue'
import StallMap from '@/components/StallMap.vue'
import { db } from '@/data/db'
import { searchStalls } from '@/services/info'
import { stallById } from '@/services/stall'
import type { Stall } from '@/types'

const q = ref('')
const commodity = ref('')
const mode = ref<'list' | 'map'>('list')
const selected = ref<Stall | null>(null)

const hits = computed(() => searchStalls(q.value, commodity.value))
const touched = computed(() => !!q.value.trim() || !!commodity.value)

function toggleCommodity(name: string) {
  commodity.value = commodity.value === name ? '' : name
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader title="Cari Barang atau Toko" help="Ketik nama barang atau nama toko, atau pilih salah satu barang di bawah." />

    <div class="search">
      <AppIcon name="search" :size="26" />
      <input
        v-model="q"
        type="search"
        class="input"
        placeholder="Contoh: cabai, ayam, Mak Iyah"
        aria-label="Kata pencarian"
        enterkeyhint="search"
      />
    </div>

    <div>
      <div class="label">Saring berdasarkan barang</div>
      <div class="chips">
        <button
          v-for="c in db.commodities"
          :key="c.id"
          type="button"
          class="chip"
          :aria-pressed="commodity === c.name"
          @click="toggleCommodity(c.name)"
        >
          <span aria-hidden="true">{{ c.emoji }}</span> {{ c.name }}
        </button>
      </div>
    </div>

    <div class="row between">
      <span class="bold">{{ hits.length }} lapak ditemukan</span>
      <div class="tabs" role="tablist" style="flex: none">
        <button class="tab" role="tab" :aria-selected="mode === 'list'" @click="mode = 'list'">
          <AppIcon name="list" :size="20" /> Daftar
        </button>
        <button class="tab" role="tab" :aria-selected="mode === 'map'" @click="mode = 'map'">
          <AppIcon name="map" :size="20" /> Peta
        </button>
      </div>
    </div>

    <EmptyState
      v-if="!hits.length"
      icon="search"
      title="Tidak ditemukan"
      text="Coba kata lain atau hapus saringan barang."
    />

    <ul v-else-if="mode === 'list'" class="list card-grid">
      <li v-for="h in hits" :key="h.stallId" class="card">
        <div class="row between">
          <h3 style="margin: 0">{{ h.shopName }}</h3>
          <span class="badge tone-info mono">{{ h.code }}</span>
        </div>
        <p class="muted small" style="margin: 4px 0 8px"><AppIcon name="pin" :size="16" /> {{ h.location }}</p>
        <div class="chips">
          <span
            v-for="g in h.goods"
            :key="g"
            class="chip chip-static"
            :class="{ hit: touched && (g.toLowerCase().includes(q.trim().toLowerCase()) && q.trim() || g === commodity) }"
          >{{ g }}</span>
        </div>
        <RouterLink :to="{ path: '/peta', query: { lapak: h.stallId } }" class="btn btn-outline btn-block" style="margin-top: 12px">
          <AppIcon name="map" /> Lihat lokasi di peta
        </RouterLink>
      </li>
    </ul>

    <StallMap
      v-else
      variant="goods"
      :highlight-ids="hits.map((h) => h.stallId)"
      @select="selected = stallById($event.id) ?? null"
    />

    <StallInfoSheet v-if="selected" :stall="selected" @close="selected = null" />
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
  padding-left: 52px;
  min-height: 60px;
  font-size: 1.1rem;
}
.hit {
  background: var(--accent-soft);
  color: var(--accent-ink);
}
</style>

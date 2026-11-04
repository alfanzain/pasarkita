<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StallInfoSheet from '@/components/StallInfoSheet.vue'
import StallListPanel from '@/components/StallListPanel.vue'
import StallMap from '@/components/StallMap.vue'
import { db } from '@/data/db'
import { GOODS_CATEGORIES, stallCategory, type GoodsCategoryKey } from '@/services/goods'
import { areaById, leaseOfStall, stallById } from '@/services/stall'
import type { Stall } from '@/types'

const route = useRoute()
const router = useRouter()

// Deep links: ?lapak=<id> focuses a stall, ?q= and ?kategori= pre-fill the filter.
const queryStr = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '')
const q = ref(queryStr('q'))
const initialCat = queryStr('kategori').toUpperCase()
const cat = ref<GoodsCategoryKey | ''>(
  GOODS_CATEGORIES.some((c) => c.key === initialCat) ? (initialCat as GoodsCategoryKey) : '',
)
const selected = ref<Stall | null>(stallById(queryStr('lapak') || undefined) ?? null)
const focusId = ref<string | null>(selected.value?.id ?? null)
const tab = ref<'map' | 'list'>('map')

// Phones show map OR list; wide screens show both side by side.
const mq = window.matchMedia('(min-width: 900px)')
const wide = ref(mq.matches)
const onMq = (e: MediaQueryListEvent) => (wide.value = e.matches)
mq.addEventListener('change', onMq)
onBeforeUnmount(() => mq.removeEventListener('change', onMq))

const occupied = computed(() =>
  db.stalls.filter((s) => leaseOfStall(s.id)).sort((a, b) => a.code.localeCompare(b.code)),
)

function matchesQuery(s: Stall) {
  const t = q.value.trim().toLowerCase()
  if (!t) return true
  const l = leaseOfStall(s.id)
  return (
    s.code.toLowerCase().includes(t) ||
    !!l?.shopName.toLowerCase().includes(t) ||
    !!l?.goods.some((g) => g.toLowerCase().includes(t))
  )
}

const byQuery = computed(() => occupied.value.filter(matchesQuery))
const filtered = computed(() =>
  byQuery.value.filter((s) => !cat.value || stallCategory(s.id)?.key === cat.value),
)
const filterActive = computed(() => !!q.value.trim() || !!cat.value)

// Category chips only for categories present, with counts that follow the search text.
const chips = computed(() =>
  GOODS_CATEGORIES.map((c) => ({
    ...c,
    count: byQuery.value.filter((s) => stallCategory(s.id)?.key === c.key).length,
  })).filter((c) => occupied.value.some((s) => stallCategory(s.id)?.key === c.key)),
)

const highlightIds = computed(() => {
  if (filterActive.value) return filtered.value.length ? filtered.value.map((s) => s.id) : undefined
  return focusId.value ? [focusId.value] : undefined
})

function clearFilter() {
  q.value = ''
  cat.value = ''
}

// Keep the URL shareable ("lihat di mana cabai dijual").
watch([q, cat], () => {
  const query: Record<string, string> = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (cat.value) query.kategori = cat.value.toLowerCase()
  router.replace({ query })
})

function onMapSelect(s: Stall) {
  selected.value = s
}

async function onListSelect(s: Stall) {
  tab.value = 'map'
  focusId.value = null
  await nextTick()
  focusId.value = s.id
  selected.value = s
}

const listDetail = (s: Stall) => leaseOfStall(s.id)?.shopName ?? ''
// "Lantai 2 · Area B · Batik, Kain Sarung"
const listSub = (s: Stall) => {
  const a = areaById(s.areaId)
  const goods = leaseOfStall(s.id)?.goods ?? []
  const head = goods.slice(0, 2).join(', ') + (goods.length > 2 ? ` +${goods.length - 2}` : '')
  return a ? `Lantai ${a.floor} · Area ${a.letter} · ${head}` : head
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Peta Pasar"
      help="Cari toko atau barang, lalu ketuk untuk melihat letak dan cara ke sana."
    />

    <section class="card filters" aria-label="Saring toko">
      <div class="search">
        <AppIcon name="search" :size="24" />
        <input
          v-model="q"
          type="search"
          class="input"
          placeholder="Contoh: cabai, ayam"
          aria-label="Cari barang atau toko"
          enterkeyhint="search"
        />
      </div>
      <div class="chips" role="group" aria-label="Jenis barang">
        <button type="button" class="chip" :aria-pressed="!cat" @click="cat = ''">
          Semua <span class="count">{{ byQuery.length }}</span>
        </button>
        <button
          v-for="c in chips"
          :key="c.key"
          type="button"
          class="chip"
          :aria-pressed="cat === c.key"
          :disabled="!c.count && cat !== c.key"
          @click="cat = cat === c.key ? '' : c.key"
        >
          <span aria-hidden="true">{{ c.icon }}</span> {{ c.short }}
          <span class="count">{{ c.count }}</span>
        </button>
      </div>
      <div v-if="filterActive" class="row between result" aria-live="polite">
        <span class="bold">{{ filtered.length }} toko ditemukan</span>
        <button type="button" class="btn btn-ghost btn-sm" @click="clearFilter">
          <AppIcon name="close" :size="18" /> Hapus saringan
        </button>
      </div>
    </section>

    <EmptyState
      v-if="filterActive && !filtered.length"
      icon="search"
      title="Belum ada toko yang cocok"
      text="Coba kata lain, atau tekan Hapus saringan."
    />

    <div v-if="!wide" class="tabs view-switch" role="tablist" aria-label="Tampilan">
      <button type="button" class="tab" role="tab" :aria-selected="tab === 'map'" @click="tab = 'map'">
        <AppIcon name="map" :size="20" /> Peta
      </button>
      <button type="button" class="tab" role="tab" :aria-selected="tab === 'list'" @click="tab = 'list'">
        <AppIcon name="list" :size="20" /> Daftar toko <span class="count">{{ filtered.length }}</span>
      </button>
    </div>

    <div class="stack-lg">
      <StallMap
        v-show="wide || tab === 'map'"
        variant="goods"
        :selected-id="selected?.id"
        :highlight-ids="highlightIds"
        :focus-id="focusId"
        @select="onMapSelect"
      />
      <StallListPanel
        v-show="wide || tab === 'list'"
        :title="wide ? `Daftar toko (${filtered.length})` : undefined"
        :stalls="filtered"
        :detail="listDetail"
        :sub="listSub"
        :selected-id="selected?.id"
        :searchable="false"
        empty="Tidak ada toko yang cocok dengan saringan."
        @select="onListSelect"
      />
    </div>

    <StallInfoSheet v-if="selected" :stall="selected" @close="selected = null">
      <!-- The sheet covers the map; this closes it so the highlighted stall is visible -->
      <button type="button" class="btn btn-outline btn-block" @click="selected = null">
        <AppIcon name="map" /> Lihat di peta
      </button>
    </StallInfoSheet>
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 12px;
}
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
  min-height: 58px;
  font-size: 1.05rem;
}
.chip .count {
  min-width: 24px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 0.8rem;
  line-height: 22px;
  text-align: center;
}
.chip[aria-pressed='true'] .count {
  background: var(--brand);
  color: var(--brand-ink);
}
.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.result {
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
/* Stays reachable while scrolling the map on phones */
.view-switch {
  position: sticky;
  top: calc(64px + env(safe-area-inset-top));
  z-index: 10;
  box-shadow: 0 4px 12px rgb(0 0 0 / 6%);
}
</style>

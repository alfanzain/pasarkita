<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import PageHeader from '@/components/PageHeader.vue'
import StallMap from '@/components/StallMap.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { db } from '@/data/db'
import { userName } from '@/services/auth'
import { ticketById } from '@/services/maint'
import type { Ticket, Urgency } from '@/types'
import { CATEGORY_ICON, CATEGORY_LABEL, TICKET_STATUS_LABEL, URGENCY_LABEL, relatif } from '@/utils/format'

type Tab = 'CLUSTER' | 'ACTIVE' | 'DONE'
const router = useRouter()
const tab = ref<Tab>('ACTIVE')

function byTab(t: Tab) {
  return db.tickets
    .filter((x) =>
      t === 'CLUSTER' ? x.status === 'CLUSTER_REVIEW' : t === 'ACTIVE' ? x.status === 'OPEN' || x.status === 'IN_PROGRESS' : x.status === 'DONE',
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
const levels: Urgency[] = ['TINGGI', 'SEDANG', 'RENDAH']
const rank: Record<Urgency, number> = { TINGGI: 0, SEDANG: 1, RENDAH: 2 }
const q = ref('')
const urgency = ref<Urgency | 'ALL'>('ALL')
const list = computed(() => {
  const term = q.value.trim().toLowerCase()
  return byTab(tab.value)
    .filter((t) => urgency.value === 'ALL' || t.systemUrgency === urgency.value)
    .filter((t) => !term || [t.number, t.description, t.location.label, CATEGORY_LABEL[t.category]].some((x) => x?.toLowerCase().includes(term)))
    .sort((a, b) => rank[a.systemUrgency] - rank[b.systemUrgency] || b.createdAt.localeCompare(a.createdAt))
})
const countBy = (u: Urgency) => byTab(tab.value).filter((t) => t.systemUrgency === u).length

const markers = computed(() =>
  byTab('ACTIVE').map((t) => ({
    id: t.id,
    areaId: t.location.areaId,
    x: t.location.x,
    y: t.location.y,
    label: t.number ?? '',
    tone: t.systemUrgency === 'TINGGI' ? 'var(--bad)' : t.systemUrgency === 'SEDANG' ? 'var(--warn)' : 'var(--ok)',
  })),
)

function go(t: Ticket) {
  router.push(t.status === 'CLUSTER_REVIEW' ? '/kelola/clustering' : `/kelola/kerusakan/${t.id}`)
}
const tabs: { v: Tab; label: string }[] = [
  { v: 'CLUSTER', label: 'Perlu Cek Kemiripan' },
  { v: 'ACTIVE', label: 'Dalam Perbaikan' },
  { v: 'DONE', label: 'Selesai' },
]
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Laporan Kerusakan"
      help="Laporan dari pedagang diurutkan menurut urgensi. Tangani yang merah (tinggi) lebih dulu."
    >
      <template #actions>
        <RouterLink v-if="byTab('CLUSTER').length" to="/kelola/clustering" class="btn btn-accent">
          <AppIcon name="layers" :size="16" /> Cek {{ byTab('CLUSTER').length }} laporan mirip
        </RouterLink>
      </template>
    </PageHeader>

    <div class="fb-row">
      <div class="tabs" role="tablist">
        <button v-for="t in tabs" :key="t.v" type="button" role="tab" class="tab" :aria-selected="tab === t.v" @click="tab = t.v">
          {{ t.label }}<span v-if="t.v !== 'DONE'" class="count">{{ byTab(t.v).length }}</span>
        </button>
      </div>
      <FilterBar v-model="q" placeholder="Cari nomor, isi laporan, lokasi" class="grow">
        <div class="chips" role="group" aria-label="Saring urgensi">
          <button type="button" class="chip" :aria-pressed="urgency === 'ALL'" @click="urgency = 'ALL'">Semua</button>
          <button v-for="l in levels" :key="l" type="button" class="chip" :aria-pressed="urgency === l" @click="urgency = l">
            <span class="dot" :class="'dot-' + l" aria-hidden="true" />{{ URGENCY_LABEL[l] }} <span class="muted mono">{{ countBy(l) }}</span>
          </button>
        </div>
      </FilterBar>
    </div>

    <div class="dmg-grid" :class="{ 'with-map': tab === 'ACTIVE' && markers.length }">
      <section class="panel">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Urgensi</th>
                <th>Laporan</th>
                <th class="hide-md">Lokasi</th>
                <th class="hide-sm">Status</th>
                <th class="hide-sm num">Dilaporkan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in list" :key="t.id" class="clickable" tabindex="0" @click="go(t)" @keydown.enter="go(t)">
                <td><StatusBadge :status="t.systemUrgency" :label="URGENCY_LABEL[t.systemUrgency]" /></td>
                <td class="desc-cell">
                  <div class="cell-stack">
                    <span class="row" style="gap: 6px">
                      <span class="code-pill">{{ t.number ?? 'Baru' }}</span>
                      <span class="cell-sub"><span aria-hidden="true">{{ CATEGORY_ICON[t.category] }}</span> {{ CATEGORY_LABEL[t.category] }}</span>
                    </span>
                    <span class="desc">{{ t.description }}</span>
                    <span v-if="t.similarTo" class="cell-sub">
                      Mirip {{ ticketById(t.similarTo)?.number }} ({{ Math.round((t.similarity ?? 0) * 100) }}%)
                    </span>
                  </div>
                </td>
                <td class="hide-md loc-cell">
                  <span class="cell-stack"><span>{{ t.location.label }}</span><span class="cell-sub">{{ userName(t.reporterId) }}</span></span>
                </td>
                <td class="hide-sm">
                  <StatusBadge :status="t.status" :label="TICKET_STATUS_LABEL[t.status]" />
                  <div v-if="t.progress.length" class="cell-sub">{{ t.progress.length }} progres</div>
                </td>
                <td class="hide-sm num cell-sub">{{ relatif(t.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!list.length" class="table-empty">Tidak ada laporan di bagian ini.</div>
        </div>
        <div class="table-foot"><span>{{ list.length }} laporan</span></div>
      </section>

      <section v-if="tab === 'ACTIVE' && markers.length" class="panel map-panel">
        <div class="panel-head">
          <AppIcon name="map" :size="18" />
          <h2 class="grow">Peta lokasi kerusakan</h2>
        </div>
        <div class="panel-body">
          <StallMap :markers="markers" :legend="false" @select="() => {}" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.dmg-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}
@media (min-width: 1680px) {
  .dmg-grid.with-map {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  }
  .map-panel {
    position: sticky;
    top: calc(var(--top-h) + 16px);
  }
}
.desc-cell {
  max-width: 480px;
}
.loc-cell {
  min-width: 160px;
}
.desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot-TINGGI {
  background: var(--bad);
}
.dot-SEDANG {
  background: var(--warn);
}
.dot-RENDAH {
  background: var(--ok);
}
</style>

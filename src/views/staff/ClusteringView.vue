<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StallMap from '@/components/StallMap.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import { userName } from '@/services/auth'
import { mergeTicket, splitTicket, ticketById } from '@/services/maint'
import type { Ticket } from '@/types'
import { CATEGORY_ICON, CATEGORY_LABEL, URGENCY_LABEL, tanggalJam } from '@/utils/format'

const list = computed(() => db.tickets.filter((t) => t.status === 'CLUSTER_REVIEW'))

function breakdown(a: Ticket, b: Ticket) {
  const dist = Math.hypot(a.location.x - b.location.x, a.location.y - b.location.y)
  return {
    dist: Math.round(dist * 10) / 10,
    loc:
      a.location.areaId !== b.location.areaId
        ? `Beda area (${a.location.areaId} vs ${b.location.areaId})`
        : dist < 3
          ? 'Sangat dekat'
          : dist < 6
            ? 'Cukup dekat'
            : 'Jauh',
    sameCat: a.category === b.category,
  }
}

async function merge(t: Ticket) {
  const target = ticketById(t.similarTo)
  if (!(await confirmDialog('Gabungkan laporan?', `Laporan ini akan digabung ke tiket ${target?.number}. Pelapor akan mengikuti progres tiket tersebut.`, { okText: 'Ya, gabungkan' }))) return
  mergeTicket(t.id)
  toast(`Laporan digabung ke ${target?.number}`)
}

async function split(t: Ticket) {
  if (!(await confirmDialog('Jadikan tiket baru?', 'Laporan ini dianggap kerusakan berbeda dan mendapat nomor tiket sendiri.', { okText: 'Ya, pisahkan' }))) return
  splitTicket(t.id)
  toast(`Tiket baru dibuat: ${ticketById(t.id)?.number}`)
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Cek Laporan Mirip"
      help="Sistem menemukan laporan baru yang mirip dengan tiket yang masih berjalan. Bandingkan keduanya, lalu gabungkan atau pisahkan."
    />
    <EmptyState v-if="!list.length" icon="check" title="Tidak ada yang perlu dicek" text="Semua laporan baru sudah diputuskan." />

    <article v-for="(t, idx) in list" :key="t.id" class="panel">
      <template v-for="o in [ticketById(t.similarTo)]" :key="o?.id ?? 'none'">
        <header class="panel-head cl-head">
          <span class="eyebrow">Kasus {{ idx + 1 }} dari {{ list.length }}</span>
          <div class="meter grow" :aria-label="`Kemiripan ${Math.round((t.similarity ?? 0) * 100)} persen`">
            <span class="meter-bar"><span :style="{ width: Math.round((t.similarity ?? 0) * 100) + '%' }" /></span>
            <span class="mono bold">{{ Math.round((t.similarity ?? 0) * 100) }}% mirip</span>
          </div>
          <div v-if="o" class="chips">
            <span class="badge tone-muted"><AppIcon name="pin" :size="12" /> {{ breakdown(t, o).loc }} · {{ breakdown(t, o).dist }} petak</span>
            <span class="badge" :class="breakdown(t, o).sameCat ? 'tone-warn' : 'tone-muted'">Kategori {{ breakdown(t, o).sameCat ? 'sama' : 'beda' }}</span>
            <span class="badge tone-muted">Kata-kata mirip</span>
          </div>
        </header>

        <div class="compare">
          <section class="side">
            <div class="row between">
              <span class="badge tone-info">Laporan baru</span>
              <span class="small muted">{{ tanggalJam(t.createdAt) }}</span>
            </div>
            <p class="bold desc">{{ t.description }}</p>
            <img v-if="t.photo" :src="t.photo" alt="Foto laporan baru" class="photo" />
            <dl class="kv small">
              <dt>Kategori</dt><dd>{{ CATEGORY_ICON[t.category] }} {{ CATEGORY_LABEL[t.category] }}</dd>
              <dt>Lokasi</dt><dd>{{ t.location.label }}</dd>
              <dt>Pelapor</dt><dd>{{ userName(t.reporterId) }}</dd>
              <dt>Urgensi</dt><dd>{{ URGENCY_LABEL[t.systemUrgency] }}</dd>
            </dl>
          </section>
          <div class="vs" aria-hidden="true"><span>vs</span></div>
          <section v-if="o" class="side">
            <div class="row between">
              <span class="badge tone-muted">Tiket {{ o.number }}</span>
              <span class="small muted">{{ tanggalJam(o.createdAt) }}</span>
            </div>
            <p class="bold desc">{{ o.description }}</p>
            <img v-if="o.photo" :src="o.photo" alt="Foto tiket lama" class="photo" />
            <dl class="kv small">
              <dt>Kategori</dt><dd>{{ CATEGORY_ICON[o.category] }} {{ CATEGORY_LABEL[o.category] }}</dd>
              <dt>Lokasi</dt><dd>{{ o.location.label }}</dd>
              <dt>Pelapor</dt><dd>{{ userName(o.reporterId) }}</dd>
              <dt>Urgensi</dt><dd>{{ URGENCY_LABEL[o.systemUrgency] }}</dd>
            </dl>
          </section>
        </div>

        <details v-if="o" class="map-toggle">
          <summary><AppIcon name="map" :size="16" /> Lihat keduanya di peta</summary>
          <StallMap
            :legend="false"
            :markers="[
              { id: t.id, areaId: t.location.areaId, x: t.location.x, y: t.location.y, label: 'Baru', tone: 'var(--info)' },
              { id: o.id, areaId: o.location.areaId, x: o.location.x, y: o.location.y, label: o.number ?? '', tone: 'var(--bad)' },
            ]"
          />
        </details>

        <footer class="cl-foot">
          <span class="small muted grow">Gabungkan jika ini kerusakan yang sama — pelapor akan mengikuti progres tiket {{ o?.number }}.</span>
          <button type="button" class="btn btn-ghost" @click="split(t)"><AppIcon name="plus" :size="16" /> Pisahkan jadi tiket baru</button>
          <button type="button" class="btn" :disabled="!o" @click="merge(t)"><AppIcon name="layers" :size="16" /> Gabungkan ke {{ o?.number }}</button>
        </footer>
      </template>
    </article>
  </div>
</template>

<style scoped>
.cl-head {
  flex-wrap: wrap;
  gap: 10px 16px;
}
.meter {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
  max-width: 320px;
}
.meter-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}
.meter-bar span {
  display: block;
  height: 100%;
  background: var(--warn);
}
.compare {
  display: grid;
  gap: 0;
}
@media (min-width: 900px) {
  .compare {
    grid-template-columns: 1fr auto 1fr;
  }
}
.side {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.desc {
  margin: 0;
}
.vs {
  display: grid;
  place-items: center;
  position: relative;
  padding: 0 4px;
}
.vs::before {
  content: '';
  position: absolute;
  inset: 0 50%;
  border-left: 1px dashed var(--line-strong);
}
.vs span {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
}
@media (max-width: 899px) {
  .vs {
    padding: 4px 0;
  }
  .vs::before {
    inset: 50% 0;
    border-left: 0;
    border-top: 1px dashed var(--line-strong);
  }
}
.photo {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 8px;
}
.map-toggle {
  border-top: 1px solid var(--line);
  padding: 0 16px;
}
.map-toggle summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  font-weight: 500;
  color: var(--ink-2);
}
.map-toggle[open] {
  padding-bottom: 16px;
}
.cl-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: 0 0 var(--radius) var(--radius);
}
@media (max-width: 640px) {
  .cl-foot .btn {
    flex: 1;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import AppIcon from '@/components/AppIcon.vue'
import { effectiveTicket, myTickets } from '@/services/maint'
import type { Ticket } from '@/types'
import { CATEGORY_ICON, CATEGORY_LABEL, TICKET_STATUS_LABEL, tanggal } from '@/utils/format'

const list = computed(() => myTickets())

// Merged reports show the parent ticket's status; cluster review is shown as "Diterima, dicek petugas".
function shownStatus(t: Ticket) {
  const e = effectiveTicket(t)
  return e.status
}
function statusLabel(t: Ticket) {
  const s = shownStatus(t)
  if (s === 'CLUSTER_REVIEW') return 'Diperiksa petugas'
  return TICKET_STATUS_LABEL[s]
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Tiket Saya"
      help="Daftar laporan kerusakan yang pernah Anda kirim. Ketuk laporan untuk melihat perkembangan perbaikan."
    />

    <RouterLink to="/pedagang/lapor" class="btn btn-accent btn-block">
      <AppIcon name="alert" /> Lapor Kerusakan Baru
    </RouterLink>

    <EmptyState v-if="!list.length" icon="ticket" title="Belum ada laporan" text="Laporan kerusakan yang Anda kirim akan muncul di sini." />

    <ul v-else class="list card-grid">
      <li v-for="t in list" :key="t.id">
        <RouterLink :to="`/pedagang/tiket/${t.id}`" class="card card-link stack">
          <div class="row between">
            <span class="bold mono">{{ effectiveTicket(t).number ?? 'Menunggu nomor tiket' }}</span>
            <StatusBadge :status="shownStatus(t)" :label="statusLabel(t)" />
          </div>
          <div class="row">
            <span class="ico" aria-hidden="true">{{ CATEGORY_ICON[t.category] }}</span>
            <div class="grow">
              <div class="bold">{{ CATEGORY_LABEL[t.category] }}</div>
              <div class="small muted">{{ t.location.label }} · {{ tanggal(t.createdAt) }}</div>
            </div>
            <AppIcon name="chevron" />
          </div>
          <p class="desc">{{ t.description }}</p>
          <div v-if="t.mergedInto" class="small muted">
            Laporan Anda digabung dengan laporan serupa agar ditangani bersama.
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ico {
  font-size: 1.8rem;
}
.desc {
  margin: 0;
  color: var(--ink-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

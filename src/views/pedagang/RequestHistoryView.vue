<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import AlertBox from '@/components/AlertBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { cancelRequest, myRequests, stallById } from '@/services/stall'
import { confirmDialog, toast } from '@/composables/ui'
import type { StallRequest } from '@/types'
import { REQUEST_STATUS_LABEL, rupiah, tanggal, tanggalJam } from '@/utils/format'

const props = defineProps<{ kind: 'NEW' | 'EXTEND' }>()

const list = computed(() => myRequests(props.kind))
const isNew = computed(() => props.kind === 'NEW')

interface Step {
  label: string
  state: 'done' | 'current' | 'failed' | ''
  note?: string
}

function steps(r: StallRequest): Step[] {
  const failed = r.status === 'REJECTED' || r.status === 'CANCELLED' || r.status === 'PAYMENT_FAILED'
  const s: Step[] = [
    { label: 'Diajukan', state: 'done', note: tanggalJam(r.createdAt) },
    {
      label: 'Diperiksa UPT Pasar / Petugas',
      state: r.status === 'PENDING' ? 'current' : 'done',
    },
  ]
  if (r.status === 'REJECTED') {
    s.push({ label: 'Ditolak', state: 'failed', note: r.decidedBy ? `oleh ${r.decidedBy}, ${tanggal(r.decidedAt)}` : '' })
    return s
  }
  if (r.status === 'CANCELLED') {
    s[1]!.state = 'failed'
    s.push({ label: 'Dibatalkan oleh Anda', state: 'failed' })
    return s
  }
  s.push({
    label: 'Disetujui',
    state: r.status === 'PENDING' ? '' : 'done',
    note: r.decidedAt ? `oleh ${r.decidedBy}, ${tanggal(r.decidedAt)}` : '',
  })
  s.push({
    label: r.status === 'PAYMENT_FAILED' ? 'Tidak dibayar dalam 3 hari' : 'Dibayar – selesai',
    state: r.status === 'COMPLETED' ? 'done' : r.status === 'APPROVED' ? 'current' : failed ? 'failed' : '',
  })
  return s
}

async function cancel(r: StallRequest) {
  const ok = await confirmDialog(
    'Batalkan pengajuan?',
    `Pengajuan untuk lapak ${stallById(r.stallId)?.code} akan dibatalkan dan tidak bisa dikembalikan.`,
    { okText: 'Ya, batalkan', danger: true },
  )
  if (!ok) return
  cancelRequest(r.id)
  toast('Pengajuan dibatalkan', 'info')
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      :title="isNew ? 'Riwayat Pengajuan Lapak' : 'Riwayat Perpanjangan'"
      :help="
        isNew
          ? 'Di sini Anda bisa melihat perkembangan semua pengajuan lapak, termasuk alasan jika ditolak.'
          : 'Di sini Anda bisa melihat perkembangan pengajuan perpanjangan sewa lapak.'
      "
    />

    <RouterLink :to="isNew ? '/pedagang/ajukan-lapak' : '/pedagang/perpanjangan'" class="btn btn-outline btn-block">
      {{ isNew ? '+ Ajukan Lapak Baru' : '+ Ajukan Perpanjangan' }}
    </RouterLink>

    <EmptyState
      v-if="!list.length"
      icon="list"
      title="Belum ada pengajuan"
      :text="isNew ? 'Pengajuan lapak yang Anda kirim akan muncul di sini.' : 'Pengajuan perpanjangan akan muncul di sini.'"
    />

    <ul v-else class="list card-grid">
      <li v-for="r in list" :key="r.id" class="card stack">
        <div class="row between">
          <div>
            <div class="big">Lapak {{ stallById(r.stallId)?.code ?? '-' }}</div>
            <div class="muted">{{ r.shopName }}</div>
          </div>
          <StatusBadge :status="r.status" :label="REQUEST_STATUS_LABEL[r.status]" />
        </div>

        <dl class="kv">
          <dt>Lokasi</dt>
          <dd>{{ stallById(r.stallId)?.location ?? '-' }}</dd>
          <dt>Biaya sewa</dt>
          <dd>{{ rupiah(r.price) }} / 6 bulan</dd>
          <template v-if="r.startDate">
            <dt>Mulai berlaku</dt>
            <dd>{{ tanggal(r.startDate) }}</dd>
          </template>
          <dt>Barang</dt>
          <dd>{{ r.goods.join(', ') }}</dd>
        </dl>

        <ol class="timeline" aria-label="Tahapan pengajuan">
          <li v-for="(s, i) in steps(r)" :key="i" :class="s.state">
            <div class="bold">{{ s.label }}</div>
            <div v-if="s.note" class="small muted">{{ s.note }}</div>
          </li>
        </ol>

        <AlertBox v-if="r.status === 'REJECTED' && r.rejectionReason" tone="bad" title="Alasan ditolak">
          {{ r.rejectionReason }}
        </AlertBox>

        <RouterLink
          v-if="r.status === 'APPROVED' && r.invoiceId"
          :to="`/pedagang/tagihan/${r.invoiceId}`"
          class="btn btn-accent btn-block"
        >
          Bayar Sewa Sekarang
        </RouterLink>
        <button v-if="r.status === 'PENDING'" type="button" class="btn btn-danger-outline btn-block" @click="cancel(r)">
          Batalkan Pengajuan
        </button>
      </li>
    </ul>
  </div>
</template>

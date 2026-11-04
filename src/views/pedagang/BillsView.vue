<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import AppIcon from '@/components/AppIcon.vue'
import { lateFee, myInvoices, totalDue } from '@/services/pay'
import { stallById } from '@/services/stall'
import { INVOICE_STATUS_LABEL, rupiah, tanggal } from '@/utils/format'

const tab = ref<'unpaid' | 'history'>('unpaid')
const unpaid = computed(() =>
  myInvoices()
    .filter((i) => i.status === 'UNPAID')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
)
const history = computed(() => myInvoices().filter((i) => i.status !== 'UNPAID'))
const list = computed(() => (tab.value === 'unpaid' ? unpaid.value : history.value))
const total = computed(() => unpaid.value.reduce((s, i) => s + totalDue(i), 0))
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Tagihan & Pembayaran"
      help="Daftar tagihan sewa lapak dan retribusi bulanan. Ketuk tagihan untuk membayar atau melihat rinciannya."
    />

    <div class="tabs" role="tablist">
      <button type="button" class="tab" role="tab" :aria-selected="tab === 'unpaid'" @click="tab = 'unpaid'">
        Belum Dibayar <span v-if="unpaid.length" class="count">{{ unpaid.length }}</span>
      </button>
      <button type="button" class="tab" role="tab" :aria-selected="tab === 'history'" @click="tab = 'history'">
        Riwayat
      </button>
    </div>

    <div v-if="tab === 'unpaid' && unpaid.length" class="card card-note row between">
      <span class="bold">Total yang harus dibayar</span>
      <span class="big">{{ rupiah(total) }}</span>
    </div>

    <EmptyState
      v-if="!list.length"
      icon="bill"
      :title="tab === 'unpaid' ? 'Tidak ada tagihan' : 'Belum ada riwayat'"
      :text="tab === 'unpaid' ? 'Semua tagihan Anda sudah lunas. Terima kasih!' : 'Pembayaran yang sudah selesai akan muncul di sini.'"
    />

    <ul v-else class="list card-grid">
      <li v-for="i in list" :key="i.id">
        <RouterLink :to="`/pedagang/tagihan/${i.id}`" class="card card-link stack">
          <div class="row between">
            <div>
              <div class="bold">{{ i.kind === 'SEWA' ? 'Sewa Lapak' : 'Retribusi Layanan Pasar' }}</div>
              <div class="small muted">Lapak {{ stallById(i.stallId)?.code }} · {{ i.period }}</div>
            </div>
            <StatusBadge :status="i.status" :label="INVOICE_STATUS_LABEL[i.status]" />
          </div>
          <dl class="kv">
            <dt>Nominal</dt>
            <dd>{{ rupiah(i.amount) }}</dd>
            <template v-if="i.status === 'UNPAID' && lateFee(i).fee">
              <dt>Denda telat</dt>
              <dd style="color: var(--bad)">+ {{ rupiah(lateFee(i).fee) }}</dd>
            </template>
            <template v-if="i.status === 'UNPAID'">
              <dt>Total</dt>
              <dd class="big">{{ rupiah(totalDue(i)) }}</dd>
              <dt>Jatuh tempo</dt>
              <dd>{{ tanggal(i.dueDate) }}</dd>
            </template>
            <template v-else-if="i.paidAt">
              <dt>Dibayar</dt>
              <dd>{{ tanggal(i.paidAt) }}</dd>
            </template>
          </dl>
          <div class="row" style="color: var(--brand)">
            <span class="bold grow">{{ i.status === 'UNPAID' ? 'Bayar sekarang' : 'Lihat rincian' }}</span>
            <AppIcon name="chevron" />
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

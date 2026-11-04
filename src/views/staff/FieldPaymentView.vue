<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import { db } from '@/data/db'
import { confirmDialog, online, toast } from '@/composables/ui'
import { invoicesForOfficer, lateFee, officerRecordPayment, syncOfflineQueue, totalDue } from '@/services/pay'
import { stallById } from '@/services/stall'
import type { Invoice, PayMethod } from '@/types'
import { PAY_METHOD_LABEL, rupiah, tanggal } from '@/utils/format'

const q = ref('')
const queuedIds = computed(() => new Set(db.offlineQueue.map((x) => x.invoiceId)))

function merchant(i: Invoice) {
  return db.users.find((u) => u.id === i.merchantId)
}

const list = computed(() => {
  const s = q.value.trim().toLowerCase()
  return invoicesForOfficer().filter((i) => {
    if (!s) return true
    const m = merchant(i)?.name.toLowerCase() ?? ''
    const c = stallById(i.stallId)?.code.toLowerCase() ?? ''
    return m.includes(s) || c.includes(s)
  })
})

const total = computed(() => list.value.reduce((sum, i) => sum + totalDue(i), 0))
const lateCount = computed(() => list.value.filter((i) => lateFee(i).fee).length)

const route = useRoute()
onMounted(() => {
  if (typeof route.query.q === 'string') q.value = route.query.q
})

const sel = ref<Invoice | null>(null)
const method = ref<PayMethod>('TUNAI_PETUGAS')
const result = ref<'paid' | 'queued' | null>(null)

function open(i: Invoice) {
  sel.value = i
  method.value = 'TUNAI_PETUGAS'
  result.value = null
}

async function record() {
  const i = sel.value
  if (!i) return
  const total = totalDue(i)
  if (!(await confirmDialog('Catat pembayaran?', `Pastikan uang ${rupiah(total)} sudah diterima dari ${merchant(i)?.name}.`, { okText: 'Ya, sudah diterima' }))) return
  result.value = officerRecordPayment(i.id, method.value)
}

function sync() {
  const n = syncOfflineQueue()
  if (n) toast(`${n} pembayaran berhasil dikirim. Bukti bayar sudah dikirim ke WhatsApp pedagang.`)
}

watch(online, (v) => {
  if (v && db.offlineQueue.length) sync()
})
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Catat Pembayaran"
      help="Untuk pedagang yang membayar tunai atau dibantu petugas. Pilih tagihan, terima uangnya, lalu catat. Bukti bayar dikirim lewat WhatsApp."
    />

    <AlertBox v-if="db.offlineQueue.length" tone="warn" :title="`${db.offlineQueue.length} pembayaran tersimpan di perangkat`">
      <div class="row-wrap between">
        <span>Belum terkirim karena tidak ada internet. Dikirim otomatis saat sinyal kembali.</span>
        <button type="button" class="btn btn-sm" :disabled="!online" @click="sync"><AppIcon name="refresh" :size="14" /> Kirim sekarang</button>
      </div>
    </AlertBox>

    <section class="panel">
      <div class="panel-head fp-head">
        <FilterBar v-model="q" placeholder="Cari nama pedagang atau kode lapak" label="Cari tagihan" class="grow" />
        <div class="fp-sum">
          <span><b class="mono">{{ list.length }}</b> tagihan</span>
          <span><b class="mono">{{ rupiah(total) }}</b></span>
          <span v-if="lateCount" class="badge tone-bad">! {{ lateCount }} terlambat</span>
        </div>
      </div>
      <EmptyState v-if="!list.length" icon="check" :title="q ? 'Tidak ditemukan' : 'Tidak ada tagihan'" :text="q ? 'Coba kata kunci lain.' : 'Semua tagihan sudah lunas.'" />
      <ul v-else class="rows">
        <li v-for="i in list" :key="i.id">
          <button type="button" class="row-item fp-row" :class="{ 'is-selected': sel?.id === i.id }" @click="open(i)">
            <span class="code-pill">{{ stallById(i.stallId)?.code }}</span>
            <span class="grow cell-stack">
              <span class="bold truncate">{{ merchant(i)?.name }}</span>
              <span class="cell-sub truncate">{{ i.kind === 'SEWA' ? 'Sewa lapak' : 'Retribusi' }} · {{ i.period }} · jatuh tempo {{ tanggal(i.dueDate) }}</span>
              <span v-if="queuedIds.has(i.id)" class="cell-sub warn">Tersimpan offline, menunggu dikirim</span>
            </span>
            <span class="fp-amt">
              <span class="mono bold">{{ rupiah(totalDue(i)) }}</span>
              <span v-if="lateFee(i).fee" class="badge tone-bad">Telat {{ lateFee(i).months }} bln</span>
            </span>
            <AppIcon name="chevron" :size="16" class="muted" />
          </button>
        </li>
      </ul>
    </section>

    <SidePanel
      v-if="sel"
      :title="`${stallById(sel.stallId)?.code} · ${merchant(sel)?.name}`"
      :subtitle="`${sel.kind === 'SEWA' ? 'Sewa lapak' : 'Retribusi layanan'} · ${sel.period}`"
      @close="sel = null"
    >
      <div class="amount">
        <span class="eyebrow">Total dibayar</span>
        <span class="amount-val mono">{{ rupiah(totalDue(sel)) }}</span>
        <span v-if="lateFee(sel).fee" class="small muted">
          Tagihan {{ rupiah(sel.amount) }} + denda {{ rupiah(lateFee(sel).fee) }} ({{ lateFee(sel).months }} bln × 2%)
        </span>
      </div>
      <div class="sp-section">
        <dl class="kv">
          <dt>Pedagang</dt><dd>{{ merchant(sel)?.name }}</dd>
          <dt>WhatsApp</dt><dd>{{ merchant(sel)?.whatsapp }}</dd>
          <dt>Jatuh tempo</dt><dd>{{ tanggal(sel.dueDate) }}</dd>
        </dl>
      </div>

      <div v-if="!result" class="sp-section">
        <h3>Cara bayar</h3>
        <div class="methods">
          <label class="method" :class="{ on: method === 'TUNAI_PETUGAS' }">
            <input v-model="method" type="radio" value="TUNAI_PETUGAS" class="sr-only" />
            <AppIcon name="cash" :size="22" /><span>Tunai</span>
          </label>
          <label class="method" :class="{ on: method === 'NONTUNAI_PETUGAS' }">
            <input v-model="method" type="radio" value="NONTUNAI_PETUGAS" class="sr-only" />
            <AppIcon name="qr" :size="22" /><span>Non-tunai</span>
          </label>
        </div>
        <p class="small muted" style="margin: 8px 0 0">{{ PAY_METHOD_LABEL[method] }}</p>
        <AlertBox v-if="!online" tone="warn" style="margin-top: 12px">Tidak ada internet. Pembayaran disimpan di perangkat dan dikirim nanti.</AlertBox>
      </div>
      <div v-else class="sp-section">
        <AlertBox v-if="result === 'paid'" tone="ok" title="Pembayaran tercatat">Bukti bayar sudah dikirim ke WhatsApp pedagang.</AlertBox>
        <AlertBox v-else tone="warn" title="Tersimpan di perangkat">Pembayaran disimpan offline dan dikirim otomatis saat ada internet.</AlertBox>
      </div>
      <template #footer>
        <template v-if="!result">
          <button type="button" class="btn btn-ghost" @click="sel = null">Batal</button>
          <button type="button" class="btn" @click="record"><AppIcon name="check" :size="16" /> Terima {{ rupiah(totalDue(sel)) }}</button>
        </template>
        <button v-else type="button" class="btn" @click="sel = null">Selesai</button>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.fp-head {
  flex-wrap: wrap;
}
.fp-sum {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.88rem;
  color: var(--ink-2);
}
.fp-row {
  min-height: 64px;
}
.fp-amt {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.warn {
  color: var(--warn);
  font-weight: 600;
}
.amount {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: var(--radius);
  background: var(--brand-soft);
}
.amount-val {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--brand);
  letter-spacing: -0.02em;
}
.methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.method {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 72px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  color: var(--ink-2);
}
.method.on {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand);
}
.method:has(input:focus-visible) {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
</style>

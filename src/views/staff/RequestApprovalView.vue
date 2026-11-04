<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import { decideRequest, leaseOfStall, stallById } from '@/services/stall'
import { HOLD_DAYS } from '@/services/pay'
import type { StallRequest } from '@/types'
import { REQUEST_STATUS_LABEL, STALL_TYPE_LABEL, daysBetween, relatif, rupiah, tanggal, tanggalJam } from '@/utils/format'

const tab = ref<StallRequest['kind']>('NEW')
function pending(kind: StallRequest['kind']) {
  return db.requests.filter((r) => r.kind === kind && r.status === 'PENDING').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
const q = ref('')
function matches(r: StallRequest) {
  const term = q.value.trim().toLowerCase()
  if (!term) return true
  return [r.shopName, stallById(r.stallId)?.code, name(r.merchantId)].some((x) => x?.toLowerCase().includes(term))
}
const list = computed(() => pending(tab.value).filter(matches))
const done = computed(() =>
  db.requests
    .filter((r) => r.kind === tab.value && r.status !== 'PENDING' && matches(r))
    .sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt))
    .slice(0, 25),
)

function age(r: StallRequest) {
  return daysBetween(new Date(r.createdAt), new Date())
}

// Deep link from the dashboard queue: /kelola/pengajuan?id=...
const route = useRoute()
onMounted(() => {
  const r = db.requests.find((x) => x.id === route.query.id)
  if (r) {
    tab.value = r.kind
    open(r)
  }
})

const sel = ref<StallRequest | null>(null)
const step = ref<'detail' | 'approve' | 'reject'>('detail')
const price = ref(0)
const reason = ref('')
const err = ref('')

function open(r: StallRequest) {
  sel.value = r
  step.value = 'detail'
  price.value = r.price
  reason.value = ''
  err.value = ''
}

const merchant = computed(() => db.users.find((u) => u.id === sel.value?.merchantId))
const stall = computed(() => stallById(sel.value?.stallId))
const lease = computed(() => (sel.value ? leaseOfStall(sel.value.stallId) : undefined))

async function approve() {
  const r = sel.value
  if (!r) return
  if (!price.value || price.value <= 0) {
    err.value = 'Isi harga sewa per 6 bulan.'
    return
  }
  if (!(await confirmDialog('Setujui pengajuan?', `Pedagang akan diminta membayar ${rupiah(price.value)} dalam ${HOLD_DAYS} hari.`, { okText: 'Ya, setujui' }))) return
  decideRequest(r.id, true, { price: price.value })
  toast('Pengajuan disetujui, tagihan sewa dikirim ke pedagang')
  sel.value = null
}

function reject() {
  const r = sel.value
  if (!r) return
  if (!reason.value.trim()) {
    err.value = 'Tulis alasan penolakan.'
    return
  }
  decideRequest(r.id, false, { reason: reason.value.trim() })
  toast('Pengajuan ditolak', 'info')
  sel.value = null
}

function name(id: string) {
  return db.users.find((u) => u.id === id)?.name ?? '-'
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Persetujuan Pengajuan"
      help="Periksa pengajuan sewa lapak baru dan perpanjangan dari pedagang. Setujui untuk menerbitkan tagihan sewa, atau tolak dengan alasan."
    />

    <div class="fb-row">
      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" :aria-selected="tab === 'NEW'" @click="tab = 'NEW'">
          Lapak baru<span class="count">{{ pending('NEW').length }}</span>
        </button>
        <button type="button" role="tab" class="tab" :aria-selected="tab === 'EXTEND'" @click="tab = 'EXTEND'">
          Perpanjangan<span class="count">{{ pending('EXTEND').length }}</span>
        </button>
      </div>
      <FilterBar v-model="q" placeholder="Cari kode lapak, nama lapak, pedagang" class="grow" />
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2 class="grow">Menunggu persetujuan</h2>
        <span class="badge tone-muted">{{ list.length }}</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Lapak</th>
              <th>Nama lapak</th>
              <th class="hide-sm">Pedagang</th>
              <th class="hide-md num">Harga / 6 bln</th>
              <th>Menunggu</th>
              <th class="hide-sm" aria-label="Aksi"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in list"
              :key="r.id"
              class="clickable"
              :class="{ 'is-selected': sel?.id === r.id }"
              tabindex="0"
              @click="open(r)"
              @keydown.enter="open(r)"
            >
              <td><span class="code-pill">{{ stallById(r.stallId)?.code }}</span></td>
              <td>
                <div class="cell-stack">
                  <span class="bold">{{ r.shopName }}</span>
                  <span class="cell-sub truncate">{{ r.goods.join(', ') }}</span>
                </div>
              </td>
              <td class="hide-sm">{{ name(r.merchantId) }}</td>
              <td class="hide-md num mono">{{ rupiah(r.price) }}</td>
              <td>
                <span class="badge" :class="age(r) >= 3 ? 'tone-warn' : 'tone-muted'">{{ age(r) ? `${age(r)} hari` : 'Hari ini' }}</span>
              </td>
              <td class="hide-sm num"><span class="btn btn-ghost btn-sm">Tinjau</span></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!list.length" class="table-empty">
          <AppIcon name="check" :size="20" /><br />Semua pengajuan sudah diproses.
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2 class="grow">Riwayat keputusan</h2>
        <span class="small muted">25 terakhir</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Lapak</th>
              <th>Nama lapak</th>
              <th class="hide-sm">Pedagang</th>
              <th>Status</th>
              <th class="hide-md">Diputuskan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in done" :key="r.id">
              <td><span class="code-pill">{{ stallById(r.stallId)?.code }}</span></td>
              <td>
                <div class="cell-stack">
                  <span>{{ r.shopName }}</span>
                  <span v-if="r.rejectionReason" class="cell-sub">Alasan: {{ r.rejectionReason }}</span>
                </div>
              </td>
              <td class="hide-sm">{{ name(r.merchantId) }}</td>
              <td><StatusBadge :status="r.status" :label="REQUEST_STATUS_LABEL[r.status]" /></td>
              <td class="hide-md">
                {{ r.decidedAt ? tanggal(r.decidedAt) : '-' }}
                <div class="cell-sub">{{ r.decidedBy ?? '' }}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!done.length" class="table-empty">Belum ada keputusan.</div>
      </div>
    </section>

    <SidePanel
      v-if="sel"
      :title="`${stall?.code ?? ''} · ${sel.shopName}`"
      :subtitle="`${sel.kind === 'NEW' ? 'Sewa lapak baru' : 'Perpanjangan sewa'} · diajukan ${relatif(sel.createdAt)}`"
      @close="sel = null"
    >
      <div class="sp-section">
        <h3>Pedagang</h3>
        <dl class="kv">
          <dt>Nama</dt><dd>{{ merchant?.name }}</dd>
          <dt>WhatsApp</dt><dd>{{ merchant?.whatsapp }}</dd>
          <dt>Diajukan</dt><dd>{{ tanggalJam(sel.createdAt) }}</dd>
        </dl>
      </div>
      <div class="sp-section">
        <h3>Lapak</h3>
        <dl class="kv">
          <dt>Kode</dt><dd>{{ stall?.code }}</dd>
          <dt>Lokasi</dt><dd>{{ stall?.location }}</dd>
          <dt>Tipe</dt><dd>{{ stall ? STALL_TYPE_LABEL[stall.type] : '-' }}</dd>
          <dt>Harga sewa</dt><dd class="mono">{{ rupiah(sel.price) }} / 6 bulan</dd>
          <template v-if="sel.kind === 'EXTEND'">
            <dt>Sewa sekarang berakhir</dt><dd>{{ tanggal(lease?.endDate) }}</dd>
            <dt>Perpanjangan mulai</dt><dd>{{ tanggal(sel.startDate) }}</dd>
          </template>
        </dl>
        <div style="margin-top: 12px">
          <div class="label">Barang yang dijual</div>
          <div class="chips"><span v-for="g in sel.goods" :key="g" class="chip chip-static">{{ g }}</span></div>
        </div>
      </div>

      <div v-if="step === 'approve'" class="sp-section">
        <label class="field">
          <span class="label">Harga sewa per 6 bulan (Rp) <span class="req">*</span></span>
          <input v-model.number="price" type="number" inputmode="numeric" min="0" class="input" />
          <span class="hint">{{ rupiah(price || 0) }} — belum termasuk retribusi bulanan.</span>
        </label>
        <AlertBox tone="info" style="margin-top: 12px">
          Sewa berlaku 6 bulan. Pedagang punya waktu {{ HOLD_DAYS }} hari untuk membayar, jika tidak lapak dilepas.
        </AlertBox>
      </div>
      <div v-if="step === 'reject'" class="sp-section">
        <label class="field">
          <span class="label">Alasan penolakan <span class="req">*</span></span>
          <textarea v-model="reason" class="textarea" placeholder="Contoh: Dokumen usaha belum lengkap." />
        </label>
      </div>
      <AlertBox v-if="err" tone="bad" style="margin-top: 12px">{{ err }}</AlertBox>

      <template #footer>
        <template v-if="step === 'detail'">
          <button type="button" class="btn btn-danger-outline" @click="step = 'reject'">Tolak</button>
          <button type="button" class="btn" @click="step = 'approve'"><AppIcon name="check" :size="16" /> Setujui</button>
        </template>
        <template v-else>
          <button type="button" class="btn btn-ghost" @click="step = 'detail'; err = ''">Kembali</button>
          <button v-if="step === 'approve'" type="button" class="btn" @click="approve">Setujui & terbitkan tagihan</button>
          <button v-else type="button" class="btn btn-danger" @click="reject">Kirim penolakan</button>
        </template>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.fb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
</style>

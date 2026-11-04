<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import AlertBox from '@/components/AlertBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import AppIcon from '@/components/AppIcon.vue'
import { db } from '@/data/db'
import { currentUser } from '@/services/auth'
import { generateQr, HOLD_DAYS, LATE_FEE_RATE, lateFee, qrValid, simulateGatewayPaid, totalDue } from '@/services/pay'
import { stallById } from '@/services/stall'
import { toast } from '@/composables/ui'
import { INVOICE_STATUS_LABEL, PAY_METHOD_LABEL, rupiah, tanggal, tanggalJam } from '@/utils/format'

const props = defineProps<{ id: string }>()

const inv = computed(() => db.invoices.find((i) => i.id === props.id && i.merchantId === currentUser.value?.id))
const stall = computed(() => stallById(inv.value?.stallId))
const fee = computed(() => (inv.value ? lateFee(inv.value) : { months: 0, fee: 0 }))
const petugas = computed(() => db.users.filter((u) => u.role === 'PETUGAS' && u.status === 'VERIFIED'))

// Clock ticks every second for the QR countdown; status polled every 3s (mirrors client polling in S-PAY-01).
const now = ref(Date.now())
const justPaid = ref(false)
let tick: ReturnType<typeof setInterval> | undefined
let poll: ReturnType<typeof setInterval> | undefined
const wasUnpaid = ref(inv.value?.status === 'UNPAID')

onMounted(() => {
  tick = setInterval(() => (now.value = Date.now()), 1000)
  poll = setInterval(() => {
    if (wasUnpaid.value && inv.value?.status === 'PAID') {
      justPaid.value = true
      wasUnpaid.value = false
    }
  }, 3000)
})
onBeforeUnmount(() => {
  clearInterval(tick)
  clearInterval(poll)
})

watch(
  () => inv.value?.status,
  (s) => {
    if (s === 'PAID' && wasUnpaid.value) {
      justPaid.value = true
      wasUnpaid.value = false
      toast('Pembayaran berhasil diterima. Terima kasih!')
    }
  },
)

const hasQr = computed(() => {
  void now.value
  return !!inv.value && qrValid(inv.value)
})
const qrExpired = computed(() => !!inv.value?.qr && !hasQr.value)
const remaining = computed(() => {
  const exp = inv.value?.qr ? new Date(inv.value.qr.expiresAt).getTime() : 0
  const s = Math.max(0, Math.floor((exp - now.value) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

const rentDeadline = computed(() => {
  const r = db.requests.find((x) => x.id === inv.value?.requestId)
  if (!r?.decidedAt) return inv.value?.dueDate
  return new Date(new Date(r.decidedAt).getTime() + HOLD_DAYS * 86400000).toISOString()
})

// Deterministic pseudo-QR from the payload string (visual only; a real gateway returns the QRIS image).
const N = 25
const cells = computed(() => {
  const code = inv.value?.qr?.code ?? ''
  let h = 2166136261
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 16777619)
  const rnd = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
  const out: { x: number; y: number }[] = []
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.5) out.push({ x, y })
  return out
})
const finders = [
  [0, 0],
  [N - 7, 0],
  [0, N - 7],
]

function makeQr() {
  generateQr(props.id)
  now.value = Date.now()
}

function simulate() {
  if (simulateGatewayPaid(props.id)) {
    justPaid.value = true
    wasUnpaid.value = false
    toast('Pembayaran berhasil diterima. Terima kasih!')
  }
}
</script>

<template>
  <EmptyState v-if="!inv" icon="bill" title="Tagihan tidak ditemukan">
    <RouterLink to="/pedagang/tagihan" class="btn">Kembali ke Tagihan</RouterLink>
  </EmptyState>

  <div v-else class="stack-lg page-narrow">
    <PageHeader
      :title="inv.kind === 'SEWA' ? 'Tagihan Sewa Lapak' : 'Tagihan Retribusi Bulanan'"
      :help="
        inv.status === 'UNPAID'
          ? `Total yang harus dibayar ${rupiah(totalDue(inv))}. Tekan tombol Buat Kode QR lalu pindai dengan aplikasi bank atau dompet digital.`
          : `Status tagihan: ${INVOICE_STATUS_LABEL[inv.status]}.`
      "
    />

    <AlertBox v-if="justPaid || inv.status === 'PAID'" tone="ok" title="Pembayaran lunas">
      <p>Terima kasih! Bukti bayar sudah dikirim ke WhatsApp Anda.</p>
      <RouterLink v-if="inv.kind === 'SEWA'" to="/pedagang/usaha" class="btn btn-block">Lihat Lapak Saya</RouterLink>
    </AlertBox>
    <AlertBox v-else-if="inv.status === 'EXPIRED' || inv.status === 'FAILED'" tone="bad" title="Tagihan tidak berlaku">
      Tagihan ini tidak dibayar sampai batas waktu, sehingga lapak dilepas dan bisa diajukan pedagang lain.
    </AlertBox>
    <AlertBox v-else-if="inv.kind === 'SEWA'" tone="warn" title="Batas bayar 3 hari">
      Bayar sebelum <b>{{ tanggalJam(rentDeadline) }}</b>. Jika lewat, lapak akan dilepas untuk pedagang lain.
    </AlertBox>

    <section class="card">
      <div class="row between" style="margin-bottom: 12px">
        <h2 style="margin: 0">Rincian</h2>
        <StatusBadge :status="inv.status" :label="INVOICE_STATUS_LABEL[inv.status]" />
      </div>
      <dl class="kv">
        <dt>Jenis retribusi</dt>
        <dd>{{ inv.kind === 'SEWA' ? 'Sewa lapak' : 'Layanan pasar' }}</dd>
        <dt>Lapak</dt>
        <dd>{{ stall?.code }} – {{ stall?.location }}</dd>
        <dt>Periode</dt>
        <dd>{{ inv.period }}</dd>
        <dt>Nominal</dt>
        <dd>{{ rupiah(inv.amount) }}</dd>
        <template v-if="inv.status === 'UNPAID'">
          <dt>Jatuh tempo</dt>
          <dd>{{ tanggal(inv.dueDate) }}</dd>
          <template v-if="fee.fee">
            <dt>Denda telat</dt>
            <dd style="color: var(--bad)">
              {{ rupiah(fee.fee) }}
              <span class="small muted" style="display: block">
                {{ LATE_FEE_RATE * 100 }}% × {{ rupiah(inv.amount) }} × {{ fee.months }} bulan terlambat
              </span>
            </dd>
          </template>
          <dt>Total bayar</dt>
          <dd class="big">{{ rupiah(totalDue(inv)) }}</dd>
        </template>
        <template v-if="inv.status === 'PAID'">
          <dt>Cara bayar</dt>
          <dd>{{ inv.method ? PAY_METHOD_LABEL[inv.method] : '-' }}</dd>
          <template v-if="inv.recordedBy">
            <dt>Dicatat oleh</dt>
            <dd>{{ inv.recordedBy }}</dd>
          </template>
          <dt>Waktu terkonfirmasi</dt>
          <dd>{{ tanggalJam(inv.paidAt) }}</dd>
        </template>
      </dl>
    </section>

    <template v-if="inv.status === 'UNPAID' && !justPaid">
      <section class="card stack center">
        <h2>Bayar dengan QRIS</h2>
        <template v-if="hasQr">
          <svg class="qr" :viewBox="`-2 -2 ${N + 4} ${N + 4}`" role="img" aria-label="Kode QR pembayaran">
            <rect x="-2" y="-2" :width="N + 4" :height="N + 4" fill="#fff" />
            <rect v-for="(c, i) in cells" :key="i" :x="c.x" :y="c.y" width="1" height="1" fill="#000" />
            <g v-for="(f, i) in finders" :key="'f' + i">
              <rect :x="f[0]" :y="f[1]" width="7" height="7" fill="#000" />
              <rect :x="(f[0] ?? 0) + 1" :y="(f[1] ?? 0) + 1" width="5" height="5" fill="#fff" />
              <rect :x="(f[0] ?? 0) + 2" :y="(f[1] ?? 0) + 2" width="3" height="3" fill="#000" />
            </g>
          </svg>
          <div class="big">{{ rupiah(totalDue(inv)) }}</div>
          <p class="muted">
            Kode berlaku <b class="mono">{{ remaining }}</b> lagi. Buka aplikasi bank / dompet digital, pilih
            "Bayar QRIS", lalu arahkan kamera ke kode di atas.
          </p>
          <p class="small muted">Halaman ini akan berubah otomatis setelah pembayaran diterima.</p>
          <button type="button" class="btn btn-ghost btn-block" @click="simulate">
            Simulasi (demo): saya sudah bayar
          </button>
        </template>
        <template v-else>
          <AlertBox v-if="qrExpired" tone="warn">Kode QR sebelumnya sudah tidak berlaku. Buat kode baru.</AlertBox>
          <p class="muted">Kode QR berlaku selama 1 jam setelah dibuat.</p>
          <button type="button" class="btn btn-block" @click="makeQr">
            <AppIcon name="qr" /> {{ qrExpired ? 'Buat Ulang Kode QR' : 'Buat Kode QR' }}
          </button>
        </template>
      </section>

      <section class="card stack">
        <div class="row">
          <AppIcon name="cash" :size="32" />
          <h2 class="grow" style="margin: 0">Tidak bisa pakai QRIS?</h2>
        </div>
        <p>
          Tidak apa-apa. Anda bisa <b>bayar tunai ke petugas lapangan</b> saat beliau berkeliling pasar.
          Bukti bayar tetap dikirim lewat WhatsApp.
        </p>
        <div v-for="p in petugas" :key="p.id" class="card-note row">
          <AppIcon name="user" />
          <div class="grow">
            <div class="bold">{{ p.name }}</div>
            <div class="small muted">Petugas Lapangan · WA {{ p.whatsapp }}</div>
          </div>
          <a
            class="btn btn-outline btn-sm"
            :href="`https://wa.me/62${p.whatsapp.replace(/^0/, '')}`"
            target="_blank"
            rel="noopener"
          >
            <AppIcon name="whatsapp" :size="20" /> Hubungi
          </a>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.qr {
  width: min(260px, 80%);
  margin: 0 auto;
  display: block;
  border: 2px solid var(--line);
  border-radius: 12px;
  shape-rendering: crispEdges;
}
</style>

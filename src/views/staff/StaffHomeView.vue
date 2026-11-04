<script setup lang="ts">
// Staff home: headline numbers, one prioritised work queue, and today's context on the side.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import KpiCard from '@/components/console/KpiCard.vue'
import { db } from '@/data/db'
import { currentUser, userName, VERIFY_SLA_DAYS } from '@/services/auth'
import { isFinalizedToday } from '@/services/info'
import { totalDue } from '@/services/pay'
import { stallById } from '@/services/stall'
import { dateKey, daysBetween, relatif, rupiah, rupiahRingkas, ROLE_LABEL } from '@/utils/format'

const u = computed(() => currentUser.value)
const isUpt = computed(() => u.value?.role === 'UPT')
const now = new Date()

const greeting = computed(() => {
  const h = now.getHours()
  const part = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam'
  return `Selamat ${part}, ${u.value?.name.split(' ')[0] ?? ''}`
})
const today = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ---------- KPIs ----------
const paid = computed(() => db.invoices.filter((i) => i.status === 'PAID' && i.paidAt))
const last7 = computed(() =>
  Array.from({ length: 7 }, (_, k) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - k))
    const key = dateKey(d)
    return paid.value.filter((i) => dateKey(new Date(i.paidAt!)) === key).reduce((s, i) => s + i.amount, 0)
  }),
)
const collectedMonth = computed(() => {
  const list = paid.value.filter((i) => {
    const d = new Date(i.paidAt!)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  return { sum: list.reduce((s, i) => s + i.amount, 0), n: list.length }
})
const collectedToday = computed(() => {
  const key = dateKey(now)
  const list = paid.value.filter((i) => dateKey(new Date(i.paidAt!)) === key)
  return { sum: list.reduce((s, i) => s + i.amount, 0), n: list.length }
})
const arrears = computed(() => {
  const list = db.invoices.filter((i) => i.status === 'UNPAID')
  const overdue = list.filter((i) => new Date(i.dueDate) < now).length
  return { sum: list.reduce((s, i) => s + totalDue(i), 0), n: list.length, overdue }
})
const occupancy = computed(() => {
  const rentable = db.stalls.filter((s) => s.status !== 'NOT_AVAILABLE')
  const booked = rentable.filter((s) => s.status === 'BOOKED').length
  return { pct: rentable.length ? Math.round((booked / rentable.length) * 100) : 0, free: rentable.length - booked, booked, total: rentable.length }
})
const damage = computed(() => {
  const open = db.tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'CLUSTER_REVIEW')
  return { n: open.length, high: open.filter((t) => t.systemUrgency === 'TINGGI').length }
})

// ---------- Work queue ----------
interface Task {
  key: string
  icon: string
  tone: 'bad' | 'warn' | 'info' | 'ok'
  kind: string
  title: string
  sub: string
  chip?: { text: string; tone: 'bad' | 'warn' | 'muted' | 'info' }
  to: string
  cta: string
  score: number
}

const tasks = computed<Task[]>(() => {
  const t: Task[] = []
  if (isUpt.value) {
    for (const x of db.users.filter((v) => v.status === 'PENDING')) {
      const left = VERIFY_SLA_DAYS - daysBetween(new Date(x.lastRequestAt), now)
      t.push({
        key: 'u' + x.id,
        icon: 'shield',
        tone: left <= 0 ? 'bad' : 'info',
        kind: 'Verifikasi pendaftaran',
        title: x.name,
        sub: `${ROLE_LABEL[x.role]} · diajukan ${relatif(x.lastRequestAt)}`,
        chip: left <= 0 ? { text: 'Lewat batas', tone: 'bad' } : { text: `Sisa ${left} hari`, tone: left === 1 ? 'warn' : 'muted' },
        to: `/kelola/verifikasi-user?id=${x.id}`,
        cta: 'Periksa',
        score: left <= 0 ? 100 : 60 - left,
      })
    }
  }
  for (const r of db.requests.filter((v) => v.status === 'PENDING')) {
    const age = daysBetween(new Date(r.createdAt), now)
    t.push({
      key: 'r' + r.id,
      icon: r.kind === 'NEW' ? 'store' : 'refresh',
      tone: age >= 3 ? 'warn' : 'info',
      kind: r.kind === 'NEW' ? 'Pengajuan lapak baru' : 'Perpanjangan sewa',
      title: `${stallById(r.stallId)?.code ?? '-'} · ${r.shopName}`,
      sub: `${userName(r.merchantId)} · ${relatif(r.createdAt)}`,
      chip: age >= 3 ? { text: `${age} hari menunggu`, tone: 'warn' } : undefined,
      to: `/kelola/pengajuan?id=${r.id}`,
      cta: 'Tinjau',
      score: 50 + age,
    })
  }
  for (const k of db.tickets.filter((v) => v.status === 'CLUSTER_REVIEW')) {
    t.push({
      key: 'c' + k.id,
      icon: 'layers',
      tone: 'warn',
      kind: 'Cek laporan mirip',
      title: k.description,
      sub: `${k.location.label} · ${relatif(k.createdAt)}`,
      chip: k.similarity ? { text: `Mirip ${Math.round(k.similarity * 100)}%`, tone: 'info' } : undefined,
      to: '/kelola/clustering',
      cta: 'Cek',
      score: 70,
    })
  }
  for (const k of db.tickets.filter((v) => (v.status === 'OPEN' || v.status === 'IN_PROGRESS') && v.systemUrgency === 'TINGGI')) {
    t.push({
      key: 'd' + k.id,
      icon: 'alert',
      tone: 'bad',
      kind: 'Kerusakan urgensi tinggi',
      title: k.description,
      sub: `${k.number ?? ''} · ${k.location.label}`,
      chip: { text: k.status === 'OPEN' ? 'Belum ditangani' : 'Sedang diperbaiki', tone: k.status === 'OPEN' ? 'bad' : 'muted' },
      to: `/kelola/kerusakan/${k.id}`,
      cta: 'Buka',
      score: k.status === 'OPEN' ? 90 : 40,
    })
  }
  const unfinal = db.commodities.filter((c) => !isFinalizedToday(c.id)).length
  if (unfinal)
    t.push({
      key: 'price',
      icon: 'chart',
      tone: 'info',
      kind: 'Harga harian',
      title: `${unfinal} dari ${db.commodities.length} komoditas belum final`,
      sub: 'Harga hari ini tampil di beranda publik setelah difinalkan',
      to: '/kelola/harga-harian',
      cta: 'Input harga',
      score: now.getHours() >= 10 ? 65 : 30,
    })
  if (arrears.value.overdue)
    t.push({
      key: 'arrears',
      icon: 'cash',
      tone: 'warn',
      kind: 'Tagihan lewat jatuh tempo',
      title: `${arrears.value.overdue} tagihan perlu ditagih ke pedagang`,
      sub: `Total tunggakan ${rupiah(arrears.value.sum)}`,
      to: '/kelola/pembayaran',
      cta: 'Tagih',
      score: isUpt.value ? 20 : 80,
    })
  return t.sort((a, b) => b.score - a.score)
})

// ---------- Side column ----------
const priceDone = computed(() => db.commodities.filter((c) => isFinalizedToday(c.id)).length)

const activity = computed(() => {
  const ev: { key: string; icon: string; text: string; sub: string; at: string }[] = []
  for (const i of paid.value)
    ev.push({
      key: 'i' + i.id,
      icon: 'cash',
      text: `${stallById(i.stallId)?.code ?? '-'} membayar ${rupiah(i.amount)}`,
      sub: i.recordedBy ? `dicatat ${i.recordedBy}` : 'QRIS',
      at: i.paidAt!,
    })
  for (const r of db.requests.filter((x) => x.decidedAt))
    ev.push({
      key: 'r' + r.id,
      icon: r.status === 'REJECTED' ? 'close' : 'check',
      text: `${r.kind === 'NEW' ? 'Pengajuan' : 'Perpanjangan'} ${stallById(r.stallId)?.code ?? ''} ${r.status === 'REJECTED' ? 'ditolak' : 'disetujui'}`,
      sub: r.decidedBy ?? '',
      at: r.decidedAt!,
    })
  for (const k of db.tickets)
    ev.push({ key: 't' + k.id, icon: 'wrench', text: `Laporan baru: ${k.description}`, sub: k.location.label, at: k.createdAt })
  return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
})

const shortcuts = computed(() => {
  const q = [
    { to: '/kelola/pengumuman', label: 'Buat pengumuman', icon: 'megaphone' },
    { to: '/kelola/komoditas', label: 'Komoditas', icon: 'basket' },
    { to: '/kelola/riwayat-harga', label: 'Riwayat harga', icon: 'clock' },
    { to: '/peta', label: 'Peta pasar publik', icon: 'map' },
  ]
  if (isUpt.value)
    q.unshift(
      { to: '/kelola/lapak', label: 'Master lapak', icon: 'layout' },
      { to: '/kelola/retribusi', label: 'Master retribusi', icon: 'bill' },
    )
  return q
})
</script>

<template>
  <div class="home">
    <header class="home-head">
      <div>
        <p class="eyebrow">{{ today }}</p>
        <h1>{{ greeting }}</h1>
        <p class="muted home-sub">
          {{ tasks.length ? `Ada ${tasks.length} pekerjaan menunggu Anda.` : 'Tidak ada pekerjaan yang menunggu.' }}
        </p>
      </div>
      <div class="row-wrap">
        <RouterLink v-if="isUpt" to="/kelola/lapak?baru=1" class="btn btn-outline"><AppIcon name="plus" :size="16" /> Tambah lapak</RouterLink>
        <RouterLink to="/kelola/pembayaran" class="btn"><AppIcon name="cash" :size="16" /> Catat pembayaran</RouterLink>
      </div>
    </header>

    <section class="kpis" aria-label="Ringkasan">
      <KpiCard
        v-if="isUpt"
        label="Retribusi bulan ini"
        icon="cash"
        :value="rupiahRingkas(collectedMonth.sum)"
        :hint="`${collectedMonth.n} pembayaran · 7 hari terakhir`"
        :series="last7"
      />
      <KpiCard
        v-else
        label="Tertagih hari ini"
        icon="cash"
        :value="rupiahRingkas(collectedToday.sum)"
        :hint="`${collectedToday.n} pembayaran hari ini`"
        :series="last7"
        to="/kelola/pembayaran"
      />
      <KpiCard
        label="Tunggakan"
        icon="bill"
        :value="rupiahRingkas(arrears.sum)"
        :hint="arrears.overdue ? `${arrears.overdue} lewat jatuh tempo · ${arrears.n} tagihan` : `${arrears.n} tagihan belum dibayar`"
        :tone="arrears.overdue ? 'bad' : undefined"
        to="/kelola/pembayaran"
      />
      <KpiCard
        label="Keterisian lapak"
        icon="layout"
        :value="occupancy.pct + '%'"
        :progress="occupancy.pct"
        :hint="`${occupancy.booked} dari ${occupancy.total} terisi · ${occupancy.free} tersedia`"
        :to="isUpt ? '/kelola/lapak' : undefined"
      />
      <KpiCard
        label="Kerusakan terbuka"
        icon="wrench"
        :value="String(damage.n)"
        :hint="damage.high ? `${damage.high} urgensi tinggi` : 'Tidak ada yang mendesak'"
        :tone="damage.high ? 'bad' : 'ok'"
        to="/kelola/kerusakan"
      />
    </section>

    <div class="home-grid">
      <section class="panel" aria-labelledby="q-title">
        <div class="panel-head">
          <AppIcon name="inbox" :size="18" />
          <h2 id="q-title" class="grow">Antrian kerja</h2>
          <span class="muted small hide-sm">Urut dari yang paling mendesak</span>
        </div>
        <ul v-if="tasks.length" class="rows">
          <li v-for="t in tasks" :key="t.key">
            <RouterLink :to="t.to" class="row-item task">
              <span class="ico-tile" :class="'tone-' + t.tone"><AppIcon :name="t.icon" :size="16" /></span>
              <span class="grow task-text">
                <span class="task-kind">{{ t.kind }}</span>
                <span class="task-title truncate">{{ t.title }}</span>
                <span class="task-sub truncate">{{ t.sub }}</span>
              </span>
              <span v-if="t.chip" class="badge" :class="'tone-' + t.chip.tone">{{ t.chip.text }}</span>
              <span class="btn btn-ghost btn-sm task-cta">{{ t.cta }}</span>
            </RouterLink>
          </li>
        </ul>
        <EmptyState v-else icon="check" title="Semua beres" text="Tidak ada pekerjaan yang menunggu. Kerja bagus!" />
      </section>

      <aside class="side-col">
        <section class="panel">
          <div class="panel-head">
            <AppIcon name="chart" :size="18" />
            <h2 class="grow">Harga hari ini</h2>
            <span class="mono small bold">{{ priceDone }}/{{ db.commodities.length }}</span>
          </div>
          <div class="panel-body stack">
            <div class="bar" aria-hidden="true">
              <span :style="{ width: (db.commodities.length ? (priceDone / db.commodities.length) * 100 : 0) + '%' }" />
            </div>
            <p class="small muted" style="margin: 0">
              {{ priceDone === db.commodities.length ? 'Semua harga sudah final dan tampil di beranda publik.' : `${db.commodities.length - priceDone} komoditas belum difinalkan.` }}
            </p>
            <RouterLink to="/kelola/harga-harian" class="btn btn-ghost btn-sm">Buka input harga</RouterLink>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <AppIcon name="clock" :size="18" />
            <h2 class="grow">Aktivitas terbaru</h2>
          </div>
          <ul class="rows feed">
            <li v-for="e in activity" :key="e.key" class="feed-item">
              <span class="feed-ico"><AppIcon :name="e.icon" :size="14" /></span>
              <span class="grow feed-text">
                <span class="truncate">{{ e.text }}</span>
                <span class="small muted truncate">{{ e.sub }}{{ e.sub ? ' · ' : '' }}{{ relatif(e.at) }}</span>
              </span>
            </li>
          </ul>
        </section>

        <section class="panel">
          <div class="panel-head">
            <AppIcon name="layers" :size="18" />
            <h2 class="grow">Pintasan</h2>
          </div>
          <ul class="rows">
            <li v-for="q in shortcuts" :key="q.to">
              <RouterLink :to="q.to" class="row-item shortcut">
                <AppIcon :name="q.icon" :size="16" />
                <span class="grow">{{ q.label }}</span>
                <AppIcon name="chevron" :size="14" class="muted" />
              </RouterLink>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.home-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
}
.home-head h1 {
  margin: 2px 0;
}
.home-sub {
  margin: 0;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (min-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.home-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}
@media (min-width: 1100px) {
  .home-grid {
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  }
}
.home-grid > * {
  min-width: 0;
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.task {
  min-height: 64px;
}
.task-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.task-kind {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
}
.task-title {
  font-weight: 600;
}
.task-sub {
  font-size: 0.82rem;
  color: var(--muted);
}
.task-cta {
  pointer-events: none;
}
@media (max-width: 640px) {
  .task-cta {
    display: none;
  }
}
.bar {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--brand);
  border-radius: inherit;
}
.feed-item {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  align-items: flex-start;
}
.feed-ico {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--ink-2);
  display: grid;
  place-items: center;
  flex: none;
  margin-top: 1px;
}
.feed-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.35;
}
.shortcut {
  min-height: 44px;
  font-weight: 500;
}
</style>

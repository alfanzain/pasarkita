<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AlertBox from '@/components/AlertBox.vue'
import { currentUser } from '@/services/auth'
import { myInvoices, totalDue, lateFee } from '@/services/pay'
import { daysLeft, hasRunningExtension, myLeases, myRequests, stallById } from '@/services/stall'
import { rupiah, tanggal } from '@/utils/format'

const firstName = computed(() => currentUser.value?.name.split(' ')[0] ?? '')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
})

const unpaid = computed(() => myInvoices().filter((i) => i.status === 'UNPAID'))
const unpaidTotal = computed(() => unpaid.value.reduce((s, i) => s + totalDue(i), 0))
const lateCount = computed(() => unpaid.value.filter((i) => lateFee(i).fee > 0).length)

const endingSoon = computed(() =>
  myLeases().filter((l) => daysLeft(l.endDate) <= 30 && !hasRunningExtension(l.stallId)),
)

const waitingPayment = computed(() =>
  [...myRequests('NEW'), ...myRequests('EXTEND')].filter((r) => r.status === 'APPROVED'),
)

const tiles = [
  { to: '/pedagang/ajukan-lapak', label: 'Ajukan Lapak', icon: 'plus' },
  { to: '/pedagang/perpanjangan', label: 'Perpanjang Sewa', icon: 'refresh' },
  { to: '/pedagang/tagihan', label: 'Bayar Tagihan', icon: 'bill' },
  { to: '/pedagang/lapor', label: 'Lapor Kerusakan', icon: 'alert' },
]
</script>

<template>
  <div class="stack-lg">
    <header>
      <h1>{{ greeting }}, {{ firstName }} 👋</h1>
      <p class="muted">Apa yang ingin Anda lakukan hari ini?</p>
    </header>

    <!-- Things that need attention come first -->
    <section v-if="unpaid.length || endingSoon.length || waitingPayment.length" class="stack" aria-label="Perlu perhatian">
      <RouterLink v-if="unpaid.length" to="/pedagang/tagihan" class="card card-link urgent bad">
        <div class="row">
          <AppIcon name="bill" :size="32" />
          <div class="grow">
            <div class="bold">{{ unpaid.length }} tagihan belum dibayar</div>
            <div class="big">{{ rupiah(unpaidTotal) }}</div>
            <div v-if="lateCount" class="small">{{ lateCount }} tagihan sudah lewat jatuh tempo (ada denda)</div>
          </div>
          <AppIcon name="chevron" />
        </div>
      </RouterLink>

      <RouterLink
        v-for="r in waitingPayment"
        :key="r.id"
        :to="r.invoiceId ? `/pedagang/tagihan/${r.invoiceId}` : '/pedagang/tagihan'"
        class="card card-link urgent warn"
      >
        <div class="row">
          <AppIcon name="check" :size="32" />
          <div class="grow">
            <div class="bold">Pengajuan lapak {{ stallById(r.stallId)?.code }} disetujui!</div>
            <div class="small">Segera bayar sewa {{ rupiah(r.price) }} dalam 3 hari agar lapak tidak dilepas.</div>
          </div>
          <AppIcon name="chevron" />
        </div>
      </RouterLink>

      <div v-for="l in endingSoon" :key="l.id" class="card urgent warn stack">
        <div class="row">
          <AppIcon name="clock" :size="32" />
          <div class="grow">
            <div class="bold">Sewa lapak {{ stallById(l.stallId)?.code }} hampir habis</div>
            <div class="small">
              Berakhir {{ tanggal(l.endDate) }}
              ({{ daysLeft(l.endDate) >= 0 ? `${daysLeft(l.endDate)} hari lagi` : 'sudah lewat' }}).
              Apakah Anda ingin melanjutkan sewa?
            </div>
          </div>
        </div>
        <RouterLink to="/pedagang/perpanjangan" class="btn btn-block">Ya, perpanjang sewa</RouterLink>
      </div>
    </section>

    <AlertBox v-else tone="ok" title="Semua beres">Tidak ada tagihan atau urusan yang perlu segera diselesaikan.</AlertBox>

    <section>
      <h2>Menu utama</h2>
      <div class="grid-2">
        <RouterLink v-for="t in tiles" :key="t.to" :to="t.to" class="card card-link tile">
          <span class="tile-icon"><AppIcon :name="t.icon" :size="32" /></span>
          <span class="bold">{{ t.label }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="stack">
      <h2>Lainnya</h2>
      <RouterLink to="/pedagang/usaha" class="card card-link row">
        <AppIcon name="store" /> <span class="grow bold">Lapak Saya</span> <AppIcon name="chevron" />
      </RouterLink>
      <RouterLink to="/pedagang/riwayat-pengajuan" class="card card-link row">
        <AppIcon name="list" /> <span class="grow bold">Riwayat Pengajuan Lapak</span> <AppIcon name="chevron" />
      </RouterLink>
      <RouterLink to="/pedagang/riwayat-perpanjangan" class="card card-link row">
        <AppIcon name="clock" /> <span class="grow bold">Riwayat Perpanjangan</span> <AppIcon name="chevron" />
      </RouterLink>
      <RouterLink to="/pedagang/tiket" class="card card-link row">
        <AppIcon name="ticket" /> <span class="grow bold">Tiket Laporan Saya</span> <AppIcon name="chevron" />
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 130px;
  text-align: center;
}
.tile-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--brand-soft);
  color: var(--brand);
}
.urgent {
  border-width: 2px;
}
.urgent.bad {
  border-color: var(--bad);
  background: var(--bad-soft);
}
.urgent.warn {
  border-color: var(--warn);
  background: var(--warn-soft);
}
</style>

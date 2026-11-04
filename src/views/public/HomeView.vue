<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AnnouncementCard from '@/components/AnnouncementCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { MARKET_NAME } from '@/config'
import { db } from '@/data/db'
import { currentUser, homeFor } from '@/services/auth'
import { latestPrice, visibleAnnouncements } from '@/services/info'
import { rupiah, tanggal } from '@/utils/format'

const HOME_ANNOUNCEMENTS = 3

const announcements = computed(() => visibleAnnouncements())
const latest = computed(() => announcements.value.slice(0, HOME_ANNOUNCEMENTS))

const prices = computed(() =>
  db.commodities
    .map((c) => ({ c, p: latestPrice(c.id) }))
    .filter((x): x is { c: (typeof x)['c']; p: NonNullable<(typeof x)['p']> } => !!x.p),
)
const priceDate = computed(() => prices.value[0]?.p.date)

function trend(pct: number) {
  if (Math.abs(pct) < 0.5) return { icon: '=', tone: 'tone-muted', label: 'Tetap' }
  return pct > 0
    ? { icon: '▲', tone: 'tone-bad', label: 'Naik' }
    : { icon: '▼', tone: 'tone-ok', label: 'Turun' }
}

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 11
    ? 'Selamat pagi'
    : h < 15
      ? 'Selamat siang'
      : h < 18
        ? 'Selamat sore'
        : 'Selamat malam'
})
</script>

<template>
  <div class="stack-lg">
    <section class="hero card">
      <div class="hero-text">
        <p class="small bold hero-kicker">{{ greeting }} 👋</p>
        <h1>{{ MARKET_NAME }}</h1>
        <p class="muted">Cek harga hari ini, cari barang, dan lihat pengumuman pasar.</p>
      </div>
      <div class="hero-actions">
        <div class="grid-2">
          <RouterLink to="/cari" class="tile">
            <AppIcon name="search" :size="32" />
            <span>Cari Barang</span>
          </RouterLink>
          <RouterLink to="/peta" class="tile">
            <AppIcon name="map" :size="32" />
            <span>Peta Pasar</span>
          </RouterLink>
        </div>
        <RouterLink
          v-if="currentUser"
          :to="homeFor(currentUser)"
          class="btn btn-block"
          style="margin-top: 12px"
        >
          Ke Beranda Saya
        </RouterLink>
        <RouterLink v-else to="/masuk" class="btn btn-outline btn-block" style="margin-top: 12px">
          Pedagang / Petugas? Masuk di sini
        </RouterLink>
      </div>
    </section>

    <div class="split">
      <section class="prices-section">
        <div class="section-title">
          <div>
            <h2>Harga Hari Ini</h2>
            <p class="small muted" style="margin: 0">
              Rata-rata harga di pasar · {{ tanggal(priceDate) }}
            </p>
          </div>
        </div>
        <ul class="legend" aria-label="Keterangan tanda harga">
          <li><span class="badge tone-bad">▲</span> Naik dari kemarin</li>
          <li><span class="badge tone-ok">▼</span> Turun</li>
          <li><span class="badge tone-muted">=</span> Tetap</li>
        </ul>
        <ul class="prices">
          <li v-for="{ c, p } in prices" :key="c.id" class="card card-tight price">
            <span class="emoji" aria-hidden="true">{{ c.emoji }}</span>
            <div class="grow">
              <div class="bold">{{ c.name }}</div>
              <div class="small muted">per {{ c.unit }}</div>
            </div>
            <div class="amount">
              <div class="today">
                <span class="small muted">Hari ini</span>
                <span class="big mono">{{ rupiah(p.avg) }}</span>
                <span
                  class="badge"
                  :class="trend(p.pct).tone"
                  :aria-label="trend(p.pct).label"
                  :title="trend(p.pct).label"
                  >{{ trend(p.pct).icon }}</span
                >
              </div>
              <div v-if="p.prevAvg !== null" class="small muted mono">
                Kemarin {{ rupiah(p.prevAvg) }}
              </div>
            </div>
          </li>
        </ul>
      </section>
      <section class="announcements">
        <div class="section-title">
          <h2>Pengumuman</h2>
        </div>
        <EmptyState v-if="!announcements.length" icon="megaphone" title="Belum ada pengumuman" />
        <ul v-else class="list">
          <li v-for="a in latest" :key="a.id">
            <AnnouncementCard :item="a" clamp />
          </li>
        </ul>
        <RouterLink
          v-if="announcements.length > HOME_ANNOUNCEMENTS"
          to="/pengumuman"
          class="btn btn-outline btn-block"
          style="margin-top: 12px"
        >
          Lihat semua pengumuman ({{ announcements.length }})
        </RouterLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  gap: 4px 32px;
  background: linear-gradient(160deg, var(--accent-soft), var(--surface));
}
@media (min-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    padding: 28px;
  }
  .hero h1 {
    font-size: 1.8rem;
  }
}
/* Phones: announcements first, as before; desktop: prices main column, announcements aside */
.announcements {
  order: -1;
}
@media (min-width: 900px) {
  .announcements {
    order: 0;
  }
}
.hero-kicker {
  color: var(--accent-strong);
  margin-bottom: 4px;
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 104px;
  border-radius: var(--radius);
  background: var(--brand);
  color: #fff;
  text-decoration: none;
  font-size: 1.05rem;
}
.tile:nth-child(2) {
  background: var(--accent);
  color: var(--accent-ink);
}
.legend {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.prices {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
@media (min-width: 600px) {
  .prices {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.price {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
/* Keep the commodity name readable; the price drops to its own line when the card is narrow. */
.price .grow {
  min-width: 8.5em;
}
.emoji {
  font-size: 2rem;
  width: 44px;
  text-align: center;
  flex: none;
}
.amount {
  text-align: right;
  flex: none;
  margin-left: auto;
}
.today {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}
.today .small {
  width: 100%;
}
</style>

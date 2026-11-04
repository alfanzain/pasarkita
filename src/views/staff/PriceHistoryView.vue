<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import SparkLine from '@/components/SparkLine.vue'
import { db } from '@/data/db'
import { commodityById, history, latestPrice } from '@/services/info'
import { rupiah } from '@/utils/format'

const selId = ref(db.commodities[0]?.id ?? '')
const sel = computed(() => commodityById(selId.value))
const range = ref<14 | 30>(14)
const rows = computed(() => history(selId.value).slice(-range.value))
const stats = computed(() => {
  const v = rows.value.map((r) => r.avg)
  if (!v.length) return null
  const first = v[0]!
  const last = v[v.length - 1]!
  return { min: Math.min(...v), max: Math.max(...v), last, change: first ? ((last - first) / first) * 100 : 0 }
})

const W = 640
const H = 240
const P = { l: 56, r: 12, t: 16, b: 30 }
const chart = computed(() => {
  const v = rows.value.map((r) => r.avg)
  if (v.length < 2) return null
  const min = Math.min(...v)
  const max = Math.max(...v)
  const span = max - min || 1
  const x = (i: number) => P.l + (i / (v.length - 1)) * (W - P.l - P.r)
  const y = (n: number) => P.t + (1 - (n - min) / span) * (H - P.t - P.b)
  return {
    area: `M${x(0).toFixed(1)} ${H - P.b} ` + v.map((n, i) => `L${x(i).toFixed(1)} ${y(n).toFixed(1)}`).join(' ') + ` L${x(v.length - 1).toFixed(1)} ${H - P.b} Z`,
    d: v.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(n).toFixed(1)}`).join(' '),
    pts: v.map((n, i) => ({ x: x(i), y: y(n) })),
    ticks: [max, (max + min) / 2, min].map((n) => ({ y: y(n), label: Math.round(n / 1000) + 'rb' })),
    xs: rows.value
      .map((r, i) => ({ x: x(i), label: shortDate(r.date) }))
      .filter((_, i, a) => i === 0 || i === a.length - 1 || i % Math.ceil(a.length / 6) === 0),
  }
})

function shortDate(k: string) {
  return new Date(k + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const table = computed(() =>
  [...rows.value].reverse().map((r, i, a) => {
    const prev = a[i + 1]
    return { ...r, diff: prev ? r.avg - prev.avg : 0 }
  }),
)
</script>

<template>
  <div class="stack-lg">
    <PageHeader title="Riwayat Harga" help="Perubahan harga rata-rata setiap komoditas dari hari ke hari." />

    <div class="ph-grid">
      <section v-if="sel" class="panel ph-detail">
        <div class="panel-head">
          <span class="emoji" aria-hidden="true">{{ sel.emoji }}</span>
          <div class="grow">
            <h2>{{ sel.name }}</h2>
            <span class="small muted">per {{ sel.unit }}</span>
          </div>
          <div class="tabs" role="tablist" aria-label="Rentang waktu">
            <button type="button" role="tab" class="tab" :aria-selected="range === 14" @click="range = 14">14 hari</button>
            <button type="button" role="tab" class="tab" :aria-selected="range === 30" @click="range = 30">30 hari</button>
          </div>
        </div>
        <div class="panel-body stack">
          <div v-if="stats" class="stats">
            <div><div class="eyebrow">Terakhir</div><div class="stat mono">{{ rupiah(stats.last) }}</div></div>
            <div>
              <div class="eyebrow">Perubahan</div>
              <div class="stat mono" :class="stats.change > 0 ? 'up' : stats.change < 0 ? 'down' : ''">
                {{ stats.change > 0 ? '▲' : stats.change < 0 ? '▼' : '' }} {{ Math.abs(stats.change).toFixed(1) }}%
              </div>
            </div>
            <div><div class="eyebrow">Terendah</div><div class="stat mono">{{ rupiah(stats.min) }}</div></div>
            <div><div class="eyebrow">Tertinggi</div><div class="stat mono">{{ rupiah(stats.max) }}</div></div>
          </div>
          <svg v-if="chart" :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" :aria-label="`Grafik harga ${sel.name}`">
            <defs>
              <linearGradient id="ph-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" style="stop-color: var(--brand); stop-opacity: 0.18" />
                <stop offset="1" style="stop-color: var(--brand); stop-opacity: 0" />
              </linearGradient>
            </defs>
            <g v-for="t in chart.ticks" :key="t.y">
              <line :x1="P.l" :x2="W - P.r" :y1="t.y" :y2="t.y" style="stroke: var(--line)" stroke-dasharray="3 3" />
              <text :x="P.l - 8" :y="t.y + 4" text-anchor="end" class="ax">{{ t.label }}</text>
            </g>
            <text v-for="x in chart.xs" :key="x.x" :x="x.x" :y="H - 8" text-anchor="middle" class="ax">{{ x.label }}</text>
            <path :d="chart.area" fill="url(#ph-fill)" />
            <path :d="chart.d" fill="none" style="stroke: var(--brand)" stroke-width="2" stroke-linejoin="round" />
            <circle v-for="(p, i) in chart.pts" :key="i" :cx="p.x" :cy="p.y" r="2.5" style="fill: var(--surface); stroke: var(--brand)" stroke-width="1.5" />
          </svg>
          <p v-else class="muted">Belum cukup data untuk grafik.</p>
        </div>
        <div class="table-wrap flat">
          <table class="table">
            <thead><tr><th>Tanggal</th><th class="num">Rata-rata</th><th class="num">Perubahan</th></tr></thead>
            <tbody>
              <tr v-for="r in table" :key="r.date">
                <td>{{ shortDate(r.date) }}</td>
                <td class="num mono bold">{{ rupiah(r.avg) }}</td>
                <td class="num mono" :class="r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : 'muted'">
                  {{ r.diff > 0 ? '▲ ' : r.diff < 0 ? '▼ ' : '' }}{{ r.diff ? rupiah(Math.abs(r.diff)) : '–' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel ph-list">
        <div class="panel-head"><h2 class="grow">Komoditas</h2><span class="small muted">{{ db.commodities.length }}</span></div>
        <ul class="rows">
          <li v-for="c in db.commodities" :key="c.id">
            <button type="button" class="row-item" :class="{ 'is-selected': selId === c.id }" :aria-pressed="selId === c.id" @click="selId = c.id">
              <span class="emoji-sm" aria-hidden="true">{{ c.emoji }}</span>
              <span class="grow cell-stack">
                <span class="bold">{{ c.name }}</span>
                <span v-if="latestPrice(c.id)" class="small">
                  <span class="mono">{{ rupiah(latestPrice(c.id)!.avg) }}</span>
                  <span :class="latestPrice(c.id)!.diff > 0 ? 'up' : latestPrice(c.id)!.diff < 0 ? 'down' : 'muted'">
                    {{ latestPrice(c.id)!.diff > 0 ? '▲' : latestPrice(c.id)!.diff < 0 ? '▼' : '=' }}
                    {{ Math.abs(latestPrice(c.id)!.pct).toFixed(1) }}%
                  </span>
                </span>
                <span v-else class="small muted">Belum ada data</span>
              </span>
              <SparkLine v-if="latestPrice(c.id)" :values="latestPrice(c.id)!.series" :width="64" :height="24" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ph-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}
@media (min-width: 1100px) {
  .ph-grid {
    grid-template-columns: 320px minmax(0, 1fr);
  }
  .ph-list {
    order: -1;
    position: sticky;
    top: calc(var(--top-h) + 16px);
    max-height: calc(100dvh - var(--top-h) - 32px);
    overflow-y: auto;
  }
}
.ph-detail .panel-head h2 {
  margin: 0;
}
.emoji {
  font-size: 1.6rem;
}
.emoji-sm {
  font-size: 1.25rem;
  width: 28px;
  text-align: center;
}
.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (min-width: 640px) {
  .stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.stat {
  font-size: 1.15rem;
  font-weight: 700;
}
.chart {
  width: 100%;
  height: auto;
}
.ax {
  font-size: 11px;
  fill: var(--muted);
  font-variant-numeric: tabular-nums;
}
.flat {
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 0 0 var(--radius) var(--radius);
  box-shadow: none;
  max-height: 360px;
  overflow-y: auto;
}
.up {
  color: var(--bad);
  font-weight: 600;
}
.down {
  color: var(--ok);
  font-weight: 600;
}
</style>

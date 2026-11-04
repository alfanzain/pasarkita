<script setup lang="ts">
import { computed, nextTick, reactive } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageHeader from '@/components/PageHeader.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import {
  addPriceEntry,
  finalizeCommodity,
  isFinalizedToday,
  latestPrice,
  removePriceEntry,
  todayEntries,
} from '@/services/info'
import { leaseOfStall } from '@/services/stall'
import { rupiah, tanggal } from '@/utils/format'

const leasedStalls = computed(() => db.stalls.filter((s) => leaseOfStall(s.id)).sort((a, b) => a.code.localeCompare(b.code)))
// Per-commodity input drafts, created up front so the template never mutates state while rendering.
const drafts = reactive<Record<string, { price: number | null; stall: string }>>(
  Object.fromEntries(db.commodities.map((c) => [c.id, { price: null, stall: '' }])),
)
function draft(id: string) {
  return (drafts[id] ??= { price: null, stall: '' })
}

function avg(id: string) {
  const e = todayEntries(id)
  return e.length ? Math.round(e.reduce((s, x) => s + x.price, 0) / e.length) : 0
}

function add(id: string, focusNext = false) {
  const d = draft(id)
  if (!d.price || d.price <= 0) {
    toast('Isi harga terlebih dahulu', 'bad')
    return
  }
  addPriceEntry(id, d.price, d.stall)
  d.price = null
  // Spreadsheet feel: Enter saves and jumps to the next commodity's price box.
  if (focusNext) {
    const i = db.commodities.findIndex((c) => c.id === id)
    const next = db.commodities[i + 1]
    if (next) nextTick(() => document.getElementById('price-' + next.id)?.focus())
  }
}

// Vs. last finalized price; >25% away is flagged so typos (Rp 3.500 vs Rp 35.000) get a second look.
function delta(id: string, price: number) {
  const last = latestPrice(id)?.avg
  return last ? ((price - last) / last) * 100 : null
}
function suspicious(id: string, price: number) {
  const d = delta(id, price)
  return d !== null && Math.abs(d) > 25
}
const doneCount = computed(() => db.commodities.filter((c) => isFinalizedToday(c.id)).length)
const readyCount = computed(() => db.commodities.filter((c) => todayEntries(c.id).length && !isFinalizedToday(c.id)).length)

function finalize(id: string) {
  if (finalizeCommodity(id)) toast('Harga rata-rata disimpan dan tampil di beranda publik')
  else toast('Belum ada harga yang diinput', 'bad')
}

async function finalizeAll() {
  const ready = db.commodities.filter((c) => todayEntries(c.id).length)
  if (!ready.length) {
    toast('Belum ada harga yang diinput hari ini', 'bad')
    return
  }
  if (!(await confirmDialog('Finalisasi semua?', `${ready.length} komoditas akan dihitung rata-ratanya dan tampil di beranda publik.`, { okText: 'Ya, finalisasi' }))) return
  ready.forEach((c) => finalizeCommodity(c.id))
  toast(`${ready.length} komoditas difinalisasi`)
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="stack-lg dp">
    <PageHeader
      title="Harga Harian"
      :help="`Harga yang Anda temui di pasar hari ini, ${tanggal(new Date().toISOString())}. Boleh lebih dari satu harga per barang — sistem menghitung rata-ratanya.`"
    />

    <AlertBox tone="info">
      Tekan <b>Enter</b> setelah mengetik harga untuk menyimpan dan lanjut ke barang berikutnya. <b>Finalisasi</b> menampilkan
      rata-rata di beranda publik; pukul 23.59 sistem otomatis menyimpan harga hari ini ke riwayat.
    </AlertBox>

    <section class="panel">
      <div class="sheet-head" aria-hidden="true">
        <span>Komoditas</span>
        <span class="num">Terakhir</span>
        <span>Harga masuk hari ini</span>
        <span>Tambah harga</span>
        <span class="num">Rata-rata</span>
        <span class="num">Status</span>
      </div>
      <article v-for="c in db.commodities" :key="c.id" class="sheet-row" :class="{ final: isFinalizedToday(c.id) }">
        <div class="c-name">
          <span class="emoji" aria-hidden="true">{{ c.emoji }}</span>
          <span class="cell-stack">
            <span class="bold">{{ c.name }}</span>
            <span class="cell-sub">per {{ c.unit }}</span>
          </span>
        </div>
        <div class="num mono c-last">
          <span class="lbl-sm">Terakhir </span>{{ latestPrice(c.id) ? rupiah(latestPrice(c.id)!.avg) : '–' }}
        </div>
        <div class="c-entries">
          <span v-if="!todayEntries(c.id).length" class="cell-sub">Belum ada</span>
          <span
            v-for="e in todayEntries(c.id)"
            :key="e.id"
            class="entry"
            :class="{ warn: suspicious(c.id, e.price) }"
            :title="`${e.stallCode ? 'Lapak ' + e.stallCode : 'Tanpa lapak'} · ${e.by} ${time(e.at)}${suspicious(c.id, e.price) ? ' · beda jauh dari harga terakhir, cek lagi' : ''}`"
          >
            <span class="mono">{{ rupiah(e.price) }}</span>
            <span v-if="e.stallCode" class="entry-stall">{{ e.stallCode }}</span>
            <button type="button" class="entry-x" :aria-label="'Hapus harga ' + rupiah(e.price)" @click="removePriceEntry(e.id)">
              <AppIcon name="close" :size="12" />
            </button>
          </span>
        </div>
        <div class="c-input">
          <select v-model="draft(c.id).stall" class="select sel" :aria-label="'Lapak untuk ' + c.name">
            <option value="">Lapak</option>
            <option v-for="s in leasedStalls" :key="s.id" :value="s.code">{{ s.code }} – {{ leaseOfStall(s.id)?.shopName }}</option>
          </select>
          <span class="price-in">
            <span class="prefix">Rp</span>
            <input
              :id="'price-' + c.id"
              v-model.number="draft(c.id).price"
              type="number"
              inputmode="numeric"
              min="0"
              class="input mono"
              placeholder="0"
              :aria-label="'Harga ' + c.name"
              @keydown.enter.prevent="add(c.id, true)"
            />
          </span>
          <button type="button" class="icon-btn add" :aria-label="'Tambah harga ' + c.name" @click="add(c.id)"><AppIcon name="plus" :size="16" /></button>
        </div>
        <div class="num c-avg">
          <template v-if="avg(c.id)">
            <span class="mono bold">{{ rupiah(avg(c.id)) }}</span>
            <span v-if="delta(c.id, avg(c.id)) !== null" class="cell-sub mono" :class="delta(c.id, avg(c.id))! > 0 ? 'up' : delta(c.id, avg(c.id))! < 0 ? 'down' : ''">
              {{ delta(c.id, avg(c.id))! > 0 ? '▲' : delta(c.id, avg(c.id))! < 0 ? '▼' : '=' }} {{ Math.abs(delta(c.id, avg(c.id))!).toFixed(1) }}%
            </span>
          </template>
          <span v-else class="muted">–</span>
        </div>
        <div class="num c-status">
          <span v-if="isFinalizedToday(c.id)" class="badge tone-ok">✓ Final</span>
          <button v-else type="button" class="btn btn-ghost btn-sm" :disabled="!todayEntries(c.id).length" @click="finalize(c.id)">Finalisasi</button>
        </div>
      </article>
    </section>

    <div class="final-bar">
      <div class="fb-progress">
        <span class="small"><b class="mono">{{ doneCount }}/{{ db.commodities.length }}</b> final</span>
        <span class="bar" aria-hidden="true"><span :style="{ width: (db.commodities.length ? (doneCount / db.commodities.length) * 100 : 0) + '%' }" /></span>
      </div>
      <span class="small muted grow hide-sm">{{ readyCount ? `${readyCount} komoditas siap difinalkan` : 'Masukkan harga untuk mulai' }}</span>
      <button type="button" class="btn btn-sm" :disabled="!readyCount" @click="finalizeAll"><AppIcon name="check" :size="14" /> Finalisasi semua</button>
    </div>
  </div>
</template>

<style scoped>
.dp {
  padding-bottom: 64px;
}
.sheet-head,
.sheet-row {
  display: grid;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
}
.sheet-head {
  display: none;
}
.sheet-row + .sheet-row {
  border-top: 1px solid var(--line);
}
.sheet-row {
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'name status'
    'last avg'
    'entries entries'
    'input input';
}
.c-name {
  grid-area: name;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.c-last {
  grid-area: last;
  text-align: left;
  color: var(--ink-2);
}
.c-entries {
  grid-area: entries;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.c-input {
  grid-area: input;
  display: flex;
  gap: 6px;
  align-items: center;
}
.c-avg {
  grid-area: avg;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.c-status {
  grid-area: status;
}
.lbl-sm {
  font-size: 0.8rem;
  color: var(--muted);
}
@media (min-width: 1280px) {
  .sheet-head,
  .sheet-row {
    grid-template-columns: minmax(130px, 1fr) 92px minmax(130px, 1.4fr) minmax(240px, 1.5fr) 96px 96px;
    grid-template-areas: 'name last entries input avg status';
  }
  .sheet-head {
    display: grid;
    padding-top: 8px;
    padding-bottom: 8px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line);
    border-radius: var(--radius) var(--radius) 0 0;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .c-last {
    text-align: right;
  }
  .lbl-sm {
    display: none;
  }
}
.sheet-row.final {
  background: #fbfdfc;
}
.sheet-row:focus-within {
  background: #f8fbfa;
  box-shadow: inset 3px 0 0 var(--brand);
}
.emoji {
  font-size: 1.3rem;
  width: 28px;
  text-align: center;
}
.entry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 2px 0 8px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 0.82rem;
}
.entry.warn {
  background: var(--warn-soft);
  border-color: #f0c770;
  color: var(--warn);
}
.entry-stall {
  color: var(--muted);
  font-size: 0.75rem;
}
.entry-x {
  appearance: none;
  border: 0;
  background: none;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  color: var(--muted);
  cursor: pointer;
}
.entry-x:hover {
  background: var(--surface-3);
  color: var(--bad);
}
.sel {
  width: 110px;
  flex: none;
}
.price-in {
  position: relative;
  flex: 1;
  min-width: 0;
}
.price-in .input {
  padding-left: 30px;
  text-align: right;
}
.prefix {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.85rem;
  pointer-events: none;
}
.add {
  border: 1px solid var(--line-strong);
  flex: none;
}
.up {
  color: var(--bad);
}
.down {
  color: var(--ok);
}
.final-bar {
  position: fixed;
  z-index: 30;
  left: 12px;
  right: 12px;
  bottom: calc(var(--nav-h) + 12px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 14px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
}
@media (min-width: 1024px) {
  .final-bar {
    left: calc(252px + 32px);
    right: 32px;
    bottom: 20px;
  }
  :global(.rail .final-bar) {
    left: calc(64px + 32px);
  }
}
.fb-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar {
  width: 96px;
  height: 6px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--brand);
}
</style>

<script setup lang="ts">
// Interactive market map. One area (floor + area letter) is shown at a time, picked from a building
// overview. Stalls are real buttons laid out in % of the area grid, so text can wrap and truncate.
// Used by the public map, stall request, stall master (drag to place), search and damage-report tagging.
// variant 'goods' (public) colours by the area's goods zone; 'status' shows rental status.
import { computed, nextTick, ref, watch } from 'vue'
import AreaSwitcher from './AreaSwitcher.vue'
import { db } from '@/data/db'
import { zoneOfArea } from '@/services/goods'
import { areaById, leaseOfStall, stallById } from '@/services/stall'
import type { LandmarkKind, Stall } from '@/types'

type Mode = 'view' | 'pick-stall' | 'pick-point' | 'edit'
interface Marker {
  id: string
  areaId?: string
  x: number
  y: number
  label: string
  tone?: string
}

const props = withDefaults(
  defineProps<{
    mode?: Mode
    stalls?: Stall[]
    selectedId?: string | null
    highlightIds?: string[]
    pendingIds?: string[]
    point?: { areaId?: string; x: number; y: number } | null
    markers?: Marker[]
    // Kept for compatibility: names are always shown when the box is large enough.
    showShopNames?: boolean
    legend?: boolean
    variant?: 'status' | 'goods'
    // Switch to this stall's area, scroll it into view and pulse it.
    focusId?: string | null
    // Show the building overview (floor/area picker).
    switcher?: boolean
  }>(),
  { mode: 'view', legend: true, showShopNames: false, variant: 'status', focusId: null, switcher: true },
)

const emit = defineEmits<{
  select: [stall: Stall]
  pick: [point: { areaId: string; x: number; y: number }]
  move: [id: string, x: number, y: number]
}>()

const areaModel = defineModel<string | undefined>('area')
const all = computed(() => props.stalls ?? db.stalls)
const findStall = (id?: string | null) => (id ? (all.value.find((s) => s.id === id) ?? stallById(id)) : undefined)

function initialArea() {
  return (
    areaModel.value ??
    findStall(props.focusId)?.areaId ??
    findStall(props.selectedId)?.areaId ??
    findStall(props.highlightIds?.[0])?.areaId ??
    props.point?.areaId ??
    props.markers?.find((m) => m.areaId)?.areaId ??
    db.areas[0]?.id ??
    '1A'
  )
}
const current = ref(initialArea())
const areaId = computed({
  get: () => areaModel.value ?? current.value,
  set: (v: string) => {
    current.value = v
    areaModel.value = v
  },
})
const area = computed(() => areaById(areaId.value))
const zone = computed(() => zoneOfArea(areaId.value))
const goods = computed(() => props.variant === 'goods')
const list = computed(() => all.value.filter((s) => s.areaId === areaId.value))
const highlightSet = computed(() => new Set(props.highlightIds ?? []))
const dim = computed(() => highlightSet.value.size > 0)
const visibleMarkers = computed(() => (props.markers ?? []).filter((m) => !m.areaId || m.areaId === areaId.value))

// Per-area counts for the building overview: search matches, or markers (damage reports).
const badges = computed<Record<string, number> | undefined>(() => {
  const counts: Record<string, number> = {}
  if (highlightSet.value.size) {
    for (const id of highlightSet.value) {
      const a = findStall(id)?.areaId
      if (a) counts[a] = (counts[a] ?? 0) + 1
    }
    return counts
  }
  if (props.markers?.some((m) => m.areaId)) {
    for (const m of props.markers) if (m.areaId) counts[m.areaId] = (counts[m.areaId] ?? 0) + 1
    return counts
  }
  return undefined
})

// When a search no longer matches anything here, jump to the first area that does.
watch(
  () => props.highlightIds,
  (ids) => {
    if (!ids?.length) return
    if (ids.some((id) => findStall(id)?.areaId === areaId.value)) return
    const a = findStall(ids[0])?.areaId
    if (a) areaId.value = a
  },
)
watch(
  () => props.selectedId,
  (id) => {
    const a = findStall(id)?.areaId
    if (a && a !== areaId.value) areaId.value = a
  },
)

const zoom = ref(1)
const scrollEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLElement | null>(null)
const pulseId = ref<string | null>(null)

watch(
  () => props.focusId,
  async (id) => {
    const s = findStall(id)
    if (!s) return
    areaId.value = s.areaId
    await nextTick()
    scrollEl.value
      ?.querySelector(`[data-stall="${s.id}"]`)
      ?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    pulseId.value = s.id
    setTimeout(() => {
      if (pulseId.value === s.id) pulseId.value = null
    }, 1600)
  },
  { immediate: true },
)

function pct(v: number, of: number) {
  return `${(v / of) * 100}%`
}
function box(r: { x: number; y: number; w: number; h: number }) {
  const a = area.value
  if (!a) return {}
  return { left: pct(r.x, a.cols), top: pct(r.y, a.rows), width: pct(r.w, a.cols), height: pct(r.h, a.rows) }
}

function toGrid(e: PointerEvent | MouseEvent) {
  const el = canvasEl.value
  const a = area.value
  if (!el || !a) return null
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * a.cols
  const y = ((e.clientY - r.top) / r.height) * a.rows
  return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 }
}

function onCanvasClick(e: MouseEvent) {
  if (props.mode !== 'pick-point' || !area.value) return
  const p = toGrid(e)
  if (!p) return
  emit('pick', {
    areaId: areaId.value,
    x: Math.min(area.value.cols, Math.max(0, p.x)),
    y: Math.min(area.value.rows, Math.max(0, p.y)),
  })
}

function onStallClick(s: Stall, e: MouseEvent) {
  if (props.mode === 'pick-point') return onCanvasClick(e)
  if (dragging.value) return
  emit('select', s)
}

// Drag to reposition (UPT stall master).
const drag = ref<{ id: string; dx: number; dy: number } | null>(null)
const dragging = ref(false)
function onDown(e: PointerEvent, s: Stall) {
  if (props.mode !== 'edit' || s.id !== props.selectedId) return
  const p = toGrid(e)
  if (!p) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  drag.value = { id: s.id, dx: p.x - s.x, dy: p.y - s.y }
}
function onMove(e: PointerEvent) {
  const d = drag.value
  const a = area.value
  if (!d || !a) return
  const p = toGrid(e)
  const s = list.value.find((x) => x.id === d.id)
  if (!p || !s) return
  const nx = Math.min(a.cols - s.w, Math.max(0, p.x - d.dx))
  const ny = Math.min(a.rows - s.h, Math.max(0, p.y - d.dy))
  if (nx !== s.x || ny !== s.y) {
    dragging.value = true
    emit('move', s.id, nx, ny)
  }
}
function onUp() {
  drag.value = null
  setTimeout(() => (dragging.value = false), 0)
}

function shopName(s: Stall) {
  return leaseOfStall(s.id)?.shopName ?? ''
}

function stateOf(s: Stall) {
  if (goods.value) return leaseOfStall(s.id) ? 'shop' : 'empty'
  if (props.pendingIds?.includes(s.id)) return 'st-pending'
  return { AVAILABLE: 'st-available', BOOKED: 'st-booked', NOT_AVAILABLE: 'st-na' }[s.status]
}

function secondLine(s: Stall) {
  const name = shopName(s)
  if (goods.value) return name || 'Kosong'
  if (props.pendingIds?.includes(s.id)) return 'Sedang diajukan'
  if (s.status === 'AVAILABLE') return 'Tersedia'
  if (s.status === 'NOT_AVAILABLE') return 'Tidak disewakan'
  return name || 'Disewa'
}

function ariaFor(s: Stall) {
  return `Lapak ${s.code}, ${secondLine(s)}`
}

const LANDMARK: Record<LandmarkKind, { icon: string; label: string }> = {
  PINTU: { icon: '⬇', label: 'Pintu area' },
  TANGGA: { icon: '🪜', label: 'Tangga' },
  WC: { icon: '🚻', label: 'WC' },
  MUSHOLA: { icon: '🕌', label: 'Mushola' },
  KANTOR: { icon: '🏢', label: 'Kantor UPT' },
  GUDANG: { icon: '📦', label: 'Gudang' },
}
const presentLandmarks = computed(() => [...new Set((area.value?.landmarks ?? []).map((l) => l.kind))])
</script>

<template>
  <div class="map-wrap" :style="{ '--z': zone.fill, '--zi': zone.ink }">
    <AreaSwitcher v-if="props.switcher" v-model="areaId" :badges="badges" />

    <div v-if="area" class="area-head">
      <div class="grow">
        <div class="area-title">
          <span class="area-id">{{ area.id }}</span>
          Lantai {{ area.floor }} · Area {{ area.letter }}
        </div>
        <div class="area-zone">{{ zone.icon }} {{ area.name }}</div>
      </div>
      <button v-if="zoom > 1" type="button" class="btn btn-ghost btn-sm reset" @click="zoom = 1">Ukuran awal</button>
      <button type="button" class="btn btn-ghost btn-sm zbtn" :disabled="zoom <= 1" aria-label="Perkecil peta" @click="zoom = Math.max(1, zoom - 0.5)">−</button>
      <button type="button" class="btn btn-ghost btn-sm zbtn" :disabled="zoom >= 2.5" aria-label="Perbesar peta" @click="zoom = Math.min(2.5, zoom + 0.5)">+</button>
    </div>
    <p class="hint small muted">
      <template v-if="props.mode === 'pick-point'">Ketuk peta untuk menandai lokasi</template>
      <template v-else-if="props.mode === 'edit'">Ketuk lapak, lalu geser untuk memindah</template>
      <template v-else>Ketuk kotak lapak untuk melihat detail</template>
    </p>

    <div ref="scrollEl" class="map-scroll">
      <div
        v-if="area"
        ref="canvasEl"
        class="canvas"
        :class="{ crosshair: props.mode === 'pick-point', 'has-dim': dim }"
        :style="{ aspectRatio: `${area.cols} / ${area.rows}`, width: zoom * 100 + '%' }"
        role="group"
        :aria-label="`Denah ${area.id}: ${area.name}`"
        @click="onCanvasClick"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <div v-for="(l, i) in area.aisles" :key="'a' + i" class="aisle" :style="box(l)">
          <span v-if="l.label">{{ l.label }}</span>
        </div>

        <div
          v-for="(l, i) in area.landmarks"
          :key="'l' + i"
          class="landmark"
          :class="'lm-' + l.kind.toLowerCase()"
          :style="box(l)"
        >
          <span aria-hidden="true">{{ LANDMARK[l.kind].icon }}</span>
          <span class="lm-text">{{ LANDMARK[l.kind].label }}</span>
        </div>

        <button
          v-for="s in list"
          :key="s.id"
          type="button"
          class="stall"
          :class="[
            stateOf(s),
            {
              dim: dim && !highlightSet.has(s.id),
              hl: highlightSet.has(s.id),
              sel: s.id === props.selectedId,
              pulse: s.id === pulseId,
              draggable: props.mode === 'edit' && s.id === props.selectedId,
            },
          ]"
          :style="box(s)"
          :data-stall="s.id"
          :aria-label="ariaFor(s)"
          :aria-pressed="s.id === props.selectedId"
          :tabindex="props.mode === 'pick-point' ? -1 : 0"
          @click.stop="onStallClick(s, $event)"
          @pointerdown="onDown($event, s)"
        >
          <!-- Buttons can't be size containers reliably, so the inner wrapper is -->
          <span class="inner">
            <span class="code">{{ s.code }}</span>
            <span class="name">{{ secondLine(s) }}</span>
          </span>
        </button>

        <div
          v-for="m in visibleMarkers"
          :key="m.id"
          class="pin"
          :style="{ left: pct(m.x, area.cols), top: pct(m.y, area.rows), '--pin': m.tone ?? 'var(--bad)' }"
        >
          <span class="pin-label">{{ m.label }}</span>
        </div>
        <div
          v-if="props.point && (!props.point.areaId || props.point.areaId === area.id)"
          class="pin pin-point"
          :style="{ left: pct(props.point.x, area.cols), top: pct(props.point.y, area.rows) }"
        ></div>
      </div>
    </div>

    <template v-if="props.legend">
      <ul v-if="goods" class="legend" aria-label="Keterangan">
        <li><span class="sw sw-shop" aria-hidden="true"></span>Toko buka</li>
        <li><span class="sw sw-empty" aria-hidden="true"></span>Kosong</li>
        <li v-for="k in presentLandmarks" :key="k" class="lm-li">
          <span aria-hidden="true">{{ LANDMARK[k].icon }}</span>{{ LANDMARK[k].label }}
        </li>
      </ul>
      <ul v-else class="legend" aria-label="Keterangan warna">
        <li><span class="sw st-available" aria-hidden="true"></span>Tersedia</li>
        <li><span class="sw st-booked" aria-hidden="true"></span>Sudah disewa</li>
        <li v-if="props.pendingIds"><span class="sw st-pending" aria-hidden="true"></span>Sedang diajukan orang lain</li>
        <li><span class="sw st-na" aria-hidden="true"></span>Tidak disewakan</li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.map-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  display: grid;
  gap: 10px;
  min-width: 0;
}
.area-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--z);
  border-left: 5px solid var(--zi);
}
.area-title {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.area-id {
  background: var(--zi);
  color: #fff;
  border-radius: 8px;
  padding: 0 8px;
  font-weight: 800;
}
.area-zone {
  font-size: 0.88rem;
  color: var(--ink-2);
}
.zbtn {
  min-width: 48px;
  font-size: 1.4rem;
  padding: 0;
}
.reset {
  font-size: 0.85rem;
}
.hint {
  margin: -2px 0 0;
}
.map-scroll {
  overflow: auto;
  border-radius: 12px;
}

/* ---- Area canvas ---- */
.canvas {
  position: relative;
  min-width: 100%;
  container-type: inline-size;
  background: color-mix(in srgb, var(--z) 30%, var(--map-ground));
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}
.canvas.crosshair {
  cursor: crosshair;
}
.aisle {
  position: absolute;
  background: var(--map-aisle);
  display: grid;
  place-items: center;
  pointer-events: none;
}
.aisle span {
  font-size: clamp(9px, 1.25cqw, 13px);
  font-weight: 600;
  color: var(--map-label);
  letter-spacing: 0.02em;
}
.landmark {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  font-size: clamp(9px, 1.3cqw, 14px);
  font-weight: 600;
  color: var(--muted);
  text-align: center;
  padding: 2px;
  pointer-events: none;
  overflow: hidden;
}
.lm-pintu {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  color: #fff;
  border-radius: 8px 8px 0 0;
}

/* ---- Stalls ---- */
.stall {
  position: absolute;
  appearance: none;
  margin: 0;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--map-stroke);
  font: inherit;
  color: var(--ink);
  text-align: left;
  display: block;
  overflow: hidden;
  cursor: pointer;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}
.inner {
  container-type: inline-size;
  width: 100%;
  height: 100%;
  padding: 4px 6%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  pointer-events: none;
}
/* .inner is the container, so cqw here = % of the box width. */
.code {
  font-weight: 700;
  font-size: clamp(10px, 13cqw, 19px);
  line-height: 1.1;
  white-space: nowrap;
}
.name {
  font-size: clamp(9px, 9.5cqw, 14px);
  line-height: 1.2;
  color: var(--ink-2);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}
/* Small boxes (phones): code only, centred */
@container (max-width: 62px) {
  .name {
    display: none;
  }
  .code {
    text-align: center;
  }
}

/* goods variant */
.stall.shop {
  background: var(--surface);
  border-color: color-mix(in srgb, var(--zi) 45%, var(--line));
  border-top: 4px solid var(--zi);
}
.stall.shop .code {
  color: var(--zi);
}
.stall.shop .name {
  color: var(--ink);
  font-weight: 500;
}
.stall.empty {
  background: var(--map-empty);
  border-color: var(--map-empty-line);
}
.stall.empty .code,
.stall.empty .name {
  color: var(--map-label);
  font-weight: 500;
}

/* status variant */
.st-available {
  background: var(--map-available);
}
.st-booked {
  background: repeating-linear-gradient(
    45deg,
    var(--map-booked) 0 6px,
    color-mix(in srgb, var(--map-booked-line) 22%, var(--map-booked)) 6px 9px
  );
}
.st-na {
  background:
    linear-gradient(45deg, transparent 47%, color-mix(in srgb, var(--map-na-line) 40%, transparent) 47% 53%, transparent 53%),
    var(--map-na);
}
.st-pending {
  background: radial-gradient(var(--accent-strong) 18%, var(--map-pending) 22%) 0 0 / 9px 9px;
}

.stall:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}
.stall:focus-visible {
  outline: 3px solid var(--accent-strong);
  outline-offset: 1px;
  z-index: 2;
}
.has-dim .stall.dim {
  opacity: 0.32;
}
.stall.hl {
  box-shadow: 0 0 0 2px var(--accent-strong);
  z-index: 1;
}
.stall.sel {
  box-shadow:
    0 0 0 3px var(--accent-strong),
    0 4px 12px rgb(0 0 0 / 18%);
  z-index: 2;
}
.stall.draggable {
  cursor: grab;
  touch-action: none;
}
.stall.pulse {
  animation: pulse 0.8s ease-in-out 2;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 0 7px var(--accent-strong);
  }
}

/* ---- Pins ---- */
.pin {
  position: absolute;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  background: var(--pin);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
  z-index: 3;
  pointer-events: none;
}
.pin-label {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  color: var(--pin);
  background: var(--surface);
  padding: 0 4px;
  border-radius: 4px;
}
.pin-point {
  --pin: var(--accent-strong);
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent-strong) 25%, transparent);
}

/* ---- Legend ---- */
.legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 0.88rem;
  font-weight: 600;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend .lm-li {
  font-weight: 500;
  color: var(--muted);
  gap: 4px;
}
.sw {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid var(--map-stroke);
}
.sw-shop {
  background: var(--surface);
  border-color: var(--zi);
  border-top: 5px solid var(--zi);
}
.sw-empty {
  background: var(--map-empty);
  border-color: var(--map-empty-line);
}

@media (prefers-reduced-motion: reduce) {
  .stall.pulse {
    animation: none;
  }
}
</style>

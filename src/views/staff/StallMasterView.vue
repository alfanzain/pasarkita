<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import StallMap from '@/components/StallMap.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import {
  areaById,
  areaLocation,
  deleteStall,
  leaseOfStall,
  nextStallCode,
  saveStall,
  stallById,
  validateStall,
} from '@/services/stall'
import { userName } from '@/services/auth'
import type { Stall, StallStatus, StallType } from '@/types'
import { STALL_STATUS_LABEL, STALL_TYPE_LABEL, rupiah } from '@/utils/format'

const mode = ref<'table' | 'map'>('table')
const mapArea = ref(db.areas[0]?.id ?? '1A')
const selectedId = ref<string | null>(null)
const q = ref('')

const floor = ref<number | 'ALL'>('ALL')
const area = ref<string>('ALL')
const status = ref<StallStatus | 'ALL'>('ALL')
const type = ref<StallType | 'ALL'>('ALL')
type SortKey = 'code' | 'status' | 'price' | 'tenant'
const sortKey = ref<SortKey>('code')
const sortDir = ref<1 | -1>(1)
const PAGE = 50
const page = ref(1)

const floors = computed(() => [...new Set(db.areas.map((a) => a.floor))].sort())
const areasOnFloor = computed(() => db.areas.filter((a) => floor.value === 'ALL' || a.floor === floor.value))
watch(floor, () => (area.value = 'ALL'))

const rows = computed(() => {
  const s = q.value.trim().toLowerCase()
  const tenant = (x: Stall) => leaseOfStall(x.id)
  const list = db.stalls.filter((x) => {
    const a = areaById(x.areaId)
    if (floor.value !== 'ALL' && a?.floor !== floor.value) return false
    if (area.value !== 'ALL' && x.areaId !== area.value) return false
    if (status.value !== 'ALL' && x.status !== status.value) return false
    if (type.value !== 'ALL' && x.type !== type.value) return false
    if (!s) return true
    const l = tenant(x)
    return [x.code, x.location, x.areaId, l?.shopName, l ? userName(l.merchantId) : ''].some((v) => v?.toLowerCase().includes(s))
  })
  const key = (x: Stall): string | number =>
    sortKey.value === 'price' ? x.pricePer6Months : sortKey.value === 'status' ? x.status : sortKey.value === 'tenant' ? (tenant(x)?.shopName ?? '~') : x.code
  return list.sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    return (typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb), 'id', { numeric: true })) * sortDir.value
  })
})
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE)))
const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE, page.value * PAGE))
watch([q, floor, area, status, type, sortKey, sortDir], () => (page.value = 1))

function sortBy(k: SortKey) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = k
    sortDir.value = 1
  }
}
function sortIcon(k: SortKey) {
  return sortKey.value !== k ? 'sort' : sortDir.value === 1 ? 'arrowUp' : 'arrowDown'
}
const activeFilters = computed(() => [floor.value, area.value, status.value, type.value].filter((v) => v !== 'ALL').length)
function resetFilters() {
  floor.value = 'ALL'
  area.value = 'ALL'
  status.value = 'ALL'
  type.value = 'ALL'
  q.value = ''
}
const summary = computed(() => ({
  AVAILABLE: db.stalls.filter((x) => x.status === 'AVAILABLE').length,
  BOOKED: db.stalls.filter((x) => x.status === 'BOOKED').length,
  NOT_AVAILABLE: db.stalls.filter((x) => x.status === 'NOT_AVAILABLE').length,
}))

// Default footprint (grid units) per stall type.
const SIZE: Record<StallType, { w: number; h: number }> = {
  KIOS: { w: 1.75, h: 1.6 },
  LOS: { w: 2.15, h: 1.85 },
  TOKO_5: { w: 2.65, h: 2.2 },
  TOKO_GT5: { w: 3.6, h: 2.2 },
  PELATARAN: { w: 1.75, h: 1.2 },
}

const editing = ref(false)
const isNew = ref(false)
const errors = ref<string[]>([])
const form = reactive<Stall>({
  id: '',
  code: '',
  areaId: '1A',
  location: '',
  status: 'AVAILABLE',
  pricePer6Months: 0,
  type: 'KIOS',
  x: 0,
  y: 0,
  w: 1.75,
  h: 1.6,
})
const point = ref<{ areaId: string; x: number; y: number } | null>(null)

function openEdit(s: Stall) {
  Object.assign(form, s)
  isNew.value = false
  errors.value = []
  editing.value = true
}

function openNew() {
  const a = areaById(mapArea.value) ?? db.areas[0]!
  Object.assign(form, {
    id: '',
    code: nextStallCode(a.id),
    areaId: a.id,
    location: areaLocation(a),
    status: 'AVAILABLE',
    pricePer6Months: 0,
    type: 'KIOS',
    x: 0,
    y: 0,
    ...SIZE.KIOS,
  })
  point.value = null
  isNew.value = true
  errors.value = []
  editing.value = true
}

function setType(t: StallType) {
  form.type = t
  Object.assign(form, SIZE[t])
  clampForm()
}

function clampForm() {
  const a = areaById(form.areaId)
  if (!a) return
  form.x = Math.min(a.cols - form.w, Math.max(0, form.x))
  form.y = Math.min(a.rows - form.h, Math.max(0, form.y))
}

// Changing the area of a new stall also suggests its code and location text.
function setArea(id: string) {
  const a = areaById(id)
  if (!a || id === form.areaId) return
  const prevAuto = areaById(form.areaId)
  if (isNew.value && (!form.code || form.code === nextStallCode(form.areaId))) form.code = nextStallCode(id)
  if (!form.location || (prevAuto && form.location === areaLocation(prevAuto))) form.location = areaLocation(a)
  form.areaId = id
  point.value = null
  clampForm()
}

function onPick(p: { areaId: string; x: number; y: number }) {
  setArea(p.areaId)
  form.x = p.x - form.w / 2
  form.y = p.y - form.h / 2
  clampForm()
  point.value = { areaId: form.areaId, x: form.x + form.w / 2, y: form.y + form.h / 2 }
}

// Preview of the new stall alongside existing ones.
const previewStalls = computed(() => {
  if (!isNew.value || !point.value) return db.stalls
  return [...db.stalls, { ...form, id: '__new', code: form.code || 'BARU' }]
})

function save() {
  const e = validateStall(form, form.id || undefined)
  if (isNew.value && !point.value) e.push('Tandai letak lapak baru di peta')
  if (form.status === 'NOT_AVAILABLE' || form.status === 'AVAILABLE') {
    if (form.id && leaseOfStall(form.id)) e.push('Lapak masih disewa, status harus "Sudah Disewa"')
  }
  errors.value = e
  if (e.length) return
  saveStall({ ...form, code: form.code.trim(), location: form.location.trim() })
  toast(isNew.value ? `Lapak ${form.code} ditambahkan` : `Lapak ${form.code} diperbarui`)
  editing.value = false
}

async function remove() {
  if (!(await confirmDialog(`Hapus lapak ${form.code}?`, 'Lapak akan hilang dari peta dan daftar.', { okText: 'Ya, hapus', danger: true }))) return
  const err = deleteStall(form.id)
  if (err) {
    errors.value = [err]
    return
  }
  toast(`Lapak ${form.code} dihapus`, 'info')
  selectedId.value = null
  editing.value = false
}

function onMove(id: string, x: number, y: number) {
  const s = stallById(id)
  if (s) {
    s.x = x
    s.y = y
  }
}

const selected = computed(() => stallById(selectedId.value ?? undefined))

// Deep links: ?q=1A-03 from the command palette, ?baru=1 from the dashboard.
const route = useRoute()
onMounted(() => {
  if (typeof route.query.q === 'string') q.value = route.query.q
  if (route.query.baru) openNew()
})
const statuses: StallStatus[] = ['AVAILABLE', 'BOOKED', 'NOT_AVAILABLE']
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Master Lapak Pasar"
      help="Semua lapak di pasar. Ubah kode, lokasi, status, harga sewa, atau letaknya di peta."
    >
      <template #actions>
        <div class="tabs" role="tablist" aria-label="Tampilan">
          <button type="button" role="tab" class="tab" :aria-selected="mode === 'table'" @click="mode = 'table'">
            <AppIcon name="list" :size="16" /> Tabel
          </button>
          <button type="button" role="tab" class="tab" :aria-selected="mode === 'map'" @click="mode = 'map'">
            <AppIcon name="map" :size="16" /> Peta
          </button>
        </div>
        <button type="button" class="btn" @click="openNew"><AppIcon name="plus" :size="16" /> Tambah lapak</button>
      </template>
    </PageHeader>

    <div class="sum">
      <button type="button" class="sum-item" :aria-pressed="status === 'ALL'" @click="status = 'ALL'; mode = 'table'">
        <span class="sum-label">Semua lapak</span><span class="sum-val mono">{{ db.stalls.length }}</span>
      </button>
      <button v-for="k in statuses" :key="k" type="button" class="sum-item" :aria-pressed="status === k" @click="status = k; mode = 'table'">
        <span class="sum-label"><span class="dot" :class="'dot-' + k" aria-hidden="true" /> {{ STALL_STATUS_LABEL[k] }}</span>
        <span class="sum-val mono">{{ summary[k] }}</span>
      </button>
    </div>

    <section v-if="mode === 'table'" class="panel">
      <div class="panel-head">
        <FilterBar v-model="q" placeholder="Cari kode, lokasi, nama lapak atau penyewa" label="Cari lapak" class="grow">
          <select v-model="floor" class="select" aria-label="Lantai">
            <option value="ALL">Semua lantai</option>
            <option v-for="f in floors" :key="f" :value="f">Lantai {{ f }}</option>
          </select>
          <select v-model="area" class="select" aria-label="Area">
            <option value="ALL">Semua area</option>
            <option v-for="a in areasOnFloor" :key="a.id" :value="a.id">{{ a.id }} · {{ a.name }}</option>
          </select>
          <select v-model="type" class="select" aria-label="Tipe">
            <option value="ALL">Semua tipe</option>
            <option v-for="(l, k) in STALL_TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
          </select>
          <button v-if="activeFilters || q" type="button" class="btn btn-ghost btn-sm" @click="resetFilters">
            <AppIcon name="close" :size="14" /> Reset
          </button>
        </FilterBar>
      </div>
      <div class="table-wrap tall">
        <table class="table">
          <thead>
            <tr>
              <th><button type="button" class="th-sort" @click="sortBy('code')">Kode <AppIcon :name="sortIcon('code')" :size="12" /></button></th>
              <th class="hide-md">Lokasi</th>
              <th><button type="button" class="th-sort" @click="sortBy('status')">Status <AppIcon :name="sortIcon('status')" :size="12" /></button></th>
              <th class="hide-sm">Tipe</th>
              <th class="num hide-sm"><button type="button" class="th-sort" @click="sortBy('price')">Sewa / 6 bln <AppIcon :name="sortIcon('price')" :size="12" /></button></th>
              <th><button type="button" class="th-sort" @click="sortBy('tenant')">Penyewa <AppIcon :name="sortIcon('tenant')" :size="12" /></button></th>
              <th class="num"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in pageRows" :key="s.id" class="clickable" @click="openEdit(s)">
              <td><span class="code-pill">{{ s.code }}</span></td>
              <td class="hide-md muted truncate" style="max-width: 280px">{{ s.location }}</td>
              <td><StatusBadge :status="s.status" :label="STALL_STATUS_LABEL[s.status]" /></td>
              <td class="hide-sm">{{ STALL_TYPE_LABEL[s.type] }}</td>
              <td class="num mono hide-sm">{{ rupiah(s.pricePer6Months) }}</td>
              <td>
                <span v-if="leaseOfStall(s.id)" class="cell-stack">
                  <span class="truncate" style="max-width: 260px">{{ leaseOfStall(s.id)?.shopName }}</span>
                  <span class="cell-sub">{{ userName(leaseOfStall(s.id)?.merchantId) }}</span>
                </span>
                <span v-else class="muted">–</span>
              </td>
              <td class="num">
                <button type="button" class="icon-btn" :aria-label="`Ubah lapak ${s.code}`" @click.stop="openEdit(s)">
                  <AppIcon name="edit" :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!rows.length" class="table-empty">
          Tidak ada lapak yang cocok.
          <button type="button" class="btn btn-ghost btn-sm" style="margin-left: 8px" @click="resetFilters">Reset filter</button>
        </div>
      </div>
      <div class="table-foot">
        <span>
          {{ rows.length ? (page - 1) * PAGE + 1 : 0 }}–{{ Math.min(page * PAGE, rows.length) }} dari {{ rows.length }} lapak
        </span>
        <div class="row" style="gap: 4px">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="page--">Sebelumnya</button>
          <span class="mono small" style="padding: 0 6px">{{ page }} / {{ pages }}</span>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="page >= pages" @click="page++">Berikutnya</button>
        </div>
      </div>
    </section>

    <div v-else class="map-layout">
      <section class="panel">
        <div class="panel-body">
          <StallMap v-model:area="mapArea" mode="edit" :selected-id="selectedId" @select="(s) => (selectedId = s.id)" @move="onMove" />
        </div>
      </section>
      <aside class="panel map-side">
        <template v-if="selected">
          <div class="panel-head">
            <h2 class="grow">Lapak {{ selected.code }}</h2>
            <StatusBadge :status="selected.status" :label="STALL_STATUS_LABEL[selected.status]" />
          </div>
          <div class="panel-body stack">
            <dl class="kv">
              <dt>Lokasi</dt><dd>{{ selected.location }}</dd>
              <dt>Tipe</dt><dd>{{ STALL_TYPE_LABEL[selected.type] }}</dd>
              <dt>Sewa / 6 bulan</dt><dd class="mono">{{ rupiah(selected.pricePer6Months) }}</dd>
              <dt>Penyewa</dt><dd>{{ leaseOfStall(selected.id)?.shopName ?? '–' }}</dd>
            </dl>
            <p class="small muted" style="margin: 0">Geser kotak lapak di peta untuk memindahkan letaknya. Perubahan tersimpan otomatis.</p>
            <button type="button" class="btn btn-ghost" @click="openEdit(selected)"><AppIcon name="edit" :size="16" /> Ubah data lapak</button>
          </div>
        </template>
        <div v-else class="panel-body center muted small">
          <AppIcon name="pin" :size="20" /><br />Klik salah satu lapak di peta untuk melihat dan mengubah datanya.
        </div>
      </aside>
    </div>

    <SidePanel
      v-if="editing"
      :wide="isNew"
      :title="isNew ? 'Tambah lapak baru' : `Ubah lapak ${form.code}`"
      :subtitle="isNew ? 'Isi data lalu tandai letaknya di peta' : form.location"
      @close="editing = false"
    >
      <div class="form-grid">
        <label class="field">
          <span class="label">Kode lapak <span class="req">*</span></span>
          <input v-model="form.code" class="input mono" placeholder="Contoh: 2A-25" />
          <span class="hint">Ditempel di lapak sebagai penanda.</span>
        </label>
        <label class="field">
          <span class="label">Area <span class="req">*</span></span>
          <select class="select" :value="form.areaId" @change="setArea(($event.target as HTMLSelectElement).value)">
            <option v-for="a in db.areas" :key="a.id" :value="a.id">{{ a.id }} — Lantai {{ a.floor }} · {{ a.name }}</option>
          </select>
        </label>
        <label class="field span-2">
          <span class="label">Lokasi <span class="req">*</span></span>
          <input v-model="form.location" class="input" placeholder="Contoh: Lantai 2 · Area A (Kelontong)" />
        </label>
        <label class="field">
          <span class="label">Tipe lapak <span class="req">*</span></span>
          <select class="select" :value="form.type" @change="setType(($event.target as HTMLSelectElement).value as StallType)">
            <option v-for="(l, k) in STALL_TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
          </select>
        </label>
        <label class="field">
          <span class="label">Harga sewa per 6 bulan <span class="req">*</span></span>
          <span class="prefix-input">
            <span class="prefix">Rp</span>
            <input v-model.number="form.pricePer6Months" type="number" inputmode="numeric" min="0" class="input mono" />
          </span>
          <span v-if="form.pricePer6Months" class="hint">{{ rupiah(form.pricePer6Months) }}</span>
        </label>
        <div class="field span-2">
          <span class="label">Status</span>
          <div class="tabs" role="radiogroup" aria-label="Status lapak">
            <button
              v-for="st in statuses"
              :key="st"
              type="button"
              role="radio"
              class="tab"
              :aria-checked="form.status === st"
              :aria-selected="form.status === st"
              @click="form.status = st"
            >
              {{ STALL_STATUS_LABEL[st] }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="isNew" class="field" style="margin-top: 16px">
        <span class="label">Letak di peta <span class="req">*</span></span>
        <StallMap
          mode="pick-point"
          :area="form.areaId"
          :stalls="previewStalls"
          :selected-id="point ? '__new' : null"
          :point="point"
          :legend="false"
          @update:area="(id) => id && setArea(id)"
          @pick="onPick"
        />
      </div>
      <AlertBox v-if="errors.length" tone="bad" title="Periksa lagi" :items="errors" style="margin-top: 14px" />
      <div v-if="!isNew" class="danger-zone">
        <div class="grow">
          <div class="bold small">Hapus lapak</div>
          <div class="small muted">Lapak hilang dari peta dan daftar. Tidak bisa jika masih disewa.</div>
        </div>
        <button type="button" class="btn btn-danger-outline btn-sm" @click="remove"><AppIcon name="trash" :size="14" /> Hapus</button>
      </div>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="editing = false">Batal</button>
        <button type="button" class="btn" @click="save">{{ isNew ? 'Tambah lapak' : 'Simpan perubahan' }}</button>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.sum {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
@media (min-width: 900px) {
  .sum {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.sum-item {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font: inherit;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  box-shadow: var(--shadow);
}
.sum-item:hover {
  border-color: var(--line-strong);
}
.sum-item[aria-pressed='true'] {
  border-color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand);
}
.sum-label {
  font-size: 0.88rem;
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.sum-val {
  font-size: 1.15rem;
  font-weight: 700;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot-AVAILABLE {
  background: var(--ok);
}
.dot-BOOKED {
  background: var(--info);
}
.dot-NOT_AVAILABLE {
  background: var(--muted);
}
.tall {
  max-height: calc(100dvh - 300px);
  min-height: 360px;
  overflow-y: auto;
}
.map-layout {
  display: grid;
  gap: 16px;
  align-items: start;
}
@media (min-width: 1200px) {
  .map-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
  .map-side {
    position: sticky;
    top: calc(var(--top-h) + 16px);
  }
}
.form-grid {
  display: grid;
  gap: 14px 12px;
}
.form-grid .field + .field {
  margin-top: 0;
}
@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .span-2 {
    grid-column: span 2;
  }
}
.prefix-input {
  position: relative;
  display: block;
}
.prefix {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.9rem;
  pointer-events: none;
}
.prefix-input .input {
  padding-left: 34px;
}
.danger-zone {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 12px;
  border: 1px solid #f2c4c0;
  border-radius: var(--radius);
  background: #fffafa;
}
</style>

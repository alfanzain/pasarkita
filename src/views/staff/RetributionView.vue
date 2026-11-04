<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import { currentUser } from '@/services/auth'
import type { RetributionItem, StallType } from '@/types'
import { STALL_TYPE_LABEL, relatif, rupiah, uid } from '@/utils/format'

const items = computed(() => [...db.retribution].sort((a, b) => a.category.localeCompare(b.category)))
const groups = computed(() =>
  (['SEWA', 'LAYANAN'] as const).map((c) => ({ c, label: c === 'SEWA' ? 'Retribusi sewa' : 'Retribusi layanan', rows: items.value.filter((r) => r.category === c) })),
)

// Inline rate editing: changes are held here until "Simpan" so one mistyped number never goes live alone.
const drafts = reactive<Record<string, number>>({})
const dirtyIds = computed(() => Object.keys(drafts).filter((id) => drafts[id] !== db.retribution.find((r) => r.id === id)?.pricePerDay))
function rate(r: RetributionItem) {
  return drafts[r.id] ?? r.pricePerDay
}
function setRate(r: RetributionItem, v: string) {
  const n = Number(v)
  if (Number.isFinite(n)) drafts[r.id] = n
}
function discard() {
  for (const k of Object.keys(drafts)) delete drafts[k]
}
async function saveInline() {
  const bad = dirtyIds.value.filter((id) => !(drafts[id]! > 0))
  if (bad.length) {
    toast('Biaya per hari harus lebih dari 0', 'bad')
    return
  }
  const n = dirtyIds.value.length
  if (!(await confirmDialog(`Simpan ${n} perubahan tarif?`, 'Tarif baru berlaku mulai tagihan bulan berikutnya.', { okText: 'Ya, simpan' }))) return
  const now = new Date().toISOString()
  for (const id of dirtyIds.value) {
    const r = db.retribution.find((x) => x.id === id)
    if (r) Object.assign(r, { pricePerDay: drafts[id], updatedAt: now, updatedBy: currentUser.value?.name ?? '-' })
  }
  discard()
  toast(`${n} tarif diperbarui`)
}

const open = ref(false)
const errors = ref<string[]>([])
const form = reactive<{ id: string; name: string; category: 'SEWA' | 'LAYANAN'; stallType: StallType | ''; pricePerDay: number | null }>({
  id: '',
  name: '',
  category: 'LAYANAN',
  stallType: '',
  pricePerDay: null,
})

function edit(r?: RetributionItem) {
  Object.assign(form, r
    ? { id: r.id, name: r.name, category: r.category, stallType: r.stallType ?? '', pricePerDay: r.pricePerDay }
    : { id: '', name: '', category: 'LAYANAN', stallType: '', pricePerDay: null })
  errors.value = []
  open.value = true
}

function save() {
  const e: string[] = []
  if (!form.name.trim()) e.push('Nama komponen wajib diisi')
  if (!form.pricePerDay || form.pricePerDay <= 0) e.push('Biaya per hari wajib diisi')
  errors.value = e
  if (e.length) return
  const data: RetributionItem = {
    id: form.id || uid('rt'),
    name: form.name.trim(),
    category: form.category,
    stallType: form.stallType || undefined,
    pricePerDay: form.pricePerDay!,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser.value?.name ?? '-',
  }
  const i = db.retribution.findIndex((x) => x.id === data.id)
  if (i >= 0) db.retribution[i] = data
  else db.retribution.push(data)
  toast('Komponen retribusi disimpan')
  open.value = false
}

async function remove(r: RetributionItem) {
  if (!(await confirmDialog(`Hapus "${r.name}"?`, 'Komponen ini tidak akan ditagihkan lagi mulai tagihan bulan berikutnya.', { okText: 'Ya, hapus', danger: true }))) return
  db.retribution.splice(db.retribution.indexOf(r), 1)
  toast('Komponen dihapus', 'info')
}
</script>

<template>
  <div class="stack-lg" :class="{ 'has-bar': dirtyIds.length }">
    <PageHeader
      title="Master Biaya Retribusi"
      help="Komponen biaya yang ditagihkan ke pedagang setiap bulan (biaya per hari × 30). Ubah tarif langsung di tabel."
    >
      <template #actions>
        <button type="button" class="btn" @click="edit()"><AppIcon name="plus" :size="16" /> Tambah komponen</button>
      </template>
    </PageHeader>

    <AlertBox tone="info">
      Retribusi <b>sewa</b> mengikuti jenis lapak, retribusi <b>layanan</b> mengikuti ukuran lapak. Komponen tanpa tipe lapak
      (misal kebersihan) berlaku untuk semua lapak.
    </AlertBox>

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Komponen</th>
              <th class="hide-sm">Tipe lapak</th>
              <th class="num">Per hari</th>
              <th class="num hide-sm">Per bulan</th>
              <th class="hide-md">Terakhir diubah</th>
              <th class="num"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody v-for="g in groups" :key="g.c">
            <tr class="group-row">
              <td colspan="6">{{ g.label }} <span class="muted">· {{ g.rows.length }}</span></td>
            </tr>
            <tr v-for="r in g.rows" :key="r.id" :class="{ dirty: dirtyIds.includes(r.id) }">
              <td class="bold">{{ r.name }}</td>
              <td class="hide-sm">{{ r.stallType ? STALL_TYPE_LABEL[r.stallType] : 'Semua lapak' }}</td>
              <td class="num">
                <span class="cell-input">
                  <span class="prefix">Rp</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="0"
                    class="input mono"
                    :value="rate(r)"
                    :aria-label="`Biaya per hari ${r.name}`"
                    @input="setRate(r, ($event.target as HTMLInputElement).value)"
                  />
                </span>
              </td>
              <td class="num mono hide-sm">{{ rupiah(rate(r) * 30) }}</td>
              <td class="hide-md nowrap">{{ relatif(r.updatedAt) }}<div class="cell-sub">{{ r.updatedBy }}</div></td>
              <td class="num">
                <div class="row" style="justify-content: flex-end; gap: 2px">
                  <button type="button" class="icon-btn" :aria-label="'Ubah ' + r.name" @click="edit(r)"><AppIcon name="edit" :size="16" /></button>
                  <button type="button" class="icon-btn danger" :aria-label="'Hapus ' + r.name" @click="remove(r)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot"><span>{{ items.length }} komponen</span></div>
    </section>

    <div v-if="dirtyIds.length" class="save-bar" role="status">
      <AppIcon name="info" :size="18" />
      <span class="grow"><b>{{ dirtyIds.length }}</b> perubahan tarif belum disimpan</span>
      <button type="button" class="btn btn-ghost btn-sm" @click="discard">Batalkan</button>
      <button type="button" class="btn btn-sm" @click="saveInline">Simpan perubahan</button>
    </div>

    <SidePanel v-if="open" :title="form.id ? 'Ubah komponen' : 'Tambah komponen'" @close="open = false">
      <label class="field">
        <span class="label">Nama komponen <span class="req">*</span></span>
        <input v-model="form.name" class="input" placeholder="Contoh: Keamanan" />
      </label>
      <div class="field">
        <span class="label">Kategori</span>
        <div class="tabs" role="radiogroup" aria-label="Kategori">
          <button type="button" role="radio" class="tab" :aria-checked="form.category === 'SEWA'" :aria-selected="form.category === 'SEWA'" @click="form.category = 'SEWA'">Sewa</button>
          <button type="button" role="radio" class="tab" :aria-checked="form.category === 'LAYANAN'" :aria-selected="form.category === 'LAYANAN'" @click="form.category = 'LAYANAN'">Layanan</button>
        </div>
      </div>
      <label class="field">
        <span class="label">Berlaku untuk tipe lapak</span>
        <select v-model="form.stallType" class="select">
          <option value="">Semua lapak</option>
          <option v-for="(l, k) in STALL_TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Biaya per hari (Rp) <span class="req">*</span></span>
        <input v-model.number="form.pricePerDay" type="number" inputmode="numeric" min="0" class="input mono" />
        <span v-if="form.pricePerDay" class="hint">≈ {{ rupiah(form.pricePerDay * 30) }} per bulan</span>
      </label>
      <AlertBox v-if="errors.length" tone="bad" title="Periksa lagi" :items="errors" style="margin-top: 14px" />
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="open = false">Batal</button>
        <button type="button" class="btn" @click="save">Simpan</button>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.group-row td {
  height: 32px;
  background: var(--surface-2);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-2);
}
.cell-input {
  position: relative;
  display: inline-block;
  width: 140px;
}
.cell-input .input {
  text-align: right;
  padding-left: 32px;
  min-height: 32px;
  height: 32px;
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
tr.dirty td {
  background: #fffbeb;
}
tr.dirty .input {
  border-color: var(--accent);
}
.danger {
  color: var(--bad);
}
.nowrap {
  white-space: nowrap;
}
.has-bar {
  padding-bottom: 72px;
}
.save-bar {
  position: fixed;
  z-index: 30;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--nav-h) + 16px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(640px, calc(100% - 24px));
  padding: 8px 8px 8px 14px;
  border-radius: 12px;
  background: #111827;
  color: #fff;
  box-shadow: var(--shadow-lg);
}
.save-bar .btn.btn-ghost {
  background: transparent;
  color: #fff;
  border-color: rgb(255 255 255 / 25%);
  box-shadow: none;
}
.save-bar .btn.btn-ghost:hover {
  background: rgb(255 255 255 / 10%);
}
.save-bar .btn:not(.btn-ghost),
.save-bar .btn:not(.btn-ghost):hover {
  background: #fff;
  color: #111827;
}
@media (min-width: 1024px) {
  .save-bar {
    bottom: 24px;
    left: calc(50% + 126px);
  }
  :global(.rail .save-bar) {
    left: calc(50% + 32px);
  }
}
</style>

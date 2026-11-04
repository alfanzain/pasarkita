<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import type { Commodity } from '@/types'
import { latestPrice } from '@/services/info'
import { rupiah, uid } from '@/utils/format'

const q = ref('')
const list = computed(() => {
  const t = q.value.trim().toLowerCase()
  return db.commodities.filter((c) => !t || c.name.toLowerCase().includes(t))
})

const open = ref(false)
const errors = ref<string[]>([])
const form = reactive<Commodity>({ id: '', name: '', unit: 'kg', emoji: '🛒' })

function edit(c?: Commodity) {
  Object.assign(form, c ?? { id: '', name: '', unit: 'kg', emoji: '🛒' })
  errors.value = []
  open.value = true
}

function save() {
  const e: string[] = []
  if (!form.name.trim()) e.push('Nama komoditas wajib diisi')
  if (!form.unit.trim()) e.push('Satuan wajib diisi')
  if (db.commodities.some((c) => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.id !== form.id))
    e.push('Komoditas dengan nama ini sudah ada')
  errors.value = e
  if (e.length) return
  const data = { id: form.id || uid('k'), name: form.name.trim(), unit: form.unit.trim(), emoji: form.emoji.trim() || '🛒' }
  const i = db.commodities.findIndex((c) => c.id === data.id)
  if (i >= 0) db.commodities[i] = data
  else db.commodities.push(data)
  toast('Komoditas disimpan')
  open.value = false
}

async function remove(c: Commodity) {
  if (!(await confirmDialog(`Hapus ${c.name}?`, 'Komoditas tidak akan muncul lagi di daftar harga harian.', { okText: 'Ya, hapus', danger: true }))) return
  db.commodities.splice(db.commodities.indexOf(c), 1)
  toast('Komoditas dihapus', 'info')
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Komoditas Pasar"
      help="Barang pokok yang dipantau harganya. Daftar ini juga dipakai pedagang saat memilih barang dagangan."
    >
      <template #actions>
        <button type="button" class="btn" @click="edit()"><AppIcon name="plus" :size="16" /> Tambah komoditas</button>
      </template>
    </PageHeader>

    <section class="panel">
      <div class="panel-head">
        <FilterBar v-model="q" placeholder="Cari komoditas" class="grow" />
        <span class="small muted">{{ list.length }} komoditas</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Komoditas</th>
              <th>Satuan</th>
              <th class="num hide-sm">Harga terakhir</th>
              <th class="num" aria-label="Aksi"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in list" :key="c.id">
              <td>
                <div class="cell-main">
                  <span class="emoji" aria-hidden="true">{{ c.emoji }}</span>
                  <span class="bold">{{ c.name }}</span>
                </div>
              </td>
              <td class="muted">per {{ c.unit }}</td>
              <td class="num mono hide-sm">{{ latestPrice(c.id) ? rupiah(latestPrice(c.id)!.avg) : '–' }}</td>
              <td class="num">
                <div class="row" style="justify-content: flex-end; gap: 4px">
                  <button type="button" class="btn btn-ghost btn-sm" @click="edit(c)"><AppIcon name="edit" :size="14" /> Ubah</button>
                  <button type="button" class="icon-btn danger" :aria-label="'Hapus ' + c.name" @click="remove(c)"><AppIcon name="trash" :size="16" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!list.length" class="table-empty">{{ q ? 'Tidak ditemukan.' : 'Belum ada komoditas.' }}</div>
      </div>
    </section>

    <SidePanel v-if="open" :title="form.id ? 'Ubah komoditas' : 'Tambah komoditas'" @close="open = false">
      <div class="emoji-preview" aria-hidden="true">{{ form.emoji || '🛒' }}</div>
      <label class="field">
        <span class="label">Nama komoditas <span class="req">*</span></span>
        <input v-model="form.name" class="input" placeholder="Contoh: Bawang Putih" />
      </label>
      <div class="grid-2">
        <label class="field">
          <span class="label">Satuan <span class="req">*</span></span>
          <input v-model="form.unit" class="input" placeholder="kg, liter, ikat" />
        </label>
        <label class="field" style="margin-top: 0">
          <span class="label">Ikon (emoji)</span>
          <input v-model="form.emoji" class="input" maxlength="4" />
        </label>
      </div>
      <AlertBox v-if="errors.length" tone="bad" title="Periksa lagi" :items="errors" style="margin-top: 14px" />
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="open = false">Batal</button>
        <button type="button" class="btn" @click="save">Simpan</button>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.emoji {
  font-size: 1.25rem;
  width: 28px;
  text-align: center;
}
.emoji-preview {
  font-size: 2.5rem;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  margin-bottom: 16px;
}
.danger {
  color: var(--bad);
}
</style>

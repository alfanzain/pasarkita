<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import AnnouncementCard from '@/components/AnnouncementCard.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import { currentUser } from '@/services/auth'
import type { Announcement } from '@/types'
import { relatif, uid } from '@/utils/format'

const PAGE = 20
type Filter = 'ALL' | 'VISIBLE' | 'HIDDEN'
const filter = ref<Filter>('ALL')
const q = ref('')
const limit = ref(PAGE)

const sorted = computed(() => [...db.announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const counts = computed(() => ({
  ALL: sorted.value.length,
  VISIBLE: sorted.value.filter((a) => a.visible).length,
  HIDDEN: sorted.value.filter((a) => !a.visible).length,
}))
const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  return sorted.value.filter(
    (a) =>
      (filter.value === 'ALL' || (filter.value === 'VISIBLE') === a.visible) &&
      (!t || a.title.toLowerCase().includes(t) || a.body.toLowerCase().includes(t)),
  )
})
const list = computed(() => filtered.value.slice(0, limit.value))
watch([q, filter], () => (limit.value = PAGE))
const filters: { v: Filter; label: string }[] = [
  { v: 'ALL', label: 'Semua' },
  { v: 'VISIBLE', label: 'Tampil' },
  { v: 'HIDDEN', label: 'Disembunyikan' },
]

const open = ref(false)
const errors = ref<string[]>([])
const form = reactive({ id: '', title: '', body: '' })

const preview = computed<Announcement>(() => {
  const now = new Date().toISOString()
  return {
    id: form.id || 'preview',
    title: form.title || 'Judul pengumuman',
    body: form.body || 'Isi pengumuman akan tampil di sini.',
    visible: true,
    createdAt: db.announcements.find((a) => a.id === form.id)?.createdAt ?? now,
    updatedAt: now,
    by: currentUser.value?.name ?? '-',
  }
})

function edit(a?: Announcement) {
  Object.assign(form, a ? { id: a.id, title: a.title, body: a.body } : { id: '', title: '', body: '' })
  errors.value = []
  open.value = true
}

function save() {
  const e: string[] = []
  if (!form.title.trim()) e.push('Judul wajib diisi')
  if (!form.body.trim()) e.push('Isi pengumuman wajib diisi')
  errors.value = e
  if (e.length) return
  const now = new Date().toISOString()
  const by = currentUser.value?.name ?? '-'
  const existing = db.announcements.find((a) => a.id === form.id)
  if (existing) Object.assign(existing, { title: form.title.trim(), body: form.body.trim(), updatedAt: now, by })
  else
    db.announcements.push({ id: uid('a'), title: form.title.trim(), body: form.body.trim(), visible: true, createdAt: now, updatedAt: now, by })
  toast(existing ? 'Pengumuman diperbarui' : 'Pengumuman diterbitkan dan tampil di beranda')
  open.value = false
}

async function toggle(a: Announcement) {
  const ok = await confirmDialog(
    a.visible ? 'Turunkan pengumuman?' : 'Tampilkan kembali?',
    a.visible ? 'Pengumuman tidak akan terlihat lagi di beranda publik.' : 'Pengumuman akan terlihat lagi di beranda publik.',
    { okText: a.visible ? 'Ya, turunkan' : 'Ya, tampilkan', danger: a.visible },
  )
  if (!ok) return
  a.visible = !a.visible
  a.updatedAt = new Date().toISOString()
  a.by = currentUser.value?.name ?? a.by
  toast(a.visible ? 'Pengumuman ditampilkan' : 'Pengumuman diturunkan', 'info')
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader title="Kelola Pengumuman" help="Pengumuman yang tampil akan dilihat oleh semua orang di beranda PasarKita.">
      <template #actions>
        <button type="button" class="btn" @click="edit()"><AppIcon name="plus" :size="16" /> Buat pengumuman</button>
      </template>
    </PageHeader>

    <section class="panel">
      <div class="panel-head toolbar">
        <div class="tabs" role="tablist" aria-label="Saring pengumuman">
          <button v-for="f in filters" :key="f.v" type="button" role="tab" class="tab" :aria-selected="filter === f.v" @click="filter = f.v">
            {{ f.label }}<span class="count">{{ counts[f.v] }}</span>
          </button>
        </div>
        <FilterBar v-model="q" placeholder="Cari judul atau isi" class="grow" />
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Pengumuman</th>
              <th class="hide-sm">Status</th>
              <th class="hide-md">Terakhir diubah</th>
              <th class="num" aria-label="Aksi"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in list" :key="a.id" :class="{ dim: !a.visible }">
              <td class="ann-cell">
                <div class="cell-stack">
                  <button type="button" class="link-btn bold" @click="edit(a)">{{ a.title }}</button>
                  <span class="cell-sub clamp">{{ a.body }}</span>
                </div>
              </td>
              <td class="hide-sm">
                <span class="badge" :class="a.visible ? 'tone-ok' : 'tone-muted'">{{ a.visible ? '✓ Tampil' : '– Disembunyikan' }}</span>
              </td>
              <td class="hide-md nowrap">
                {{ relatif(a.updatedAt) }}
                <div class="cell-sub">{{ a.by }}</div>
              </td>
              <td class="num">
                <div class="row" style="justify-content: flex-end; gap: 4px">
                  <button type="button" class="btn btn-ghost btn-sm" @click="edit(a)"><AppIcon name="edit" :size="14" /> Ubah</button>
                  <button type="button" class="btn btn-sm" :class="a.visible ? 'btn-danger-outline' : 'btn-outline'" @click="toggle(a)">
                    {{ a.visible ? 'Turunkan' : 'Tampilkan' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!list.length" class="table-empty">{{ q.trim() ? 'Tidak ditemukan.' : 'Belum ada pengumuman.' }}</div>
      </div>
      <div class="table-foot">
        <span>Menampilkan {{ list.length }} dari {{ filtered.length }}</span>
        <button v-if="filtered.length > list.length" type="button" class="btn btn-ghost btn-sm" @click="limit += PAGE">
          Muat {{ Math.min(PAGE, filtered.length - list.length) }} lagi
        </button>
      </div>
    </section>

    <SidePanel v-if="open" wide :title="form.id ? 'Ubah pengumuman' : 'Buat pengumuman'" @close="open = false">
      <div class="editor">
        <div>
          <label class="field">
            <span class="label">Judul <span class="req">*</span></span>
            <input v-model="form.title" class="input" placeholder="Contoh: Pasar tutup saat Hari Raya" />
          </label>
          <label class="field">
            <span class="label">Isi pengumuman <span class="req">*</span></span>
            <textarea v-model="form.body" class="textarea" rows="10" placeholder="Tulis dengan kalimat sederhana dan jelas." />
            <span class="hint">{{ form.body.length }} karakter · pembaca utama pedagang & pengunjung, gunakan bahasa sederhana.</span>
          </label>
          <AlertBox v-if="errors.length" tone="bad" title="Periksa lagi" :items="errors" style="margin-top: 14px" />
        </div>
        <div class="preview">
          <div class="eyebrow">Pratinjau di beranda publik</div>
          <div class="preview-frame">
            <AnnouncementCard :key="preview.title + preview.body" :item="preview" />
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="open = false">Batal</button>
        <button type="button" class="btn" @click="save">{{ form.id ? 'Simpan perubahan' : 'Terbitkan' }}</button>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.toolbar {
  flex-wrap: wrap;
}
.ann-cell {
  max-width: 560px;
}
.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nowrap {
  white-space: nowrap;
}
.dim td {
  color: var(--muted);
}
.link-btn {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}
.link-btn:hover {
  color: var(--brand);
  text-decoration: underline;
}
.editor {
  display: grid;
  gap: 20px;
}
@media (min-width: 1024px) {
  .editor {
    grid-template-columns: 1fr 1fr;
  }
}
.preview-frame {
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  background: #faf8f3;
  border: 1px dashed var(--line-strong);
  font-family: 'Lexend', system-ui, sans-serif;
}
</style>

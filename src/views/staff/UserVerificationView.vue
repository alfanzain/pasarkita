<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import FilterBar from '@/components/console/FilterBar.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import { VERIFY_SLA_DAYS, decideRegistration } from '@/services/auth'
import type { User, VerifyStatus } from '@/types'
import { ROLE_LABEL, VERIFY_LABEL, daysBetween, relatif, tanggal, tanggalJam } from '@/utils/format'

const tab = ref<VerifyStatus>('PENDING')
const tabs: { v: VerifyStatus; label: string }[] = [
  { v: 'PENDING', label: 'Perlu Diproses' },
  { v: 'NEEDS_CORRECTION', label: 'Menunggu Koreksi' },
  { v: 'VERIFIED', label: 'Disetujui' },
]

function byStatus(s: VerifyStatus) {
  return db.users
    .filter((u) => u.status === s)
    .sort((a, b) => b.lastRequestAt.localeCompare(a.lastRequestAt))
}
const q = ref('')
const list = computed(() => {
  const term = q.value.trim().toLowerCase()
  return byStatus(tab.value).filter((u) => !term || u.name.toLowerCase().includes(term) || u.nik.includes(term))
})

const sel = ref<User | null>(null)
const rejecting = ref(false)
const reason = ref('')
const err = ref('')

function age(u: User) {
  return daysBetween(new Date(u.lastRequestAt), new Date())
}

function open(u: User) {
  sel.value = u
  rejecting.value = false
  reason.value = ''
  err.value = ''
}

// Deep link from the dashboard queue / command palette: /kelola/verifikasi-user?id=...
const route = useRoute()
onMounted(() => {
  const u = db.users.find((x) => x.id === route.query.id)
  if (u) {
    tab.value = u.status
    open(u)
  }
})

function slaLeft(u: User) {
  return VERIFY_SLA_DAYS - age(u)
}

const docs = computed(() => {
  const d = sel.value?.docs ?? {}
  return [
    { label: 'KTP', v: d.ktp },
    { label: 'Kartu / Formulir Pedagang', v: d.kartuPedagang },
    { label: 'Kartu Petugas Pasar', v: d.kartuPetugas },
    { label: 'Surat Tugas UPT', v: d.suratTugas },
  ].filter((x) => x.v)
})

async function approve() {
  const u = sel.value
  if (!u) return
  if (!(await confirmDialog('Setujui pendaftaran?', `${u.name} akan bisa memakai semua menu ${ROLE_LABEL[u.role]}.`, { okText: 'Ya, setujui' }))) return
  decideRegistration(u.id, true)
  toast(`Pendaftaran ${u.name} disetujui`)
  sel.value = null
}

function reject() {
  const u = sel.value
  if (!u) return
  if (!reason.value.trim()) {
    err.value = 'Tulis alasan penolakan agar pendaftar tahu apa yang harus diperbaiki.'
    return
  }
  decideRegistration(u.id, false, reason.value.trim())
  toast(`Pendaftaran ${u.name} dikembalikan untuk diperbaiki`, 'info')
  sel.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Verifikasi Pendaftaran"
      :help="`Periksa data dan dokumen pendaftar, lalu setujui atau kembalikan untuk diperbaiki. Batas waktu verifikasi ${VERIFY_SLA_DAYS} hari.`"
    />

    <div class="panel">
      <div class="panel-head toolbar">
        <div class="tabs" role="tablist">
          <button v-for="t in tabs" :key="t.v" type="button" role="tab" class="tab" :aria-selected="tab === t.v" @click="tab = t.v">
            {{ t.label }}<span v-if="t.v !== 'VERIFIED'" class="count">{{ byStatus(t.v).length }}</span>
          </button>
        </div>
        <FilterBar v-model="q" placeholder="Cari nama atau NIK" class="grow" />
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Pendaftar</th>
              <th class="hide-sm">Daftar sebagai</th>
              <th class="hide-md">NIK</th>
              <th>{{ tab === 'VERIFIED' ? 'Disetujui' : 'Diajukan' }}</th>
              <th v-if="tab === 'PENDING'">Batas waktu</th>
              <th class="hide-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in list"
              :key="u.id"
              class="clickable"
              :class="{ 'is-selected': sel?.id === u.id }"
              tabindex="0"
              @click="open(u)"
              @keydown.enter="open(u)"
            >
              <td>
                <div class="cell-main">
                  <span class="initial" aria-hidden="true">{{ u.name.charAt(0) }}</span>
                  <span class="cell-stack">
                    <span class="bold">{{ u.name }}</span>
                    <span class="cell-sub">{{ u.whatsapp }}</span>
                  </span>
                </div>
              </td>
              <td class="hide-sm">{{ ROLE_LABEL[u.role] }}</td>
              <td class="hide-md mono">{{ u.nik }}</td>
              <td>
                <template v-if="u.status === 'VERIFIED'">{{ tanggal(u.verifiedAt) }}<div class="cell-sub">{{ u.verifiedBy }}</div></template>
                <template v-else>{{ relatif(u.lastRequestAt) }}</template>
              </td>
              <td v-if="tab === 'PENDING'">
                <span v-if="slaLeft(u) <= 0" class="badge tone-bad">! Lewat batas</span>
                <span v-else class="badge" :class="slaLeft(u) === 1 ? 'tone-warn' : 'tone-muted'">Sisa {{ slaLeft(u) }} hari</span>
              </td>
              <td class="hide-sm"><StatusBadge :status="u.status" :label="VERIFY_LABEL[u.status]" /></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!list.length" class="table-empty">
          {{ q ? `Tidak ada pendaftar yang cocok dengan “${q}”.` : 'Belum ada pendaftaran di bagian ini.' }}
        </div>
      </div>
      <div class="table-foot"><span>{{ list.length }} pendaftar</span></div>
    </div>

    <SidePanel v-if="sel" :title="sel.name" :subtitle="`${ROLE_LABEL[sel.role]} · NIK ${sel.nik}`" @close="sel = null">
      <div class="sp-section">
        <div class="row-wrap" style="margin-bottom: 12px">
          <StatusBadge :status="sel.status" :label="VERIFY_LABEL[sel.status]" />
          <span v-if="sel.status === 'PENDING'" class="badge" :class="slaLeft(sel) <= 0 ? 'tone-bad' : 'tone-muted'">
            {{ slaLeft(sel) <= 0 ? 'Lewat batas verifikasi' : `Sisa ${slaLeft(sel)} hari untuk verifikasi` }}
          </span>
        </div>
        <dl class="kv">
          <dt>Nama lengkap</dt><dd>{{ sel.name }}</dd>
          <dt>NIK</dt><dd class="mono">{{ sel.nik }}</dd>
          <dt>WhatsApp</dt><dd>{{ sel.whatsapp }}</dd>
          <dt>Daftar sebagai</dt><dd>{{ ROLE_LABEL[sel.role] }}</dd>
          <dt>Pengajuan terakhir</dt><dd>{{ tanggalJam(sel.lastRequestAt) }}</dd>
          <template v-if="sel.verifiedBy"><dt>Disetujui oleh</dt><dd>{{ sel.verifiedBy }} · {{ tanggal(sel.verifiedAt) }}</dd></template>
        </dl>
        <AlertBox v-if="sel.rejectionReason" tone="warn" title="Alasan dikembalikan" style="margin-top: 12px">{{ sel.rejectionReason }}</AlertBox>
      </div>

      <div class="sp-section">
        <h3>Dokumen</h3>
        <p v-if="!docs.length" class="muted small">Tidak ada dokumen terunggah (data contoh).</p>
        <div class="docs">
          <figure v-for="d in docs" :key="d.label" class="doc-card">
            <img v-if="d.v?.startsWith('data:image')" :src="d.v" :alt="d.label" class="doc" />
            <a v-else :href="d.v" target="_blank" rel="noopener" class="doc doc-file">Buka dokumen</a>
            <figcaption>{{ d.label }}</figcaption>
          </figure>
        </div>
      </div>

      <div v-if="sel.status === 'PENDING' && rejecting" class="sp-section">
        <label class="field">
          <span class="label">Alasan penolakan <span class="req">*</span></span>
          <textarea v-model="reason" class="textarea" placeholder="Contoh: Foto KTP buram, mohon unggah ulang." />
          <span class="hint">Pesan ini dikirim ke WhatsApp pendaftar.</span>
        </label>
        <AlertBox v-if="err" tone="bad">{{ err }}</AlertBox>
      </div>

      <template v-if="sel.status === 'PENDING'" #footer>
        <template v-if="!rejecting">
          <button type="button" class="btn btn-danger-outline" @click="rejecting = true">Kembalikan</button>
          <button type="button" class="btn" @click="approve"><AppIcon name="check" :size="16" /> Setujui</button>
        </template>
        <template v-else>
          <button type="button" class="btn btn-ghost" @click="rejecting = false">Batal</button>
          <button type="button" class="btn btn-danger" @click="reject">Kirim penolakan</button>
        </template>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.toolbar {
  flex-wrap: wrap;
}
.docs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.doc-card {
  margin: 0;
}
.doc-card figcaption {
  font-size: 0.82rem;
  font-weight: 500;
  margin-top: 4px;
}
.doc {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.doc-file {
  display: grid;
  place-items: center;
}
</style>

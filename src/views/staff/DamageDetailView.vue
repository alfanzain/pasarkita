<script setup lang="ts">
import { computed, ref } from 'vue'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import SidePanel from '@/components/console/SidePanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import FileUpload from '@/components/FileUpload.vue'
import PageHeader from '@/components/PageHeader.vue'
import StallMap from '@/components/StallMap.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { db } from '@/data/db'
import { confirmDialog, toast } from '@/composables/ui'
import { userName } from '@/services/auth'
import { addProgress, finishTicket, ticketById, updateUrgency } from '@/services/maint'
import type { Urgency } from '@/types'
import { CATEGORY_ICON, CATEGORY_LABEL, TICKET_STATUS_LABEL, URGENCY_LABEL, tanggalJam } from '@/utils/format'

const props = defineProps<{ id: string }>()
const t = computed(() => ticketById(props.id))
const merged = computed(() => db.tickets.filter((x) => x.mergedInto === props.id))
const active = computed(() => t.value?.status === 'OPEN' || t.value?.status === 'IN_PROGRESS')
const generalComments = computed(() => t.value?.comments.filter((c) => !c.progressId) ?? [])

// Urgency edit
const urgOpen = ref(false)
const urg = ref<Urgency>('SEDANG')
const urgNote = ref('')
const urgErr = ref('')
function openUrg() {
  urg.value = t.value?.systemUrgency ?? 'SEDANG'
  urgNote.value = ''
  urgErr.value = ''
  urgOpen.value = true
}
function saveUrg() {
  if (!urgNote.value.trim()) {
    urgErr.value = 'Tulis alasan perubahan urgensi.'
    return
  }
  updateUrgency(props.id, urg.value, urgNote.value.trim())
  toast(`Urgensi diubah menjadi ${URGENCY_LABEL[urg.value]}`)
  urgOpen.value = false
}

// Progress
const progOpen = ref(false)
const progDesc = ref('')
const progPhoto = ref<string | undefined>()
const progErr = ref('')
function openProg() {
  progDesc.value = ''
  progPhoto.value = undefined
  progErr.value = ''
  progOpen.value = true
}
function saveProg() {
  if (!progDesc.value.trim()) {
    progErr.value = 'Ceritakan perbaikan yang sudah dilakukan.'
    return
  }
  addProgress(props.id, progDesc.value.trim(), progPhoto.value)
  toast('Progres perbaikan ditambahkan')
  progOpen.value = false
}

async function finish() {
  if (!(await confirmDialog('Selesaikan perbaikan?', 'Laporan akan dipindah ke kelompok Selesai dan pelapor dapat melihatnya.', { okText: 'Ya, sudah selesai' }))) return
  const e = finishTicket(props.id)
  if (e) toast(e, 'bad')
  else toast('Perbaikan dinyatakan selesai')
}

const levels: Urgency[] = ['RENDAH', 'SEDANG', 'TINGGI']
</script>

<template>
  <EmptyState v-if="!t" icon="alert" title="Laporan tidak ditemukan" />
  <div v-else>
    <PageHeader :title="`${t.number ?? 'Laporan'} · ${CATEGORY_LABEL[t.category]}`" :help="t.description">
      <template v-if="active" #actions>
        <button type="button" class="btn btn-ghost" :disabled="!t.progress.length" :title="!t.progress.length ? 'Aktif setelah ada minimal satu progres' : undefined" @click="finish">
          <AppIcon name="check" :size="16" /> Selesaikan
        </button>
        <button type="button" class="btn" @click="openProg"><AppIcon name="plus" :size="16" /> Tambah progres</button>
      </template>
    </PageHeader>

    <div class="dd-grid">
      <div class="stack-lg">
        <section class="panel">
          <div class="panel-head">
            <h2 class="grow">Riwayat perbaikan</h2>
            <span class="badge tone-muted">{{ t.progress.length }} progres</span>
          </div>
          <div class="panel-body">
            <p v-if="!t.progress.length" class="muted small" style="margin: 0">
              Belum ada progres perbaikan. Tombol “Selesaikan” aktif setelah ada minimal satu progres.
            </p>
            <ol v-else class="timeline">
              <li v-for="p in t.progress" :key="p.id" class="done">
                <div class="row between"><span class="bold">{{ p.by }}</span><span class="small muted">{{ tanggalJam(p.at) }}</span></div>
                <p style="margin: 4px 0 0">{{ p.description }}</p>
                <img v-if="p.photo" :src="p.photo" alt="Foto perbaikan" class="photo" />
                <div v-for="c in t.comments.filter((x) => x.progressId === p.id)" :key="c.id" class="card-note small comment">
                  <b>{{ c.by }}</b>: {{ c.text }}
                </div>
              </li>
            </ol>
            <div v-for="c in generalComments" :key="c.id" class="card-note small comment">
              <b>{{ c.by }}</b> · {{ tanggalJam(c.at) }}<br />{{ c.text }}
            </div>
          </div>
        </section>

        <section v-if="merged.length" class="panel">
          <div class="panel-head"><h2 class="grow">Laporan serupa yang digabung</h2><span class="badge tone-muted">{{ merged.length }}</span></div>
          <ul class="rows">
            <li v-for="m in merged" :key="m.id" class="panel-body">
              <div class="row between"><span class="bold">{{ userName(m.reporterId) }}</span><span class="small muted">{{ tanggalJam(m.createdAt) }}</span></div>
              <p style="margin: 4px 0 0">{{ m.description }}</p>
              <img v-if="m.photo" :src="m.photo" alt="Foto laporan serupa" class="photo" />
            </li>
          </ul>
        </section>

        <section class="panel">
          <div class="panel-head"><AppIcon name="map" :size="18" /><h2 class="grow">Lokasi</h2><span class="small muted">{{ t.location.label }}</span></div>
          <div class="panel-body">
            <StallMap :markers="[{ id: t.id, areaId: t.location.areaId, x: t.location.x, y: t.location.y, label: t.number ?? '' }]" :legend="false" />
          </div>
        </section>
      </div>

      <aside class="stack-lg dd-side">
        <section class="panel">
          <div class="panel-head">
            <h2 class="grow">Detail</h2>
            <StatusBadge :status="t.status" :label="TICKET_STATUS_LABEL[t.status]" />
          </div>
          <div class="panel-body">
            <dl class="kv">
              <dt>Kategori</dt><dd><span aria-hidden="true">{{ CATEGORY_ICON[t.category] }}</span> {{ CATEGORY_LABEL[t.category] }}</dd>
              <dt>Pelapor</dt><dd>{{ userName(t.reporterId) }}</dd>
              <dt>Dilaporkan</dt><dd>{{ tanggalJam(t.createdAt) }}</dd>
              <dt>Lokasi</dt><dd>{{ t.location.label }}</dd>
              <template v-if="t.finishedAt"><dt>Selesai</dt><dd>{{ tanggalJam(t.finishedAt) }}</dd></template>
            </dl>
            <img v-if="t.photo" :src="t.photo" alt="Foto kerusakan" class="photo" />
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2 class="grow">Tingkat urgensi</h2>
            <button v-if="t.status !== 'DONE'" type="button" class="btn btn-ghost btn-sm" @click="openUrg"><AppIcon name="edit" :size="14" /> Ubah</button>
          </div>
          <div class="panel-body">
            <dl class="kv">
              <dt>Menurut sistem</dt><dd><StatusBadge :status="t.systemUrgency" :label="URGENCY_LABEL[t.systemUrgency]" /></dd>
              <dt>Menurut pelapor</dt><dd><StatusBadge :status="t.userUrgency" :label="URGENCY_LABEL[t.userUrgency]" /></dd>
            </dl>
            <p v-if="t.urgencyNote" class="small muted" style="margin: 10px 0 0">Catatan: {{ t.urgencyNote }}</p>
          </div>
        </section>
      </aside>
    </div>

    <SidePanel v-if="urgOpen" title="Ubah Tingkat Urgensi" @close="urgOpen = false">
      <div class="choice-grid">
        <label v-for="l in levels" :key="l" class="choice"><input v-model="urg" type="radio" :value="l" /> {{ URGENCY_LABEL[l] }}</label>
      </div>
      <label class="field" style="margin-top: 16px">
        <span class="label">Alasan <span class="req">*</span></span>
        <textarea v-model="urgNote" class="textarea" placeholder="Contoh: Air sudah masuk ke kios, perlu segera." />
      </label>
      <AlertBox v-if="urgErr" tone="bad" style="margin-top: 12px">{{ urgErr }}</AlertBox>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="urgOpen = false">Batal</button>
        <button type="button" class="btn" @click="saveUrg">Simpan</button>
      </template>
    </SidePanel>

    <SidePanel v-if="progOpen" title="Tambah Progres Perbaikan" @close="progOpen = false">
      <label class="field">
        <span class="label">Deskripsi perbaikan <span class="req">*</span></span>
        <textarea v-model="progDesc" class="textarea" placeholder="Apa yang sudah dikerjakan?" />
      </label>
      <FileUpload v-model="progPhoto" label="Foto / bukti perbaikan" style="margin-top: 16px" />
      <AlertBox v-if="progErr" tone="bad" style="margin-top: 12px">{{ progErr }}</AlertBox>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="progOpen = false">Batal</button>
        <button type="button" class="btn" @click="saveProg">Simpan</button>
      </template>
    </SidePanel>
  </div>
</template>

<style scoped>
.dd-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}
@media (min-width: 1100px) {
  .dd-grid {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
  .dd-side {
    position: sticky;
    top: calc(var(--top-h) + 16px);
  }
}
@media (max-width: 1099px) {
  .dd-side {
    order: -1;
  }
}
.photo {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 10px;
  margin-top: 8px;
}
.comment {
  margin-top: 8px;
}
</style>

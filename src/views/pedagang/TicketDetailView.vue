<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import AlertBox from '@/components/AlertBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import StallMap from '@/components/StallMap.vue'
import { currentUser } from '@/services/auth'
import { addComment, effectiveTicket, ticketById } from '@/services/maint'
import { toast } from '@/composables/ui'
import { CATEGORY_ICON, CATEGORY_LABEL, TICKET_STATUS_LABEL, URGENCY_LABEL, tanggal, tanggalJam } from '@/utils/format'

const props = defineProps<{ id: string }>()

const ticket = computed(() => {
  const t = ticketById(props.id)
  return t && t.reporterId === currentUser.value?.id ? t : undefined
})
const main = computed(() => (ticket.value ? effectiveTicket(ticket.value) : undefined))

const drafts = reactive<Record<string, string>>({})
const general = ref('')

const steps = computed(() => {
  const s = main.value?.status
  const order = ['OPEN', 'IN_PROGRESS', 'DONE']
  const idx = s === 'CLUSTER_REVIEW' ? -1 : order.indexOf(s ?? '')
  return [
    { label: 'Laporan dikirim', state: 'done', note: tanggalJam(ticket.value?.createdAt) },
    {
      label: s === 'CLUSTER_REVIEW' ? 'Diperiksa petugas (cek laporan serupa)' : 'Diterima & diberi nomor tiket',
      state: idx >= 0 ? 'done' : 'current',
    },
    { label: 'Sedang diperbaiki', state: idx >= 2 ? 'done' : idx === 1 ? 'current' : '' },
    { label: 'Selesai', state: idx >= 2 ? 'done' : '', note: main.value?.finishedAt ? tanggal(main.value.finishedAt) : '' },
  ]
})

function commentsFor(progressId?: string) {
  return (main.value?.comments ?? []).filter((c) => c.progressId === progressId)
}

function send(progressId?: string) {
  if (!main.value) return
  const text = progressId ? (drafts[progressId] ?? '') : general.value
  if (!text.trim()) return toast('Tulis komentar terlebih dahulu', 'info')
  addComment(main.value.id, text, progressId)
  if (progressId) drafts[progressId] = ''
  else general.value = ''
  toast('Komentar terkirim')
}
</script>

<template>
  <EmptyState v-if="!ticket || !main" icon="ticket" title="Laporan tidak ditemukan">
    <RouterLink to="/pedagang/tiket" class="btn">Kembali ke Tiket Saya</RouterLink>
  </EmptyState>

  <div v-else class="stack-lg">
    <PageHeader
      :title="main.number ? `Tiket ${main.number}` : 'Laporan Kerusakan'"
      :help="`Status: ${main.status === 'CLUSTER_REVIEW' ? 'diperiksa petugas' : TICKET_STATUS_LABEL[main.status]}. ${ticket.description}`"
    />

    <AlertBox v-if="ticket.mergedInto" tone="info">
      Laporan Anda mirip dengan laporan pedagang lain, jadi digabung agar ditangani bersama. Perkembangan di bawah
      adalah perkembangan tiket gabungan.
    </AlertBox>

    <section class="card stack">
      <div class="row between">
        <div class="row">
          <span style="font-size: 1.8rem" aria-hidden="true">{{ CATEGORY_ICON[ticket.category] }}</span>
          <h2 style="margin: 0">{{ CATEGORY_LABEL[ticket.category] }}</h2>
        </div>
        <StatusBadge :status="main.status" :label="main.status === 'CLUSTER_REVIEW' ? 'Diperiksa' : TICKET_STATUS_LABEL[main.status]" />
      </div>
      <p>{{ ticket.description }}</p>
      <dl class="kv">
        <dt>Lokasi</dt>
        <dd>{{ ticket.location.label }}</dd>
        <dt>Dilaporkan</dt>
        <dd>{{ tanggalJam(ticket.createdAt) }}</dd>
        <dt>Urgensi (Anda)</dt>
        <dd>{{ URGENCY_LABEL[ticket.userUrgency] }}</dd>
        <dt>Urgensi (petugas)</dt>
        <dd>{{ URGENCY_LABEL[main.systemUrgency] }}</dd>
      </dl>
      <img v-if="ticket.photo" :src="ticket.photo" alt="Foto kerusakan" class="photo" />
      <StallMap
        :markers="[{ id: ticket.id, areaId: ticket.location.areaId, x: ticket.location.x, y: ticket.location.y, label: 'Lokasi' }]"
        :legend="false"
      />
    </section>

    <section class="card">
      <h2>Tahapan</h2>
      <ol class="timeline">
        <li v-for="(s, i) in steps" :key="i" :class="s.state">
          <div class="bold">{{ s.label }}</div>
          <div v-if="s.note" class="small muted">{{ s.note }}</div>
        </li>
      </ol>
    </section>

    <section class="stack">
      <h2>Riwayat perbaikan</h2>
      <p v-if="!main.progress.length" class="muted">Belum ada catatan perbaikan dari petugas.</p>
      <article v-for="p in main.progress" :key="p.id" class="card stack">
        <div class="small muted">{{ p.by }} · {{ tanggalJam(p.at) }}</div>
        <p style="margin: 0">{{ p.description }}</p>
        <img v-if="p.photo" :src="p.photo" alt="Foto perbaikan" class="photo" />
        <ul v-if="commentsFor(p.id).length" class="list comments">
          <li v-for="c in commentsFor(p.id)" :key="c.id" class="card-note">
            <div class="small bold">{{ c.by }} <span class="muted" style="font-weight: 400">· {{ tanggalJam(c.at) }}</span></div>
            <div>{{ c.text }}</div>
          </li>
        </ul>
        <label class="field">
          <span class="label small">Tanggapan Anda</span>
          <textarea v-model="drafts[p.id]" class="textarea" style="min-height: 80px" placeholder="Tulis tanggapan…"></textarea>
        </label>
        <button type="button" class="btn btn-outline btn-block" @click="send(p.id)">Kirim Tanggapan</button>
      </article>
    </section>

    <section class="card stack">
      <h2>Komentar umum</h2>
      <ul v-if="commentsFor(undefined).length" class="list comments">
        <li v-for="c in commentsFor(undefined)" :key="c.id" class="card-note">
          <div class="small bold">{{ c.by }} <span class="muted" style="font-weight: 400">· {{ tanggalJam(c.at) }}</span></div>
          <div>{{ c.text }}</div>
        </li>
      </ul>
      <textarea v-model="general" class="textarea" style="min-height: 80px" aria-label="Komentar" placeholder="Ada tambahan informasi?"></textarea>
      <button type="button" class="btn btn-block" @click="send()">Kirim Komentar</button>
    </section>
  </div>
</template>

<style scoped>
.photo {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 12px;
}
.comments > li + li {
  margin-top: 8px;
}
</style>

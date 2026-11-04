<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import FileUpload from '@/components/FileUpload.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { currentUser, homeFor, resubmitRegistration, VERIFY_SLA_DAYS } from '@/services/auth'
import { toast } from '@/composables/ui'
import type { Role, User } from '@/types'
import { addDays, ROLE_LABEL, tanggalJam, VERIFY_LABEL } from '@/utils/format'

const u = computed(() => currentUser.value!)
const editing = computed(() => u.value.status === 'NEEDS_CORRECTION')
const errors = ref<string[]>([])

const form = reactive<{ name: string; whatsapp: string; role: Role; docs: User['docs'] }>({
  name: '',
  whatsapp: '',
  role: 'PEDAGANG',
  docs: {},
})
watchEffect(() => {
  if (!u.value) return
  form.name = u.value.name
  form.whatsapp = u.value.whatsapp
  form.role = u.value.role
  form.docs = { ...u.value.docs }
})

const deadline = computed(() => addDays(new Date(u.value.lastRequestAt), VERIFY_SLA_DAYS))
const overdue = computed(() => u.value.status === 'PENDING' && new Date() > deadline.value)

const steps = computed(() => {
  const s = u.value.status
  return [
    { t: 'Pendaftaran dikirim', d: tanggalJam(u.value.lastRequestAt), c: 'done' },
    {
      t: 'Diperiksa UPT Pasar',
      d: s === 'PENDING' ? `Paling lambat ${tanggalJam(deadline.value.toISOString())}` : '',
      c: s === 'PENDING' ? 'current' : s === 'NEEDS_CORRECTION' ? 'failed' : 'done',
    },
    { t: 'Akun aktif', d: s === 'VERIFIED' ? tanggalJam(u.value.verifiedAt) : '', c: s === 'VERIFIED' ? 'done' : '' },
  ]
})

function resubmit() {
  errors.value = resubmitRegistration({ ...form, nik: u.value.nik, docs: { ...form.docs } })
  if (errors.value.length) {
    toast('Masih ada isian yang belum lengkap.', 'bad')
    return
  }
  toast('Perbaikan terkirim. Mohon tunggu pemeriksaan ulang.')
}
</script>

<template>
  <div class="stack-lg page-narrow">
    <PageHeader
      title="Status Pendaftaran"
      help="Di halaman ini Anda bisa melihat apakah akun sudah disetujui UPT Pasar."
    />

    <div class="card stack">
      <div class="row between">
        <span class="bold">Status saat ini</span>
        <StatusBadge :status="u.status" :label="VERIFY_LABEL[u.status]" />
      </div>
      <ol class="timeline">
        <li v-for="s in steps" :key="s.t" :class="s.c">
          <div class="bold">{{ s.t }}</div>
          <div v-if="s.d" class="small muted">{{ s.d }}</div>
        </li>
      </ol>
    </div>

    <AlertBox v-if="u.status === 'VERIFIED'" tone="ok" title="Akun Anda sudah disetujui!">
      <p>Semua menu sudah bisa digunakan.</p>
      <RouterLink :to="homeFor(u)" class="btn btn-block">Buka Beranda</RouterLink>
    </AlertBox>

    <AlertBox v-else-if="overdue" tone="warn" title="Pemeriksaan melewati batas waktu">
      Mohon maaf atas keterlambatannya. Silakan datang langsung ke kantor UPT Pasar dengan membawa KTP asli agar dibantu petugas.
    </AlertBox>

    <AlertBox v-else-if="u.status === 'PENDING'" tone="info" title="Sedang diperiksa">
      Pemeriksaan paling lama {{ VERIFY_SLA_DAYS }} hari. Kami juga akan mengabari lewat WhatsApp.
    </AlertBox>

    <AlertBox v-if="u.status === 'NEEDS_CORRECTION'" tone="bad" title="Pendaftaran perlu diperbaiki">
      <p class="bold">Catatan dari UPT Pasar:</p>
      <p>“{{ u.rejectionReason }}”</p>
      <p class="small">Perbaiki isian di bawah ini, lalu tekan <b>Kirim Ulang</b>.</p>
    </AlertBox>

    <section class="card">
      <h2>Data pendaftaran</h2>
      <p v-if="!editing" class="small muted">Data tidak bisa diubah selama diperiksa.</p>
      <AlertBox v-if="errors.length" tone="bad" :items="errors" style="margin-bottom: 14px" />
      <label class="field">
        <span class="label">Peran</span>
        <input class="input" :value="ROLE_LABEL[form.role]" disabled />
      </label>
      <label class="field">
        <span class="label">Nama lengkap</span>
        <input v-model="form.name" class="input" :disabled="!editing" />
      </label>
      <label class="field">
        <span class="label">NIK</span>
        <input class="input mono" :value="u.nik" disabled />
      </label>
      <label class="field">
        <span class="label">Nomor WhatsApp</span>
        <input v-model="form.whatsapp" class="input mono" inputmode="tel" :disabled="!editing" />
      </label>
      <FileUpload v-model="form.docs.ktp" label="Foto KTP" :disabled="!editing" required />
      <FileUpload
        v-if="form.role === 'PEDAGANG'"
        v-model="form.docs.kartuPedagang"
        label="Kartu Identitas Pedagang / Formulir Usul"
        :disabled="!editing"
        required
      />
      <FileUpload v-if="form.role === 'PETUGAS'" v-model="form.docs.kartuPetugas" label="Kartu Petugas Pasar" :disabled="!editing" required />
      <FileUpload v-if="form.role === 'UPT'" v-model="form.docs.suratTugas" label="Surat Tugas Admin UPT Pasar" :disabled="!editing" required />
      <button v-if="editing" type="button" class="btn btn-block" style="margin-top: 20px" @click="resubmit">
        <AppIcon name="refresh" /> Kirim Ulang
      </button>
    </section>

    <RouterLink to="/" class="btn btn-outline btn-block">Lihat Info Pasar sambil menunggu</RouterLink>
  </div>
</template>

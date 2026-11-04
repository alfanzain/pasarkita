<script setup lang="ts">
// Registration split into small steps so the form never feels overwhelming.
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import FileUpload from '@/components/FileUpload.vue'
import PasswordChecklist from '@/components/PasswordChecklist.vue'
import { nikProblem, passwordProblems, register, waProblem, type RegisterInput } from '@/services/auth'
import { toast } from '@/composables/ui'
import type { Role } from '@/types'

const step = ref(1)
const done = ref(false)
const errors = ref<string[]>([])
const showPw = ref(false)

const form = reactive<RegisterInput>({
  name: '',
  nik: '',
  whatsapp: '',
  password: '',
  role: 'PEDAGANG',
  docs: {},
})

const roles: { v: Role; title: string; desc: string; icon: string }[] = [
  { v: 'PEDAGANG', title: 'Pedagang', desc: 'Saya berjualan atau ingin menyewa lapak di pasar.', icon: 'store' },
  { v: 'PETUGAS', title: 'Petugas Lapangan', desc: 'Saya petugas resmi yang bertugas di pasar.', icon: 'users' },
  { v: 'UPT', title: 'UPT Pasar', desc: 'Saya admin kantor UPT Pasar.', icon: 'shield' },
]

const steps = ['Peran', 'Data Diri', 'Dokumen', 'Periksa']

function stepErrors(n: number) {
  const e: string[] = []
  if (n === 2) {
    if (!form.name.trim()) e.push('Nama lengkap wajib diisi')
    const a = nikProblem(form.nik)
    if (a) e.push(a)
    const b = waProblem(form.whatsapp)
    if (b) e.push(b)
    if (passwordProblems(form.password).length) e.push('Kata sandi belum memenuhi syarat')
  }
  if (n === 3) {
    if (!form.docs.ktp) e.push('Foto KTP wajib diunggah')
    if (form.role === 'PEDAGANG' && !form.docs.kartuPedagang) e.push('Kartu Identitas Pedagang / Formulir Usul wajib diunggah')
    if (form.role === 'PETUGAS' && !form.docs.kartuPetugas) e.push('Kartu Petugas Pasar wajib diunggah')
    if (form.role === 'UPT' && !form.docs.suratTugas) e.push('Surat Tugas Admin UPT Pasar wajib diunggah')
  }
  return e
}

function next() {
  errors.value = stepErrors(step.value)
  if (errors.value.length) return
  step.value++
  window.scrollTo({ top: 0 })
}

function prev() {
  errors.value = []
  step.value--
}

function submit() {
  const r = register({ ...form, docs: { ...form.docs } })
  if (!r.ok) {
    errors.value = r.errors
    toast('Pendaftaran gagal, periksa isian.', 'bad')
    return
  }
  done.value = true
}

const roleTitle = computed(() => roles.find((r) => r.v === form.role)?.title)
</script>

<template>
  <div class="wrap">
    <template v-if="done">
      <div class="card center stack-lg success">
        <div class="ok-icon"><AppIcon name="check" :size="44" /></div>
        <h1>Akun berhasil dibuat</h1>
        <p>Login untuk memantau status verifikasi. UPT Pasar akan memeriksa data Anda paling lama 3 hari kerja.</p>
        <RouterLink to="/masuk" class="btn btn-block">Masuk Sekarang</RouterLink>
      </div>
    </template>

    <template v-else>
      <ol class="stepper" aria-label="Langkah pendaftaran">
        <li v-for="(s, i) in steps" :key="s" :class="{ on: step === i + 1, done: step > i + 1 }" :aria-current="step === i + 1 ? 'step' : undefined">
          <span class="num">{{ step > i + 1 ? '✓' : i + 1 }}</span>
          <span class="txt">{{ s }}</span>
        </li>
      </ol>

      <AlertBox v-if="errors.length" tone="bad" title="Mohon lengkapi dulu:" :items="errors" style="margin-bottom: 16px" />

      <!-- Step 1 -->
      <section v-if="step === 1" class="stack">
        <h2>Anda mendaftar sebagai apa?</h2>
        <label v-for="r in roles" :key="r.v" class="choice role">
          <input v-model="form.role" type="radio" name="role" :value="r.v" />
          <AppIcon :name="r.icon" :size="30" />
          <span class="grow">
            <span class="bold d-block">{{ r.title }}</span>
            <span class="small muted">{{ r.desc }}</span>
          </span>
        </label>
      </section>

      <!-- Step 2 -->
      <section v-if="step === 2" class="card">
        <h2>Data diri</h2>
        <label class="field">
          <span class="label">Nama lengkap <span class="req">*</span></span>
          <input v-model="form.name" class="input" autocomplete="name" placeholder="Sesuai KTP" />
        </label>
        <label class="field">
          <span class="label">NIK <span class="req">*</span></span>
          <input v-model="form.nik" class="input mono" inputmode="numeric" maxlength="16" placeholder="16 angka di KTP" />
          <span class="hint">{{ form.nik.length }}/16 angka</span>
        </label>
        <label class="field">
          <span class="label">Nomor WhatsApp <span class="req">*</span></span>
          <input v-model="form.whatsapp" class="input mono" inputmode="tel" autocomplete="tel" placeholder="0812xxxxxxx" />
          <span class="hint">Kode OTP dan bukti bayar akan dikirim ke nomor ini.</span>
        </label>
        <label class="field">
          <span class="label">Kata sandi <span class="req">*</span></span>
          <div class="row">
            <input v-model="form.password" :type="showPw ? 'text' : 'password'" class="input grow" autocomplete="new-password" />
            <button type="button" class="btn btn-ghost" @click="showPw = !showPw">{{ showPw ? 'Sembunyikan' : 'Lihat' }}</button>
          </div>
        </label>
        <PasswordChecklist :password="form.password" />
      </section>

      <!-- Step 3 -->
      <section v-if="step === 3" class="card">
        <h2>Unggah dokumen</h2>
        <p class="muted">Foto dengan jelas, tidak buram, dan seluruh tulisan terbaca.</p>
        <FileUpload v-model="form.docs.ktp" label="Foto KTP" required />
        <FileUpload
          v-if="form.role === 'PEDAGANG'"
          v-model="form.docs.kartuPedagang"
          label="Kartu Identitas Pedagang / Formulir Usul Identitas Pedagang (sudah ditandatangani)"
          required
          hint="Formulir bisa diambil di kantor UPT Pasar."
        />
        <FileUpload
          v-if="form.role === 'PETUGAS'"
          v-model="form.docs.kartuPetugas"
          label="Kartu Petugas Pasar resmi dari UPT Pasar"
          required
        />
        <FileUpload
          v-if="form.role === 'UPT'"
          v-model="form.docs.suratTugas"
          label="Surat Tugas Admin UPT Pasar"
          required
        />
      </section>

      <!-- Step 4 -->
      <section v-if="step === 4" class="card stack">
        <h2>Periksa kembali</h2>
        <dl class="kv">
          <dt>Peran</dt>
          <dd>{{ roleTitle }}</dd>
          <dt>Nama</dt>
          <dd>{{ form.name }}</dd>
          <dt>NIK</dt>
          <dd class="mono">{{ form.nik }}</dd>
          <dt>WhatsApp</dt>
          <dd class="mono">{{ form.whatsapp }}</dd>
          <dt>Dokumen</dt>
          <dd>{{ Object.values(form.docs).filter(Boolean).length }} terunggah</dd>
        </dl>
        <AlertBox tone="info">Setelah dikirim, UPT Pasar akan memeriksa data Anda. Hasilnya bisa dilihat setelah masuk.</AlertBox>
      </section>

      <div class="actions">
        <button v-if="step > 1" type="button" class="btn btn-ghost" @click="prev">
          <AppIcon name="back" /> Kembali
        </button>
        <button v-if="step < 4" type="button" class="btn grow" @click="next">Lanjut</button>
        <button v-else type="button" class="btn grow" @click="submit">
          <AppIcon name="check" /> Kirim Pendaftaran
        </button>
      </div>
      <p class="center small muted" style="margin-top: 16px">
        Sudah punya akun? <RouterLink to="/masuk">Masuk</RouterLink>
      </p>
    </template>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 560px;
  margin: 0 auto;
}
.stepper {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  gap: 4px;
}
.stepper li {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--muted);
}
.num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--line);
  background: var(--surface);
}
.stepper li.on {
  color: var(--brand);
}
.stepper li.on .num {
  border-color: var(--brand);
  background: var(--brand);
  color: #fff;
}
.stepper li.done .num {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-soft);
}
.role {
  align-items: flex-start;
  padding: 16px;
}
.d-block {
  display: block;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.success {
  padding: 28px 20px;
}
.ok-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto;
  display: grid;
  place-items: center;
  background: var(--ok-soft);
  color: var(--ok);
}
</style>

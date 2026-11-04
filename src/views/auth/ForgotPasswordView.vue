<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageHeader from '@/components/PageHeader.vue'
import PasswordChecklist from '@/components/PasswordChecklist.vue'
import { maskedWa, requestOtp, resetPassword, verifyOtp } from '@/services/auth'
import { toast } from '@/composables/ui'

const router = useRouter()
const step = ref<'nik' | 'otp' | 'new'>('nik')
const nik = ref('')
const otp = ref('')
const pw = ref('')
const pw2 = ref('')
const errors = ref<string[]>([])

function send() {
  errors.value = []
  const e = requestOtp(nik.value)
  if (e) errors.value = [e]
  else step.value = 'otp'
}

function check() {
  const e = verifyOtp(nik.value, otp.value)
  errors.value = e ? [e] : []
  if (!e) step.value = 'new'
}

function save() {
  if (pw.value !== pw2.value) {
    errors.value = ['Kedua kata sandi belum sama']
    return
  }
  const e = resetPassword(nik.value, pw.value)
  errors.value = e
  if (e.length) return
  toast('Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru.')
  router.push('/masuk')
}
</script>

<template>
  <div class="wrap stack-lg">
    <PageHeader
      title="Ganti Kata Sandi"
      help="Kami akan mengirim kode rahasia (OTP) ke WhatsApp Anda. Masukkan kode itu untuk membuat kata sandi baru."
    />
    <AlertBox v-if="errors.length" tone="bad" :items="errors" />

    <form v-if="step === 'nik'" class="card" @submit.prevent="send">
      <label class="field">
        <span class="label">NIK Anda</span>
        <input v-model="nik" class="input mono" inputmode="numeric" maxlength="16" placeholder="16 angka di KTP" />
      </label>
      <button class="btn btn-block" style="margin-top: 16px">
        <AppIcon name="whatsapp" /> Kirim Kode ke WhatsApp
      </button>
    </form>

    <form v-else-if="step === 'otp'" class="card" @submit.prevent="check">
      <AlertBox tone="ok" style="margin-bottom: 14px">
        Kode sudah dikirim ke WhatsApp <b class="mono">{{ maskedWa(nik) }}</b>. Buka WhatsApp, lalu ketik 6 angka kodenya di bawah.
      </AlertBox>
      <label class="field">
        <span class="label">Kode OTP (6 angka)</span>
        <input
          v-model="otp"
          class="input mono otp"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="••••••"
        />
      </label>
      <button class="btn btn-block" style="margin-top: 16px">Cek Kode</button>
      <button type="button" class="btn btn-ghost btn-block" style="margin-top: 10px" @click="send">
        Kirim ulang kode
      </button>
    </form>

    <form v-else class="card" @submit.prevent="save">
      <label class="field">
        <span class="label">Kata sandi baru</span>
        <input v-model="pw" type="password" class="input" autocomplete="new-password" />
      </label>
      <PasswordChecklist :password="pw" />
      <label class="field">
        <span class="label">Ulangi kata sandi baru</span>
        <input v-model="pw2" type="password" class="input" autocomplete="new-password" />
        <span v-if="pw2 && pw !== pw2" class="hint" style="color: var(--bad)">Belum sama dengan kata sandi di atas</span>
      </label>
      <button class="btn btn-block" style="margin-top: 16px"><AppIcon name="check" /> Simpan Kata Sandi</button>
    </form>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 520px;
  margin: 0 auto;
}
.otp {
  font-size: 1.8rem;
  letter-spacing: 0.4em;
  text-align: center;
}
</style>

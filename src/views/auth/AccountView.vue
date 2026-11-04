<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageHeader from '@/components/PageHeader.vue'
import PasswordChecklist from '@/components/PasswordChecklist.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { currentUser, logout, updateProfile } from '@/services/auth'
import { confirmDialog, prefs, toast } from '@/composables/ui'
import { ROLE_LABEL, VERIFY_LABEL } from '@/utils/format'

const router = useRouter()
const u = currentUser.value!
const form = reactive({ name: u.name, whatsapp: u.whatsapp })
const pw = reactive({ value: '', confirm: '' })
const changePw = ref(false)
const errors = ref<string[]>([])

function save() {
  errors.value = []
  if (changePw.value && pw.value !== pw.confirm) {
    errors.value = ['Kedua kata sandi belum sama']
    return
  }
  errors.value = updateProfile({ ...form, password: changePw.value ? pw.value : undefined })
  if (errors.value.length) {
    toast('Profil gagal diperbarui.', 'bad')
    return
  }
  pw.value = ''
  pw.confirm = ''
  changePw.value = false
  toast('Profil berhasil diperbarui.')
}

async function doLogout() {
  if (!(await confirmDialog('Keluar dari aplikasi?', 'Anda perlu memasukkan NIK dan kata sandi lagi untuk masuk.', { okText: 'Ya, keluar' })))
    return
  logout()
  router.push('/')
}
</script>

<template>
  <div class="stack-lg page-narrow">
    <PageHeader title="Akun Saya" help="Ubah nama, nomor WhatsApp, atau kata sandi Anda di sini." />

    <div class="card row">
      <span class="avatar" aria-hidden="true">{{ u.name.charAt(0) }}</span>
      <div class="grow">
        <div class="bold">{{ u.name }}</div>
        <div class="small muted">{{ ROLE_LABEL[u.role] }} · NIK {{ u.nik }}</div>
      </div>
      <StatusBadge :status="u.status" :label="VERIFY_LABEL[u.status]" />
    </div>

    <form class="card" @submit.prevent="save">
      <AlertBox v-if="errors.length" tone="bad" :items="errors" style="margin-bottom: 14px" />
      <label class="field">
        <span class="label">Nama lengkap</span>
        <input v-model="form.name" class="input" autocomplete="name" />
      </label>
      <label class="field">
        <span class="label">Nomor WhatsApp</span>
        <input v-model="form.whatsapp" class="input mono" inputmode="tel" autocomplete="tel" />
      </label>
      <label class="choice" style="margin-top: 16px">
        <input v-model="changePw" type="checkbox" />
        Saya ingin ganti kata sandi
      </label>
      <template v-if="changePw">
        <label class="field" style="margin-top: 16px">
          <span class="label">Kata sandi baru</span>
          <input v-model="pw.value" type="password" class="input" autocomplete="new-password" />
        </label>
        <PasswordChecklist :password="pw.value" />
        <label class="field">
          <span class="label">Ulangi kata sandi baru</span>
          <input v-model="pw.confirm" type="password" class="input" autocomplete="new-password" />
        </label>
      </template>
      <button class="btn btn-block" style="margin-top: 20px"><AppIcon name="check" /> Simpan Perubahan</button>
    </form>

    <section class="card stack">
      <h2>Kenyamanan membaca</h2>
      <div class="chips">
        <button v-for="s in [1, 1.1, 1.25, 1.4]" :key="s" type="button" class="chip" :aria-pressed="prefs.fontScale === s" @click="prefs.fontScale = s">
          <span :style="{ fontSize: s + 'rem' }">A</span>
          {{ { 1: 'Biasa', 1.1: 'Besar', 1.25: 'Lebih besar', 1.4: 'Sangat besar' }[s] }}
        </button>
      </div>
      <label class="choice">
        <input v-model="prefs.contrast" type="checkbox" />
        Kontras tinggi
      </label>
    </section>

    <button type="button" class="btn btn-danger-outline btn-block" @click="doLogout">
      <AppIcon name="logout" /> Keluar
    </button>
  </div>
</template>

<style scoped>
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 1.4rem;
  flex: none;
}
</style>

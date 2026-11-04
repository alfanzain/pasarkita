<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import AppIcon from '@/components/AppIcon.vue'
import { homeFor, login } from '@/services/auth'
import { toast } from '@/composables/ui'

const router = useRouter()
const route = useRoute()
const nik = ref('')
const password = ref('')
const show = ref(false)
const error = ref('')
function submit() {
  error.value = ''
  if (!nik.value.trim() || !password.value) {
    error.value = 'Isi NIK dan kata sandi terlebih dahulu.'
    return
  }
  const r = login(nik.value, password.value)
  if (typeof r === 'string') {
    error.value = r
    return
  }
  toast(`Selamat datang, ${r.name.split(' ')[0]}!`)
  const next = typeof route.query.next === 'string' ? route.query.next : ''
  router.push(r.status === 'VERIFIED' && next ? next : homeFor(r))
}
</script>

<template>
  <div class="stack-lg auth">
    <div class="center hero">
      <span class="logo-lg" aria-hidden="true">PK</span>
      <h1>Masuk ke PasarKita</h1>
      <p class="muted">Untuk pedagang, petugas lapangan, dan UPT Pasar.</p>
    </div>

    <form class="card" novalidate @submit.prevent="submit">
      <AlertBox v-if="error" tone="bad" :title="error" style="margin-bottom: 16px" />
      <label class="field">
        <span class="label">NIK (16 angka di KTP)</span>
        <input
          v-model="nik"
          class="input mono"
          inputmode="numeric"
          autocomplete="username"
          maxlength="16"
          placeholder="16 angka sesuai KTP"
        />
      </label>
      <label class="field">
        <span class="label">Kata Sandi</span>
        <div class="row">
          <input
            v-model="password"
            :type="show ? 'text' : 'password'"
            class="input grow"
            autocomplete="current-password"
          />
          <button type="button" class="btn btn-ghost" @click="show = !show">
            {{ show ? 'Sembunyikan' : 'Lihat' }}
          </button>
        </div>
      </label>
      <button type="submit" class="btn btn-block" style="margin-top: 20px">
        <AppIcon name="user" /> Masuk
      </button>
      <RouterLink to="/lupa-sandi" class="btn btn-ghost btn-block" style="margin-top: 10px">
        Lupa kata sandi?
      </RouterLink>
    </form>

    <div class="card center">
      <p class="bold">Belum punya akun?</p>
      <RouterLink to="/daftar" class="btn btn-outline btn-block">Daftar Akun Baru</RouterLink>
      <p class="small muted" style="margin-top: 12px">
        Kesulitan? Datang ke kantor UPT Pasar, petugas akan membantu mendaftarkan.
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  max-width: 480px;
  margin: 0 auto;
}
.hero {
  padding-top: 8px;
}
.logo-lg {
  display: inline-grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 900;
  font-size: 1.5rem;
  margin-bottom: 12px;
}
</style>

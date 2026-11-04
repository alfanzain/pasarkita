<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import AlertBox from '@/components/AlertBox.vue'
import StallMap from '@/components/StallMap.vue'
import FileUpload from '@/components/FileUpload.vue'
import { db } from '@/data/db'
import { submitReport, type ReportInput } from '@/services/maint'
import { toast } from '@/composables/ui'
import type { DamageCategory, Urgency } from '@/types'
import { CATEGORY_ICON, CATEGORY_LABEL } from '@/utils/format'

const router = useRouter()

const form = reactive<ReportInput>({
  description: '',
  location: null,
  category: '',
  userUrgency: '',
  photo: undefined,
})
type Pick = { areaId: string; x: number; y: number }
const point = ref<Pick | null>(null)
const landmark = ref('')
const errors = ref<string[]>([])

const categories = Object.keys(CATEGORY_LABEL) as DamageCategory[]
const urgencies: { v: Urgency; label: string; text: string }[] = [
  { v: 'RENDAH', label: 'Rendah', text: 'Mengganggu sedikit, masih bisa berjualan seperti biasa' },
  { v: 'SEDANG', label: 'Sedang', text: 'Cukup mengganggu, perlu diperbaiki dalam beberapa hari' },
  { v: 'TINGGI', label: 'Tinggi', text: 'Berbahaya atau tidak bisa berjualan, perlu segera ditangani' },
]

// Only stalls in the same area count as "near".
function nearestStallCode(p: Pick) {
  let best = ''
  let bestD = Infinity
  for (const s of db.stalls) {
    if (s.areaId !== p.areaId) continue
    const d = Math.hypot(s.x + s.w / 2 - p.x, s.y + s.h / 2 - p.y)
    if (d < bestD) {
      bestD = d
      best = s.code
    }
  }
  return best ? `Dekat lapak ${best}` : `Area ${p.areaId}`
}

function onPick(p: Pick) {
  point.value = p
  landmark.value = nearestStallCode(p)
}

function submit() {
  form.location = point.value
    ? { ...point.value, label: landmark.value.trim() || nearestStallCode(point.value) }
    : null
  const res = submitReport({ ...form })
  if (Array.isArray(res)) {
    errors.value = res
    toast('Ada isian yang belum lengkap', 'bad')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  toast('Laporan berhasil dikirim & sedang menunggu verifikasi UPT Pasar', 'ok', 7000)
  router.push('/pedagang/tiket')
}
</script>

<template>
  <form class="stack-lg page-narrow" novalidate @submit.prevent="submit">
    <PageHeader
      title="Lapor Kerusakan"
      help="Ceritakan apa yang rusak, tandai tempatnya di peta, lalu foto kerusakannya. Petugas akan segera memeriksa."
    />

    <AlertBox v-if="errors.length" tone="bad" title="Laporan belum bisa dikirim. Mohon lengkapi:" :items="errors" />

    <section class="card stack">
      <h2>1. Apa yang rusak?</h2>
      <label class="field">
        <span class="label">Ceritakan kerusakannya <span class="req">*</span></span>
        <textarea
          v-model="form.description"
          class="textarea"
          placeholder="Contoh: Lampu di lorong los ikan mati, gelap kalau subuh."
        ></textarea>
      </label>
    </section>

    <section class="card stack">
      <h2>2. Jenis kerusakan <span class="req">*</span></h2>
      <div class="choice-grid cat-grid">
        <label v-for="c in categories" :key="c" class="choice">
          <input v-model="form.category" type="radio" name="cat" :value="c" />
          <span class="cat-ico" aria-hidden="true">{{ CATEGORY_ICON[c] }}</span>
          {{ CATEGORY_LABEL[c] }}
        </label>
      </div>
    </section>

    <section class="card stack">
      <h2>3. Di mana tempatnya? <span class="req">*</span></h2>
      <StallMap mode="pick-point" :point="point" :legend="false" @pick="onPick" />
      <AlertBox v-if="point" tone="ok">Lokasi sudah ditandai.</AlertBox>
      <label class="field">
        <span class="label">Patokan lokasi (boleh diubah)</span>
        <input v-model="landmark" class="input" placeholder="Contoh: Depan kios A-04" />
      </label>
    </section>

    <section class="card stack">
      <h2>4. Seberapa mendesak? <span class="req">*</span></h2>
      <div class="choice-grid">
        <label v-for="u in urgencies" :key="u.v" class="choice">
          <input v-model="form.userUrgency" type="radio" name="urg" :value="u.v" />
          <span>
            <span class="bold" style="display: block">{{ u.label }}</span>
            <span class="small muted" style="font-weight: 500">{{ u.text }}</span>
          </span>
        </label>
      </div>
    </section>

    <section class="card">
      <h2>5. Foto kerusakan</h2>
      <FileUpload v-model="form.photo" label="Foto bukti" required hint="Foto dari dekat agar petugas mudah melihat." />
    </section>

    <button type="submit" class="btn btn-block btn-accent">Kirim Laporan</button>
  </form>
</template>

<style scoped>
@media (min-width: 520px) {
  .cat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.cat-ico {
  font-size: 1.4rem;
}
</style>

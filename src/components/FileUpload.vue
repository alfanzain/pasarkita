<script setup lang="ts">
// Photo/document upload. Opens the camera on phones, shows a big preview, and compresses
// images so uploads work on slow market-area connections.
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ label: string; required?: boolean; hint?: string; disabled?: boolean }>()
const model = defineModel<string | undefined>()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)

async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const max = 1000
    const r = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * r)
    c.height = Math.round(img.height * r)
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function onChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  busy.value = true
  try {
    if (f.type.startsWith('image/')) model.value = await compress(f)
    else
      model.value = await new Promise<string>((res) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.readAsDataURL(f)
      })
  } finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}
</script>

<template>
  <div class="field">
    <span class="label">
      {{ props.label }} <span v-if="props.required" class="req">*</span>
    </span>
    <div class="upload" :class="{ has: !!model }">
      <template v-if="model">
        <img v-if="model.startsWith('data:image')" :src="model" alt="Pratinjau unggahan" class="preview" />
        <div v-else class="doc"><AppIcon name="bill" :size="32" /> Dokumen terunggah</div>
        <div v-if="!props.disabled" class="row">
          <button type="button" class="btn btn-outline btn-sm grow" @click="input?.click()">
            <AppIcon name="camera" :size="20" /> Ganti
          </button>
          <button type="button" class="btn btn-danger-outline btn-sm" @click="model = undefined">
            <AppIcon name="trash" :size="20" /> Hapus
          </button>
        </div>
      </template>
      <button
        v-else
        type="button"
        class="pick"
        :disabled="props.disabled || busy"
        @click="input?.click()"
      >
        <AppIcon name="camera" :size="32" />
        <span class="bold">{{ busy ? 'Memproses…' : 'Ambil foto / pilih file' }}</span>
      </button>
      <input
        ref="input"
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        class="sr-only"
        tabindex="-1"
        @change="onChange"
      />
    </div>
    <span v-if="props.hint" class="hint">{{ props.hint }}</span>
  </div>
</template>

<style scoped>
.upload {
  border: 2px dashed var(--line);
  border-radius: 14px;
  padding: 10px;
  background: var(--surface);
}
.upload.has {
  border-style: solid;
}
.pick {
  appearance: none;
  width: 100%;
  min-height: 110px;
  border: 0;
  background: var(--surface-2);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  color: var(--ink-2);
  cursor: pointer;
}
.preview {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 10px;
  background: var(--surface-2);
  margin-bottom: 10px;
}
.doc {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  font-weight: 700;
  margin-bottom: 10px;
}
</style>

<script setup lang="ts">
// "List barang yang dijual": tap commodities defined by the market, or add others one by one.
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { db } from '@/data/db'

const props = defineProps<{ disabled?: boolean }>()
const model = defineModel<string[]>({ required: true })
const other = ref('')

const known = computed(() => db.commodities.map((c) => c.name))
const custom = computed(() => model.value.filter((g) => !known.value.includes(g)))

function toggle(name: string) {
  if (props.disabled) return
  model.value = model.value.includes(name) ? model.value.filter((x) => x !== name) : [...model.value, name]
}

function addOther() {
  const v = other.value.trim()
  if (!v || model.value.some((x) => x.toLowerCase() === v.toLowerCase())) return
  model.value = [...model.value, v]
  other.value = ''
}

function remove(name: string) {
  model.value = model.value.filter((x) => x !== name)
}
</script>

<template>
  <div class="stack">
    <div class="chips" role="group" aria-label="Pilih komoditas">
      <button
        v-for="c in db.commodities"
        :key="c.id"
        type="button"
        class="chip"
        :aria-pressed="model.includes(c.name)"
        :disabled="props.disabled"
        @click="toggle(c.name)"
      >
        <span aria-hidden="true">{{ model.includes(c.name) ? '✓' : c.emoji }}</span>
        {{ c.name }}
      </button>
    </div>

    <div v-if="custom.length" class="chips" aria-label="Barang lainnya">
      <span v-for="g in custom" :key="g" class="chip" aria-pressed="true">
        {{ g }}
        <button
          v-if="!props.disabled"
          type="button"
          class="icon-btn x"
          :aria-label="'Hapus ' + g"
          @click="remove(g)"
        >
          <AppIcon name="close" :size="18" />
        </button>
      </span>
    </div>

    <div v-if="!props.disabled" class="row">
      <input
        v-model="other"
        class="input grow"
        placeholder="Barang lain, contoh: Daun Singkong"
        aria-label="Barang lainnya"
        @keydown.enter.prevent="addOther"
      />
      <button type="button" class="btn btn-outline" :disabled="!other.trim()" @click="addOther">
        <AppIcon name="plus" :size="20" /> Tambah
      </button>
    </div>
  </div>
</template>

<style scoped>
.x {
  min-width: 32px;
  min-height: 32px;
  margin-right: -8px;
}
</style>

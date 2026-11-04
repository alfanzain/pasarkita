<script setup lang="ts">
// Public stall detail: what is sold, and how to walk there from the entrance.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BottomSheet from './BottomSheet.vue'
import { currentUser } from '@/services/auth'
import { stallCategory } from '@/services/goods'
import { areaById, directionsTo, leaseOfStall } from '@/services/stall'
import type { Stall } from '@/types'
import { STALL_TYPE_LABEL } from '@/utils/format'

const props = defineProps<{ stall: Stall }>()
const emit = defineEmits<{ close: [] }>()
const lease = computed(() => leaseOfStall(props.stall.id))
const category = computed(() => stallCategory(props.stall.id))
const steps = computed(() => directionsTo(props.stall))
const area = computed(() => areaById(props.stall.areaId))
const canApply = computed(
  () =>
    !lease.value &&
    props.stall.status === 'AVAILABLE' &&
    currentUser.value?.role === 'PEDAGANG' &&
    currentUser.value.status === 'VERIFIED',
)
</script>

<template>
  <BottomSheet :title="`Lapak ${props.stall.code}`" @close="emit('close')">
    <div class="stack-lg">
      <header v-if="lease" class="stack">
        <span
          v-if="category"
          class="badge cat"
          :style="{ background: category.fill, color: category.ink, borderColor: category.ink }"
        >
          <span aria-hidden="true">{{ category.icon }}</span> {{ category.label }}
        </span>
        <h3 class="shop">{{ lease.shopName }}</h3>
      </header>
      <div v-else class="card-note">
        <p class="bold" style="margin: 0">Lapak ini sedang kosong.</p>
        <p v-if="props.stall.status === 'NOT_AVAILABLE'" class="small muted" style="margin: 4px 0 0">
          Sedang tidak disewakan (misalnya dalam perbaikan).
        </p>
      </div>

      <section v-if="lease">
        <h4 class="label">Barang yang dijual</h4>
        <div class="chips">
          <span v-for="g in lease.goods" :key="g" class="chip chip-static">{{ g }}</span>
        </div>
      </section>

      <section>
        <h4 class="label">Cara ke sini</h4>
        <ol class="steps">
          <li v-for="(t, i) in steps" :key="i">{{ t }}</li>
        </ol>
      </section>

      <dl class="kv">
        <dt>Kode lapak</dt>
        <dd class="mono">{{ props.stall.code }}</dd>
        <dt>Lantai & area</dt>
        <dd>{{ area ? `Lantai ${area.floor} · Area ${area.letter} — ${area.name}` : props.stall.location }}</dd>
        <dt>Jenis</dt>
        <dd>{{ STALL_TYPE_LABEL[props.stall.type] }}</dd>
      </dl>

      <RouterLink v-if="canApply" to="/pedagang/ajukan-lapak" class="btn btn-block">Ajukan lapak ini</RouterLink>
      <slot />
    </div>
  </BottomSheet>
</template>

<style scoped>
.cat {
  align-self: flex-start;
}
.shop {
  font-size: 1.35rem;
  margin: 0;
}
h4.label {
  margin: 0 0 8px;
}
.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
  display: grid;
  gap: 10px;
}
.steps li {
  counter-increment: step;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.steps li::before {
  content: counter(step);
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--brand);
  color: var(--brand-ink);
  font-weight: 700;
  font-size: 0.9rem;
}
</style>

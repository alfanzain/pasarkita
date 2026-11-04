<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StallMap from '@/components/StallMap.vue'
import CommodityPicker from '@/components/CommodityPicker.vue'
import { daysLeft, myLeases, stallById } from '@/services/stall'
import { toast } from '@/composables/ui'
import type { Lease } from '@/types'
import { STALL_TYPE_LABEL, tanggal } from '@/utils/format'

const leases = computed(() => myLeases())
const selectedId = ref<string | null>(leases.value[0]?.stallId ?? null)
const editing = ref<string | null>(null)
const draft = reactive<{ shopName: string; goods: string[] }>({ shopName: '', goods: [] })

function edit(l: Lease) {
  editing.value = l.id
  draft.shopName = l.shopName
  draft.goods = [...l.goods]
  selectedId.value = l.stallId
}

function save(l: Lease) {
  if (!draft.shopName.trim()) return toast('Nama lapak wajib diisi', 'bad')
  if (!draft.goods.length) return toast('Pilih minimal satu barang yang dijual', 'bad')
  l.shopName = draft.shopName.trim()
  l.goods = [...draft.goods]
  editing.value = null
  toast('Data lapak berhasil disimpan')
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Lapak Saya"
      help="Daftar lapak yang Anda sewa. Anda bisa mengubah nama lapak dan barang yang dijual agar mudah dicari pembeli."
    />

    <EmptyState v-if="!leases.length" icon="store" title="Belum punya lapak" text="Ajukan sewa lapak terlebih dahulu.">
      <RouterLink to="/pedagang/ajukan-lapak" class="btn">Ajukan Lapak</RouterLink>
    </EmptyState>

    <template v-else>
      <StallMap :selected-id="selectedId" :highlight-ids="leases.map((l) => l.stallId)" :legend="false" />

      <ul class="list card-grid">
        <li v-for="l in leases" :key="l.id" class="card stack" @click="selectedId = l.stallId">
          <div class="row between">
            <div>
              <div class="big">Lapak {{ stallById(l.stallId)?.code }}</div>
              <div class="muted">
                {{ stallById(l.stallId) ? STALL_TYPE_LABEL[stallById(l.stallId)!.type] : '' }} ·
                {{ stallById(l.stallId)?.location }}
              </div>
            </div>
            <span class="badge" :class="daysLeft(l.endDate) <= 30 ? 'tone-warn' : 'tone-ok'">
              {{ daysLeft(l.endDate) <= 30 ? '!' : '✓' }} Sisa {{ Math.max(0, daysLeft(l.endDate)) }} hari
            </span>
          </div>

          <dl class="kv">
            <dt>Masa sewa</dt>
            <dd>{{ tanggal(l.startDate) }} – {{ tanggal(l.endDate) }}</dd>
          </dl>

          <template v-if="editing === l.id">
            <label class="field">
              <span class="label">Nama lapak / usaha <span class="req">*</span></span>
              <input v-model="draft.shopName" class="input" />
            </label>
            <div class="field">
              <span class="label">Barang yang dijual <span class="req">*</span></span>
              <CommodityPicker v-model="draft.goods" />
            </div>
            <div class="row">
              <button type="button" class="btn btn-ghost grow" @click="editing = null">Batal</button>
              <button type="button" class="btn grow" @click="save(l)">Simpan</button>
            </div>
          </template>
          <template v-else>
            <dl class="kv">
              <dt>Nama lapak</dt>
              <dd>{{ l.shopName }}</dd>
            </dl>
            <div>
              <div class="muted small" style="margin-bottom: 6px">Barang yang dijual</div>
              <div class="chips">
                <span v-for="g in l.goods" :key="g" class="chip chip-static">{{ g }}</span>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-block" @click.stop="edit(l)">Ubah Nama & Barang</button>
            <RouterLink v-if="daysLeft(l.endDate) <= 30" to="/pedagang/perpanjangan" class="btn btn-block">
              Perpanjang Sewa
            </RouterLink>
          </template>
        </li>
      </ul>

      <RouterLink to="/pedagang/ajukan-lapak" class="btn btn-ghost btn-block">+ Ajukan Lapak Tambahan</RouterLink>
    </template>
  </div>
</template>

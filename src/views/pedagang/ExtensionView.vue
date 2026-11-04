<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import AlertBox from '@/components/AlertBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import CommodityPicker from '@/components/CommodityPicker.vue'
import { daysLeft, extensionStartDate, hasRunningExtension, myLeases, stallById, submitExtension } from '@/services/stall'
import { toast } from '@/composables/ui'
import type { Lease } from '@/types'
import { rupiah, STALL_TYPE_LABEL, tanggal } from '@/utils/format'

const leases = computed(() => myLeases())
const picked = ref<Lease | null>(null)
const goods = ref<string[]>([])
const error = ref('')
const done = ref(false)

const stall = computed(() => stallById(picked.value?.stallId))

function pick(l: Lease) {
  picked.value = l
  goods.value = [...l.goods]
  error.value = ''
  done.value = false
}

function submit() {
  if (!picked.value) return
  error.value = submitExtension(picked.value.id, goods.value)
  if (error.value) {
    toast(error.value, 'bad')
    return
  }
  picked.value = null
  done.value = true
  toast('Perpanjangan berhasil diajukan')
}

function leftText(end: string) {
  const d = daysLeft(end)
  return d >= 0 ? `${d} hari lagi` : `lewat ${-d} hari`
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Perpanjang Sewa Lapak"
      help="Pilih lapak yang ingin diperpanjang. Sebaiknya ajukan sebelum masa sewa habis."
    />

    <AlertBox v-if="done" tone="ok" title="Perpanjangan berhasil diajukan">
      <p>Sekarang menunggu pemeriksaan dari Petugas / UPT Pasar.</p>
      <p>Silakan buka <b>Riwayat Perpanjangan</b> untuk melihat perkembangannya.</p>
      <RouterLink to="/pedagang/riwayat-perpanjangan" class="btn btn-block">Lihat Riwayat Perpanjangan</RouterLink>
    </AlertBox>

    <EmptyState v-if="!leases.length" icon="store" title="Belum punya lapak" text="Anda belum menyewa lapak di pasar ini.">
      <RouterLink to="/pedagang/ajukan-lapak" class="btn">Ajukan Lapak</RouterLink>
    </EmptyState>

    <template v-else-if="!picked">
      <h2>Lapak yang Anda sewa</h2>
      <ul class="list card-grid">
        <li v-for="l in leases" :key="l.id" class="card stack">
          <div class="row between">
            <div>
              <div class="big">Lapak {{ stallById(l.stallId)?.code }}</div>
              <div class="muted">{{ l.shopName }}</div>
            </div>
            <span class="badge" :class="daysLeft(l.endDate) <= 30 ? 'tone-warn' : 'tone-ok'">
              {{ daysLeft(l.endDate) <= 30 ? '!' : '✓' }} {{ leftText(l.endDate) }}
            </span>
          </div>
          <dl class="kv">
            <dt>Masa sewa</dt>
            <dd>{{ tanggal(l.startDate) }} – {{ tanggal(l.endDate) }}</dd>
            <dt>Harus diperpanjang sebelum</dt>
            <dd>{{ tanggal(l.endDate) }}</dd>
          </dl>
          <AlertBox v-if="hasRunningExtension(l.stallId)" tone="warn">
            Perpanjangan untuk lapak ini sedang diproses.
          </AlertBox>
          <button v-else type="button" class="btn btn-block" @click="pick(l)">Perpanjang Lapak Ini</button>
        </li>
      </ul>
    </template>

    <form v-else class="card stack" @submit.prevent="submit">
      <h2>Formulir Perpanjangan</h2>
      <label class="field">
        <span class="label">Kode lapak</span>
        <input class="input" :value="stall?.code" readonly disabled />
      </label>
      <label class="field">
        <span class="label">Nama lapak</span>
        <input class="input" :value="picked.shopName" readonly disabled />
      </label>
      <label class="field">
        <span class="label">Tipe & lokasi</span>
        <input class="input" :value="`${stall ? STALL_TYPE_LABEL[stall.type] : ''} – ${stall?.location ?? ''}`" readonly disabled />
      </label>
      <label class="field">
        <span class="label">Tanggal mulai perpanjangan</span>
        <input class="input" :value="tanggal(extensionStartDate(picked.endDate))" readonly disabled />
        <span class="hint">
          Jika diajukan sebelum sewa habis, perpanjangan dimulai dari tanggal akhir sewa. Jika sudah lewat, dimulai hari ini.
        </span>
      </label>
      <label class="field">
        <span class="label">Biaya sewa 6 bulan</span>
        <input class="input" :value="rupiah(stall?.pricePer6Months ?? 0)" readonly disabled />
      </label>
      <div class="field">
        <span class="label">Barang yang dijual <span class="req">*</span></span>
        <span class="hint" style="margin-bottom: 8px">Anda boleh menambah atau mengubah daftar barang.</span>
        <CommodityPicker v-model="goods" />
      </div>
      <AlertBox v-if="error" tone="bad">{{ error }}</AlertBox>
      <button type="submit" class="btn btn-block">Kirim Perpanjangan</button>
      <button type="button" class="btn btn-ghost btn-block" @click="picked = null">Kembali</button>
    </form>
  </div>
</template>

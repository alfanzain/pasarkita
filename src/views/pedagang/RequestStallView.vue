<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import AlertBox from '@/components/AlertBox.vue'
import StallListPanel from '@/components/StallListPanel.vue'
import StallMap from '@/components/StallMap.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import CommodityPicker from '@/components/CommodityPicker.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { db } from '@/data/db'
import { hasRunningNewRequest, pendingRequestFor, submitNewRequest } from '@/services/stall'
import { toast } from '@/composables/ui'
import type { Stall } from '@/types'
import { rupiah, STALL_STATUS_LABEL, STALL_TYPE_LABEL } from '@/utils/format'

const selected = ref<Stall | null>(null)
const shopName = ref('')
const goods = ref<string[]>([])
const error = ref('')
const done = ref(false)

const running = computed(() => hasRunningNewRequest())
const pendingIds = computed(() =>
  db.requests
    .filter((r) => r.kind === 'NEW' && (r.status === 'PENDING' || r.status === 'APPROVED'))
    .map((r) => r.stallId),
)

const available = computed(() =>
  db.stalls
    .filter((s) => s.status === 'AVAILABLE' && !pendingIds.value.includes(s.id))
    .sort((a, b) => a.code.localeCompare(b.code)),
)
const availableDetail = (s: Stall) => `${STALL_TYPE_LABEL[s.type]} · ${rupiah(s.pricePer6Months)}/6 bln`

const takenByOther = computed(() => !!selected.value && !!pendingRequestFor(selected.value.id))
const canFill = computed(
  () => !!selected.value && selected.value.status === 'AVAILABLE' && !takenByOther.value && !running.value,
)

// Monthly service retribution estimate for this stall type (components matching type + general ones).
const monthlyEstimate = computed(() => {
  const s = selected.value
  if (!s) return 0
  return db.retribution.filter((r) => !r.stallType || r.stallType === s.type).reduce((a, r) => a + r.pricePerDay, 0) * 30
})

function open(s: Stall) {
  selected.value = s
  shopName.value = ''
  goods.value = []
  error.value = ''
}

function submit() {
  if (!selected.value) return
  error.value = submitNewRequest(selected.value.id, shopName.value, goods.value)
  if (error.value) {
    toast(error.value, 'bad')
    return
  }
  selected.value = null
  done.value = true
  toast('Pengajuan lapak berhasil dikirim')
}
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Ajukan Lapak Baru"
      help="Pilih kotak lapak berwarna hijau di peta, lalu isi nama lapak dan barang yang akan dijual."
    />

    <AlertBox v-if="done" tone="ok" title="Pengajuan berhasil dikirim">
      <p>Sekarang menunggu pemeriksaan dari UPT Pasar. Anda akan mendapat kabar lewat WhatsApp.</p>
      <p>Silakan buka <b>Riwayat Pengajuan Lapak</b> untuk melihat perkembangan pengajuan Anda.</p>
      <RouterLink to="/pedagang/riwayat-pengajuan" class="btn btn-block">Lihat Riwayat Pengajuan</RouterLink>
    </AlertBox>

    <AlertBox v-else-if="running" tone="warn" title="Masih ada pengajuan yang sedang diperiksa">
      <p>Anda baru bisa mengajukan lapak lagi setelah pengajuan sebelumnya selesai diperiksa.</p>
      <RouterLink to="/pedagang/riwayat-pengajuan" class="btn btn-outline btn-block">Lihat Pengajuan Saya</RouterLink>
    </AlertBox>

    <div class="stack-lg">
      <StallMap mode="pick-stall" :pending-ids="pendingIds" :selected-id="selected?.id" @select="open" />
      <StallListPanel
        :title="`Lapak tersedia (${available.length})`"
        :stalls="available"
        :detail="availableDetail"
        :selected-id="selected?.id"
        empty="Belum ada lapak yang tersedia. Coba cek lagi nanti."
        @select="open"
      />
    </div>

    <BottomSheet v-if="selected" :title="`Lapak ${selected.code}`" @close="selected = null">
      <div class="stack">
        <div class="card card-tight">
          <dl class="kv">
            <dt>Kode lapak</dt>
            <dd>{{ selected.code }}</dd>
            <dt>Tipe</dt>
            <dd>{{ STALL_TYPE_LABEL[selected.type] }}</dd>
            <dt>Lokasi</dt>
            <dd>{{ selected.location }}</dd>
            <dt>Status</dt>
            <dd><StatusBadge :status="selected.status" :label="STALL_STATUS_LABEL[selected.status]" /></dd>
            <dt>Sewa 6 bulan</dt>
            <dd class="big">{{ rupiah(selected.pricePer6Months) }}</dd>
          </dl>
          <p class="small muted" style="margin: 10px 0 0">
            Harga sewa ini <b>belum termasuk retribusi bulanan</b> (kebersihan, keamanan, layanan pasar)
            sekitar {{ rupiah(monthlyEstimate) }} per bulan.
          </p>
        </div>

        <AlertBox v-if="selected.status !== 'AVAILABLE'" tone="info">
          Lapak ini {{ STALL_STATUS_LABEL[selected.status].toLowerCase() }}. Silakan pilih lapak lain yang berwarna hijau.
        </AlertBox>
        <AlertBox v-else-if="takenByOther" tone="warn" title="Sudah ada yang mengajukan">
          Lapak ini sudah lebih dulu diajukan pedagang lain. Coba cek lagi nanti, siapa tahu tersedia kembali,
          atau cari lapak lain.
        </AlertBox>
        <AlertBox v-else-if="running" tone="warn">Selesaikan dulu pengajuan Anda yang masih diperiksa.</AlertBox>

        <template v-if="selected.status === 'AVAILABLE'">
          <label class="field">
            <span class="label">Nama lapak / usaha <span class="req">*</span></span>
            <input v-model="shopName" class="input" :disabled="!canFill" placeholder="Contoh: Warung Sayur Bu Ani" />
          </label>
          <div class="field">
            <span class="label">Barang yang dijual <span class="req">*</span></span>
            <span class="hint" style="margin-bottom: 8px">Ketuk barang yang dijual. Jika tidak ada, tulis di kolom bawah.</span>
            <CommodityPicker v-model="goods" :disabled="!canFill" />
          </div>
          <AlertBox v-if="error" tone="bad">{{ error }}</AlertBox>
        </template>
      </div>
      <template v-if="selected.status === 'AVAILABLE'" #footer>
        <button type="button" class="btn btn-ghost" @click="selected = null">Batal</button>
        <button type="button" class="btn" :disabled="!canFill" @click="submit">Kirim Pengajuan</button>
      </template>
    </BottomSheet>
  </div>
</template>

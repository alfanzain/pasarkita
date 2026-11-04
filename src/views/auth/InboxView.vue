<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { db } from '@/data/db'
import { currentUser } from '@/services/auth'
import { tanggalJam } from '@/utils/format'

// Demo-only: shows what the WhatsApp gateway would have delivered (OTP, receipts, decisions).
const msgs = computed(() => {
  const u = currentUser.value
  return (db.messages ?? []).filter((m) => !u || u.role !== 'PEDAGANG' || m.to === u.whatsapp)
})
</script>

<template>
  <div class="stack-lg">
    <PageHeader
      title="Pesan WhatsApp (simulasi)"
      help="Daftar pesan yang dikirim sistem ke WhatsApp pengguna, seperti kode OTP dan bukti bayar."
    />
    <EmptyState v-if="!msgs.length" icon="whatsapp" title="Belum ada pesan" />
    <ul v-else class="list">
      <li v-for="m in msgs" :key="m.id" class="card card-tight">
        <div class="row between small muted">
          <span class="mono">Ke {{ m.to }}</span>
          <span>{{ tanggalJam(m.at) }}</span>
        </div>
        <p style="margin: 6px 0 0">{{ m.text }}</p>
      </li>
    </ul>
  </div>
</template>

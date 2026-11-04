// Navigation per role. Bottom bar keeps at most 5 large items; everything else is in "Menu".
import { computed } from 'vue'
import { db } from '@/data/db'
import { currentUser } from '@/services/auth'
import { myInvoices } from '@/services/pay'

export interface NavItem {
  to: string
  label: string
  icon: string
  badge?: number
}
export interface NavGroup {
  title: string
  items: NavItem[]
}

// Work waiting for staff. Shared by the sidebar badges, the bottom bar and the dashboard queue.
export const staffCounts = computed(() => ({
  pendingUsers: db.users.filter((x) => x.status === 'PENDING').length,
  pendingReq: db.requests.filter((r) => r.status === 'PENDING').length,
  clusterReview: db.tickets.filter((t) => t.status === 'CLUSTER_REVIEW').length,
  openDamage: db.tickets.filter((t) => t.status === 'CLUSTER_REVIEW' || t.status === 'OPEN').length,
  unpaid: db.invoices.filter((i) => i.status === 'UNPAID').length,
}))

export const bottomNav = computed<NavItem[]>(() => {
  const u = currentUser.value
  if (!u) {
    return [
      { to: '/', label: 'Beranda', icon: 'home' },
      { to: '/peta', label: 'Peta', icon: 'map' },
      { to: '/cari', label: 'Cari', icon: 'search' },
      { to: '/masuk', label: 'Masuk', icon: 'user' },
    ]
  }
  if (u.status !== 'VERIFIED') {
    return [
      { to: '/status-verifikasi', label: 'Status', icon: 'clock' },
      { to: '/', label: 'Info Pasar', icon: 'home' },
      { to: '/peta', label: 'Peta', icon: 'map' },
      { to: '/akun', label: 'Akun', icon: 'user' },
    ]
  }
  if (u.role === 'PEDAGANG') {
    const unpaid = myInvoices().filter((i) => i.status === 'UNPAID').length
    return [
      { to: '/pedagang', label: 'Beranda', icon: 'home' },
      { to: '/pedagang/usaha', label: 'Lapak', icon: 'store' },
      { to: '/pedagang/tagihan', label: 'Tagihan', icon: 'bill', badge: unpaid },
      { to: '/pedagang/tiket', label: 'Laporan', icon: 'wrench' },
    ]
  }
  const { pendingReq, openDamage } = staffCounts.value
  if (u.role === 'UPT') {
    return [
      { to: '/kelola', label: 'Beranda', icon: 'home' },
      { to: '/kelola/pengajuan', label: 'Ajuan', icon: 'list', badge: pendingReq },
      { to: '/kelola/kerusakan', label: 'Kerusakan', icon: 'wrench', badge: openDamage },
      { to: '/kelola/lapak', label: 'Lapak', icon: 'layout' },
    ]
  }
  return [
    { to: '/kelola', label: 'Beranda', icon: 'home' },
    { to: '/kelola/pembayaran', label: 'Tagih', icon: 'cash' },
    { to: '/kelola/kerusakan', label: 'Kerusakan', icon: 'wrench', badge: openDamage },
    { to: '/kelola/harga-harian', label: 'Harga', icon: 'chart' },
  ]
})

export const menuGroups = computed<NavGroup[]>(() => {
  const u = currentUser.value
  const publicGroup: NavGroup = {
    title: 'Info Pasar',
    items: [
      { to: '/', label: 'Harga Hari Ini', icon: 'chart' },
      { to: '/pengumuman', label: 'Pengumuman', icon: 'megaphone' },
      { to: '/peta', label: 'Peta Pasar', icon: 'map' },
      { to: '/cari', label: 'Cari Barang / Toko', icon: 'search' },
    ],
  }
  if (!u) return [publicGroup]
  const account: NavGroup = {
    title: 'Akun',
    items: [
      { to: '/akun', label: 'Akun Saya', icon: 'user' },
      { to: '/pesan', label: 'Pesan WhatsApp (simulasi)', icon: 'whatsapp' },
    ],
  }
  if (u.status !== 'VERIFIED') return [{ title: 'Pendaftaran', items: [{ to: '/status-verifikasi', label: 'Status Pendaftaran', icon: 'clock' }] }, publicGroup, account]

  if (u.role === 'PEDAGANG') {
    return [
      {
        title: 'Lapak',
        items: [
          { to: '/pedagang/usaha', label: 'Lapak Saya', icon: 'store' },
          { to: '/pedagang/ajukan-lapak', label: 'Ajukan Lapak Baru', icon: 'plus' },
          { to: '/pedagang/riwayat-pengajuan', label: 'Riwayat Pengajuan Lapak', icon: 'list' },
          { to: '/pedagang/perpanjangan', label: 'Perpanjang Sewa', icon: 'refresh' },
          { to: '/pedagang/riwayat-perpanjangan', label: 'Riwayat Perpanjangan', icon: 'clock' },
        ],
      },
      {
        title: 'Pembayaran',
        items: [{ to: '/pedagang/tagihan', label: 'Tagihan & Riwayat Bayar', icon: 'bill' }],
      },
      {
        title: 'Kerusakan',
        items: [
          { to: '/pedagang/lapor', label: 'Lapor Kerusakan', icon: 'alert' },
          { to: '/pedagang/tiket', label: 'Tiket Saya', icon: 'ticket' },
        ],
      },
      publicGroup,
      account,
    ]
  }

  const c = staffCounts.value
  const staff: NavGroup[] = [{ title: 'Ringkasan', items: [{ to: '/kelola', label: 'Beranda', icon: 'home' }] }]
  if (u.role === 'UPT') {
    staff.push({
      title: 'Administrasi',
      items: [
        { to: '/kelola/verifikasi-user', label: 'Verifikasi Pendaftaran', icon: 'shield', badge: c.pendingUsers },
        { to: '/kelola/lapak', label: 'Master Lapak', icon: 'layout' },
        { to: '/kelola/retribusi', label: 'Master Retribusi', icon: 'bill' },
      ],
    })
  }
  staff.push(
    {
      title: 'Lapak & Pembayaran',
      items: [
        { to: '/kelola/pengajuan', label: 'Persetujuan Pengajuan', icon: 'list', badge: c.pendingReq },
        { to: '/kelola/pembayaran', label: 'Catat Pembayaran Lapangan', icon: 'cash' },
      ],
    },
    {
      title: 'Kerusakan',
      items: [
        { to: '/kelola/kerusakan', label: 'Dashboard Kerusakan', icon: 'wrench', badge: c.openDamage },
        { to: '/kelola/clustering', label: 'Cek Laporan Mirip', icon: 'layers', badge: c.clusterReview },
      ],
    },
    {
      title: 'Informasi Pasar',
      items: [
        { to: '/kelola/komoditas', label: 'Komoditas', icon: 'basket' },
        { to: '/kelola/harga-harian', label: 'Input Harga Harian', icon: 'chart' },
        { to: '/kelola/riwayat-harga', label: 'Riwayat Harga', icon: 'clock' },
        { to: '/kelola/pengumuman', label: 'Pengumuman', icon: 'megaphone' },
      ],
    },
  )
  return staff
})

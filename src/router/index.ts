import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { currentUser, homeFor } from '@/services/auth'
import type { Role } from '@/types'

declare module 'vue-router' {
  interface RouteMeta {
    title: string
    // Logged-in roles allowed. Undefined = public.
    roles?: Role[]
    // Requires VERIFIED status (unverified users are sent to the verification status page).
    verified?: boolean
    guestOnly?: boolean
    // Show a back arrow to this path in the top bar.
    back?: string
  }
}

const STAFF: Role[] = ['UPT', 'PETUGAS']
const ALL: Role[] = ['PEDAGANG', 'UPT', 'PETUGAS']

const routes: RouteRecordRaw[] = [
  // Public (INFO)
  { path: '/', component: () => import('@/views/public/HomeView.vue'), meta: { title: 'Beranda' } },
  { path: '/peta', component: () => import('@/views/public/MapView.vue'), meta: { title: 'Peta Pasar' } },
  { path: '/pengumuman', component: () => import('@/views/public/AnnouncementsView.vue'), meta: { title: 'Pengumuman', back: '/' } },
  { path: '/cari',component: () => import('@/views/public/SearchView.vue'), meta: { title: 'Cari Barang' } },

  // IAM
  { path: '/masuk', component: () => import('@/views/auth/LoginView.vue'), meta: { title: 'Masuk', guestOnly: true } },
  { path: '/daftar', component: () => import('@/views/auth/RegisterView.vue'), meta: { title: 'Daftar Akun', guestOnly: true, back: '/masuk' } },
  { path: '/lupa-sandi', component: () => import('@/views/auth/ForgotPasswordView.vue'), meta: { title: 'Lupa Kata Sandi', guestOnly: true, back: '/masuk' } },
  { path: '/status-verifikasi', component: () => import('@/views/auth/VerificationStatusView.vue'), meta: { title: 'Status Pendaftaran', roles: ALL } },
  { path: '/akun', component: () => import('@/views/auth/AccountView.vue'), meta: { title: 'Akun Saya', roles: ALL } },
  { path: '/pesan', component: () => import('@/views/auth/InboxView.vue'), meta: { title: 'Pesan WhatsApp', back: '/' } },

  // Pedagang
  { path: '/pedagang', component: () => import('@/views/pedagang/MerchantHomeView.vue'), meta: { title: 'Beranda Pedagang', roles: ['PEDAGANG'], verified: true } },
  { path: '/pedagang/ajukan-lapak', component: () => import('@/views/pedagang/RequestStallView.vue'), meta: { title: 'Ajukan Lapak Baru', roles: ['PEDAGANG'], verified: true, back: '/pedagang' } },
  { path: '/pedagang/riwayat-pengajuan', component: () => import('@/views/pedagang/RequestHistoryView.vue'), props: { kind: 'NEW' }, meta: { title: 'Riwayat Pengajuan Lapak', roles: ['PEDAGANG'], verified: true, back: '/pedagang' } },
  { path: '/pedagang/perpanjangan', component: () => import('@/views/pedagang/ExtensionView.vue'), meta: { title: 'Perpanjang Sewa', roles: ['PEDAGANG'], verified: true, back: '/pedagang' } },
  { path: '/pedagang/riwayat-perpanjangan', component: () => import('@/views/pedagang/RequestHistoryView.vue'), props: { kind: 'EXTEND' }, meta: { title: 'Riwayat Perpanjangan', roles: ['PEDAGANG'], verified: true, back: '/pedagang' } },
  { path: '/pedagang/tagihan', component: () => import('@/views/pedagang/BillsView.vue'), meta: { title: 'Tagihan & Pembayaran', roles: ['PEDAGANG'], verified: true } },
  { path: '/pedagang/tagihan/:id', component: () => import('@/views/pedagang/BillDetailView.vue'), props: true, meta: { title: 'Detail Tagihan', roles: ['PEDAGANG'], verified: true, back: '/pedagang/tagihan' } },
  { path: '/pedagang/usaha', component: () => import('@/views/pedagang/BusinessProfileView.vue'), meta: { title: 'Lapak Saya', roles: ['PEDAGANG'], verified: true } },
  { path: '/pedagang/lapor', component: () => import('@/views/pedagang/ReportDamageView.vue'), meta: { title: 'Lapor Kerusakan', roles: ['PEDAGANG'], verified: true, back: '/pedagang/tiket' } },
  { path: '/pedagang/tiket', component: () => import('@/views/pedagang/MyTicketsView.vue'), meta: { title: 'Tiket Saya', roles: ['PEDAGANG'], verified: true } },
  { path: '/pedagang/tiket/:id', component: () => import('@/views/pedagang/TicketDetailView.vue'), props: true, meta: { title: 'Detail Laporan', roles: ['PEDAGANG'], verified: true, back: '/pedagang/tiket' } },

  // UPT Pasar & Petugas Lapangan
  { path: '/kelola', component: () => import('@/views/staff/StaffHomeView.vue'), meta: { title: 'Beranda Pengelola', roles: STAFF, verified: true } },
  { path: '/kelola/verifikasi-user', component: () => import('@/views/staff/UserVerificationView.vue'), meta: { title: 'Verifikasi Pendaftaran', roles: ['UPT'], verified: true, back: '/kelola' } },
  { path: '/kelola/retribusi', component: () => import('@/views/staff/RetributionView.vue'), meta: { title: 'Master Biaya Retribusi', roles: ['UPT'], verified: true, back: '/kelola' } },
  { path: '/kelola/lapak', component: () => import('@/views/staff/StallMasterView.vue'), meta: { title: 'Master Lapak Pasar', roles: ['UPT'], verified: true, back: '/kelola' } },
  { path: '/kelola/pengajuan', component: () => import('@/views/staff/RequestApprovalView.vue'), meta: { title: 'Persetujuan Pengajuan', roles: STAFF, verified: true, back: '/kelola' } },
  { path: '/kelola/pembayaran', component: () => import('@/views/staff/FieldPaymentView.vue'), meta: { title: 'Catat Pembayaran', roles: STAFF, verified: true, back: '/kelola' } },
  { path: '/kelola/kerusakan', component: () => import('@/views/staff/DamageDashboardView.vue'), meta: { title: 'Laporan Kerusakan', roles: STAFF, verified: true } },
  { path: '/kelola/kerusakan/:id', component: () => import('@/views/staff/DamageDetailView.vue'), props: true, meta: { title: 'Detail Kerusakan', roles: STAFF, verified: true, back: '/kelola/kerusakan' } },
  { path: '/kelola/clustering', component: () => import('@/views/staff/ClusteringView.vue'), meta: { title: 'Cek Laporan Mirip', roles: STAFF, verified: true, back: '/kelola/kerusakan' } },
  { path: '/kelola/komoditas', component: () => import('@/views/staff/CommodityView.vue'), meta: { title: 'Komoditas Pasar', roles: STAFF, verified: true, back: '/kelola' } },
  { path: '/kelola/harga-harian', component: () => import('@/views/staff/DailyPriceView.vue'), meta: { title: 'Harga Harian', roles: STAFF, verified: true, back: '/kelola' } },
  { path: '/kelola/riwayat-harga', component: () => import('@/views/staff/PriceHistoryView.vue'), meta: { title: 'Riwayat Harga', roles: STAFF, verified: true, back: '/kelola' } },
  { path: '/kelola/pengumuman', component: () => import('@/views/staff/AnnouncementView.vue'), meta: { title: 'Kelola Pengumuman', roles: STAFF, verified: true, back: '/kelola' } },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const u = currentUser.value
  if (to.meta.guestOnly && u) return homeFor(u)
  if (to.meta.roles) {
    if (!u) return { path: '/masuk', query: { next: to.fullPath } }
    if (!to.meta.roles.includes(u.role)) return homeFor(u)
    if (to.meta.verified && u.status !== 'VERIFIED') return '/status-verifikasi'
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title} · PasarKita`
})

export default router

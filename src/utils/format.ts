import type {
  DamageCategory,
  InvoiceStatus,
  PayMethod,
  RequestStatus,
  Role,
  StallStatus,
  StallType,
  TicketStatus,
  Urgency,
  VerifyStatus,
} from '@/types'

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function dateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function rupiah(n: number) {
  return 'Rp' + Math.round(n).toLocaleString('id-ID')
}

export function tanggal(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function tanggalJam(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

// Human labels — written in plain Bahasa Indonesia for non-technical users.
export const ROLE_LABEL: Record<Role, string> = {
  PEDAGANG: 'Pedagang',
  UPT: 'UPT Pasar',
  PETUGAS: 'Petugas Lapangan',
}

export const VERIFY_LABEL: Record<VerifyStatus, string> = {
  PENDING: 'Menunggu Verifikasi',
  NEEDS_CORRECTION: 'Perlu Perbaikan',
  VERIFIED: 'Terverifikasi',
}

export const STALL_STATUS_LABEL: Record<StallStatus, string> = {
  AVAILABLE: 'Tersedia',
  BOOKED: 'Sudah Disewa',
  NOT_AVAILABLE: 'Tidak Disewakan',
}

export const STALL_TYPE_LABEL: Record<StallType, string> = {
  KIOS: 'Kios',
  LOS: 'Los',
  TOKO_5: 'Toko 5 meter',
  TOKO_GT5: 'Toko > 5 meter',
  PELATARAN: 'Pelataran',
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Sedang Diperiksa',
  APPROVED: 'Disetujui – Silakan Bayar',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
  COMPLETED: 'Selesai',
  PAYMENT_FAILED: 'Gagal Dibayar',
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: 'Belum Dibayar',
  PAID: 'Lunas',
  EXPIRED: 'Kedaluwarsa',
  FAILED: 'Gagal',
}

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  QRIS: 'QRIS (bayar sendiri)',
  NONTUNAI_PETUGAS: 'Non-tunai lewat petugas',
  TUNAI_PETUGAS: 'Tunai lewat petugas',
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  RENDAH: 'Rendah',
  SEDANG: 'Sedang',
  TINGGI: 'Tinggi',
}

export const CATEGORY_LABEL: Record<DamageCategory, string> = {
  SALURAN_AIR: 'Saluran Air',
  LISTRIK: 'Kelistrikan',
  ATAP_BANGUNAN: 'Atap & Bangunan',
  SANITASI: 'Sanitasi',
  LAINNYA: 'Lainnya',
}

export const CATEGORY_ICON: Record<DamageCategory, string> = {
  SALURAN_AIR: '💧',
  LISTRIK: '⚡',
  ATAP_BANGUNAN: '🏠',
  SANITASI: '🚻',
  LAINNYA: '🔧',
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  CLUSTER_REVIEW: 'Dicek Kemiripan',
  OPEN: 'Diterima',
  IN_PROGRESS: 'Sedang Diperbaiki',
  DONE: 'Selesai',
  MERGED: 'Digabung',
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted'

export function toneFor(status: string): Tone {
  switch (status) {
    case 'VERIFIED':
    case 'AVAILABLE':
    case 'PAID':
    case 'COMPLETED':
    case 'DONE':
    case 'RENDAH':
      return 'ok'
    case 'PENDING':
    case 'APPROVED':
    case 'UNPAID':
    case 'IN_PROGRESS':
    case 'CLUSTER_REVIEW':
    case 'SEDANG':
      return 'warn'
    case 'NEEDS_CORRECTION':
    case 'REJECTED':
    case 'EXPIRED':
    case 'FAILED':
    case 'PAYMENT_FAILED':
    case 'TINGGI':
      return 'bad'
    case 'BOOKED':
    case 'OPEN':
      return 'info'
    default:
      return 'muted'
  }
}

// Short relative time for staff activity feeds ("5 mnt lalu", "kemarin").
export function relatif(iso?: string, now = new Date()) {
  if (!iso) return '-'
  const diff = (now.getTime() - new Date(iso).getTime()) / 60000
  if (diff < 1) return 'baru saja'
  if (diff < 60) return `${Math.floor(diff)} mnt lalu`
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} jam lalu`
  const d = Math.floor(diff / 1440)
  if (d === 1) return 'kemarin'
  if (d < 7) return `${d} hari lalu`
  return tanggal(iso)
}

// Compact rupiah for KPI tiles: Rp12,5 jt / Rp850 rb.
export function rupiahRingkas(n: number) {
  if (n >= 1e9) return 'Rp' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M'
  if (n >= 1e6) return 'Rp' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt'
  if (n >= 1e3) return 'Rp' + Math.round(n / 1e3).toLocaleString('id-ID') + ' rb'
  return rupiah(n)
}

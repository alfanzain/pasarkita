// IAM module: registration, login, verification, password reset, profile update.
import { computed, ref } from 'vue'
import { db } from '@/data/db'
import { sendWhatsApp } from '@/composables/ui'
import type { Role, User } from '@/types'
import { uid } from '@/utils/format'

export const VERIFY_SLA_DAYS = 3

const SESSION_KEY = 'pasarkita-session'
function readSession() {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}
const sessionId = ref<string | null>(readSession())

export const currentUser = computed<User | null>(
  () => db.users.find((u) => u.id === sessionId.value) ?? null,
)
export const isVerified = computed(() => currentUser.value?.status === 'VERIFIED')

function setSession(id: string | null) {
  sessionId.value = id
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function passwordProblems(pw: string): string[] {
  const p: string[] = []
  if (pw.length < 8) p.push('Minimal 8 karakter')
  if (!/[^A-Za-z0-9]/.test(pw)) p.push('Ada minimal 1 karakter spesial (contoh: # ! @)')
  if (!/[0-9]/.test(pw)) p.push('Ada minimal 1 angka')
  return p
}

export function nikProblem(nik: string) {
  if (!/^\d{16}$/.test(nik)) return 'NIK harus 16 angka, sesuai KTP'
  return ''
}

export function waProblem(wa: string) {
  if (!/^(08|628)\d{8,12}$/.test(wa.replace(/[\s-]/g, ''))) return 'Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)'
  return ''
}

export interface RegisterInput {
  name: string
  nik: string
  whatsapp: string
  password: string
  role: Role
  docs: User['docs']
}

export function validateRegistration(input: RegisterInput, isUpdate = false): string[] {
  const e: string[] = []
  if (!input.name.trim()) e.push('Nama lengkap wajib diisi')
  const n = nikProblem(input.nik)
  if (n) e.push(n)
  const w = waProblem(input.whatsapp)
  if (w) e.push(w)
  if (!isUpdate) e.push(...passwordProblems(input.password).map((x) => 'Kata sandi: ' + x))
  if (!input.docs.ktp) e.push('Foto KTP wajib diunggah')
  if (input.role === 'PEDAGANG' && !input.docs.kartuPedagang)
    e.push('Kartu Identitas Pedagang / Formulir Usul wajib diunggah')
  if (input.role === 'PETUGAS' && !input.docs.kartuPetugas) e.push('Kartu Petugas Pasar wajib diunggah')
  if (input.role === 'UPT' && !input.docs.suratTugas) e.push('Surat Tugas Admin UPT Pasar wajib diunggah')
  return e
}

export function register(input: RegisterInput): { ok: true } | { ok: false; errors: string[] } {
  const errors = validateRegistration(input)
  if (db.users.some((u) => u.nik === input.nik)) errors.push('NIK ini sudah terdaftar. Silakan masuk.')
  if (errors.length) return { ok: false, errors }
  const now = new Date().toISOString()
  db.users.push({
    id: uid('u'),
    name: input.name.trim(),
    nik: input.nik,
    whatsapp: input.whatsapp.replace(/[\s-]/g, ''),
    password: input.password,
    role: input.role,
    status: 'PENDING',
    docs: input.docs,
    createdAt: now,
    lastRequestAt: now,
  })
  return { ok: true }
}

export function login(nik: string, password: string): User | string {
  const u = db.users.find((x) => x.nik === nik.trim())
  if (!u || u.password !== password) return 'NIK atau kata sandi salah. Coba lagi dengan pelan-pelan.'
  setSession(u.id)
  return u
}

export function logout() {
  setSession(null)
}

export function homeFor(u: User | null) {
  if (!u) return '/'
  if (u.status !== 'VERIFIED') return '/status-verifikasi'
  return u.role === 'PEDAGANG' ? '/pedagang' : '/kelola'
}

export function resubmitRegistration(input: Omit<RegisterInput, 'password'>) {
  const u = currentUser.value
  if (!u) return ['Sesi berakhir, silakan masuk lagi']
  const errors = validateRegistration({ ...input, password: '' }, true)
  if (errors.length) return errors
  Object.assign(u, {
    name: input.name.trim(),
    whatsapp: input.whatsapp,
    role: input.role,
    docs: input.docs,
    status: 'PENDING',
    lastRequestAt: new Date().toISOString(),
    rejectionReason: undefined,
  })
  return []
}

export function decideRegistration(userId: string, approve: boolean, reason = '') {
  const u = db.users.find((x) => x.id === userId)
  const me = currentUser.value
  if (!u || !me) return
  if (approve) {
    u.status = 'VERIFIED'
    u.verifiedBy = me.name
    u.verifiedAt = new Date().toISOString()
    u.rejectionReason = undefined
    sendWhatsApp(u.whatsapp, `[PasarKita] Halo ${u.name}, akun Anda sudah DISETUJUI. Silakan masuk ke aplikasi.`)
  } else {
    u.status = 'NEEDS_CORRECTION'
    u.rejectionReason = reason
    sendWhatsApp(u.whatsapp, `[PasarKita] Halo ${u.name}, pendaftaran perlu diperbaiki: ${reason}`)
  }
}

// --- Password reset via WhatsApp OTP ---
const otps = new Map<string, { code: string; exp: number }>()

export function requestOtp(nik: string): string {
  const u = db.users.find((x) => x.nik === nik.trim())
  if (!u) return 'NIK tidak ditemukan. Periksa kembali angka NIK Anda.'
  const code = String(Math.floor(100000 + Math.random() * 900000))
  otps.set(u.nik, { code, exp: Date.now() + 5 * 60_000 })
  sendWhatsApp(u.whatsapp, `[PasarKita] Kode OTP untuk ganti kata sandi: ${code}. Jangan berikan kode ini ke siapa pun. Berlaku 5 menit.`)
  return ''
}

export function maskedWa(nik: string) {
  const u = db.users.find((x) => x.nik === nik.trim())
  if (!u) return ''
  return u.whatsapp.slice(0, 4) + '****' + u.whatsapp.slice(-3)
}

export function verifyOtp(nik: string, code: string) {
  const o = otps.get(nik.trim())
  if (!o) return 'Kode belum diminta. Tekan "Kirim Kode" dulu.'
  if (Date.now() > o.exp) return 'Kode sudah kedaluwarsa. Minta kode baru.'
  if (o.code !== code.trim()) return 'Kode tidak cocok. Periksa pesan WhatsApp Anda.'
  return ''
}

export function resetPassword(nik: string, pw: string) {
  const u = db.users.find((x) => x.nik === nik.trim())
  if (!u) return ['Akun tidak ditemukan']
  const p = passwordProblems(pw)
  if (p.length) return p
  u.password = pw
  otps.delete(u.nik)
  return []
}

export function updateProfile(patch: { name: string; whatsapp: string; password?: string }) {
  const u = currentUser.value
  if (!u) return ['Sesi berakhir']
  const e: string[] = []
  if (!patch.name.trim()) e.push('Nama lengkap wajib diisi')
  const w = waProblem(patch.whatsapp)
  if (w) e.push(w)
  if (patch.password) e.push(...passwordProblems(patch.password).map((x) => 'Kata sandi: ' + x))
  if (e.length) return e
  u.name = patch.name.trim()
  u.whatsapp = patch.whatsapp.replace(/[\s-]/g, '')
  if (patch.password) u.password = patch.password
  return []
}

export function userName(id?: string) {
  return db.users.find((u) => u.id === id)?.name ?? '-'
}

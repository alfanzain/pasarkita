// STALL module: stall master data, rental requests, extensions, approvals.
import { computed } from 'vue'
import { db } from '@/data/db'
import { currentUser } from './auth'
import { createRentInvoice } from './pay'
import { sendWhatsApp } from '@/composables/ui'
import type { MarketArea, Stall, StallRequest } from '@/types'
import { addDays, uid } from '@/utils/format'

// Lookup indexes: the map renders ~175 stalls and asks for these many times per frame.
const stallIndex = computed(() => new Map(db.stalls.map((s) => [s.id, s])))
const leaseIndex = computed(() => new Map(db.leases.map((l) => [l.stallId, l])))

export function stallById(id?: string) {
  return id ? stallIndex.value.get(id) : undefined
}

export function leaseOfStall(stallId: string) {
  return leaseIndex.value.get(stallId)
}

export function areaById(id?: string): MarketArea | undefined {
  return db.areas.find((a) => a.id === id)
}

// Floors from top to bottom, each with its areas A→C (for the building overview).
export function areasByFloor() {
  const floors = [...new Set(db.areas.map((a) => a.floor))].sort((a, b) => b - a)
  return floors.map((f) => ({
    floor: f,
    areas: db.areas.filter((a) => a.floor === f).sort((a, b) => a.letter.localeCompare(b.letter)),
  }))
}

export function areaLocation(a: MarketArea) {
  return `Lantai ${a.floor} · Area ${a.letter} (${a.name})`
}

// Next free code in an area, e.g. "2A-25".
export function nextStallCode(areaId: string) {
  const nums = stallsInArea(areaId).map((s) => Number(s.code.split('-')[1]) || 0)
  return `${areaId}-${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`
}

export function stallsInArea(areaId: string) {
  return db.stalls.filter((s) => s.areaId === areaId)
}

export function pendingRequestFor(stallId: string) {
  return db.requests.find(
    (r) => r.stallId === stallId && r.kind === 'NEW' && (r.status === 'PENDING' || r.status === 'APPROVED'),
  )
}

export function myLeases() {
  const me = currentUser.value
  return db.leases.filter((l) => l.merchantId === me?.id)
}

export function myRequests(kind: StallRequest['kind']) {
  const me = currentUser.value
  return db.requests
    .filter((r) => r.merchantId === me?.id && r.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function hasRunningNewRequest() {
  return myRequests('NEW').some((r) => r.status === 'PENDING')
}

export function validateStall(s: Partial<Stall>, editingId?: string) {
  const e: string[] = []
  if (!s.code?.trim()) e.push('Kode lapak wajib diisi')
  else if (db.stalls.some((x) => x.code.toLowerCase() === s.code!.trim().toLowerCase() && x.id !== editingId))
    e.push('Kode lapak sudah dipakai')
  if (!s.location?.trim()) e.push('Lokasi lapak wajib diisi')
  if (!s.pricePer6Months || s.pricePer6Months <= 0) e.push('Harga sewa per 6 bulan wajib diisi')
  if (!s.type) e.push('Tipe lapak wajib dipilih')
  return e
}

export function saveStall(s: Stall) {
  const i = db.stalls.findIndex((x) => x.id === s.id)
  if (i >= 0) db.stalls[i] = { ...s }
  else db.stalls.push({ ...s, id: s.id || uid('s') })
}

export function deleteStall(id: string) {
  if (leaseOfStall(id)) return 'Lapak masih disewa, tidak bisa dihapus.'
  const i = db.stalls.findIndex((x) => x.id === id)
  if (i >= 0) db.stalls.splice(i, 1)
  return ''
}

// Submitting a request mirrors the DB transaction with row lock in S-STALL-01:
// the availability check and insert happen together so two merchants can't hold the same stall.
export function submitNewRequest(stallId: string, shopName: string, goods: string[]) {
  const me = currentUser.value
  if (!me) return 'Sesi berakhir, silakan masuk lagi'
  if (hasRunningNewRequest()) return 'Anda masih punya pengajuan yang sedang diperiksa. Tunggu sampai selesai dulu.'
  const stall = stallById(stallId)
  if (!stall || stall.status !== 'AVAILABLE') return 'Lapak ini sudah tidak tersedia.'
  if (pendingRequestFor(stallId)) return 'Maaf, lapak ini baru saja diajukan pedagang lain.'
  if (!shopName.trim()) return 'Nama lapak wajib diisi'
  if (!goods.length) return 'Pilih minimal satu barang yang dijual'
  db.requests.push({
    id: uid('r'),
    kind: 'NEW',
    stallId,
    merchantId: me.id,
    shopName: shopName.trim(),
    goods,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    price: stall.pricePer6Months,
  })
  return ''
}

export function extensionStartDate(endDate: string) {
  const end = new Date(endDate)
  const now = new Date()
  return (end > now ? end : now).toISOString()
}

export function hasRunningExtension(stallId: string) {
  return db.requests.some(
    (r) => r.kind === 'EXTEND' && r.stallId === stallId && (r.status === 'PENDING' || r.status === 'APPROVED'),
  )
}

export function submitExtension(leaseId: string, goods: string[]) {
  const me = currentUser.value
  const lease = db.leases.find((l) => l.id === leaseId)
  if (!me || !lease) return 'Data sewa tidak ditemukan'
  if (hasRunningExtension(lease.stallId)) return 'Perpanjangan untuk lapak ini sedang diproses.'
  if (!goods.length) return 'Pilih minimal satu barang yang dijual'
  const stall = stallById(lease.stallId)
  db.requests.push({
    id: uid('r'),
    kind: 'EXTEND',
    stallId: lease.stallId,
    merchantId: me.id,
    shopName: lease.shopName,
    goods,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    startDate: extensionStartDate(lease.endDate),
    price: stall?.pricePer6Months ?? 0,
  })
  return ''
}

export function cancelRequest(id: string) {
  const r = db.requests.find((x) => x.id === id)
  if (r && r.status === 'PENDING') r.status = 'CANCELLED'
}

export function decideRequest(id: string, approve: boolean, opts: { reason?: string; price?: number } = {}) {
  const r = db.requests.find((x) => x.id === id)
  const me = currentUser.value
  if (!r || !me || r.status !== 'PENDING') return
  const merchant = db.users.find((u) => u.id === r.merchantId)
  const stall = stallById(r.stallId)
  r.decidedAt = new Date().toISOString()
  r.decidedBy = me.name
  if (!approve) {
    r.status = 'REJECTED'
    r.rejectionReason = opts.reason
    if (merchant)
      sendWhatsApp(merchant.whatsapp, `[PasarKita] Pengajuan lapak ${stall?.code} ditolak. Alasan: ${opts.reason}`)
    return
  }
  r.status = 'APPROVED'
  if (opts.price && opts.price > 0) r.price = opts.price
  // Hold the stall while waiting for payment.
  if (r.kind === 'NEW' && stall) stall.status = 'BOOKED'
  const inv = createRentInvoice(r)
  r.invoiceId = inv.id
  if (merchant)
    sendWhatsApp(
      merchant.whatsapp,
      `[PasarKita] Pengajuan lapak ${stall?.code} DISETUJUI. Silakan bayar sewa dalam 3 hari agar lapak tidak dilepas.`,
    )
}

// Called once the rent invoice is paid.
export function completeRequest(requestId: string) {
  const r = db.requests.find((x) => x.id === requestId)
  if (!r) return
  r.status = 'COMPLETED'
  if (r.kind === 'NEW') {
    const start = new Date()
    db.leases.push({
      id: uid('l'),
      stallId: r.stallId,
      merchantId: r.merchantId,
      shopName: r.shopName,
      goods: [...r.goods],
      startDate: start.toISOString(),
      endDate: addDays(start, 182).toISOString(),
    })
  } else {
    const lease = db.leases.find((l) => l.stallId === r.stallId && l.merchantId === r.merchantId)
    if (lease) {
      const start = new Date(r.startDate ?? lease.endDate)
      lease.endDate = addDays(start, 182).toISOString()
      lease.goods = [...r.goods]
    }
  }
}

export function daysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

// Plain walking directions for visitors who don't read maps easily.
// Each area's entrance is at the bottom centre of its grid; stairs connect the floors.
export function directionsTo(s: Stall): string[] {
  const a = areaById(s.areaId)
  if (!a) return [`Cari papan kode ${s.code} di lapak.`]
  const steps: string[] = []
  if (a.floor > 1) steps.push(`Naik tangga ke Lantai ${a.floor}.`)
  steps.push(`Masuk Area ${a.letter} — ${a.name}.`)
  // Rows counted from the area entrance (bottom of the grid).
  const rowsFromDoor = [...new Set(stallsInArea(a.id).map((x) => x.y))].sort((p, q) => q - p)
  const rowNo = rowsFromDoor.indexOf(s.y) + 1
  const cx = s.x + s.w / 2
  const side = Math.abs(cx - a.cols / 2) < 1 ? 'tepat di depan' : cx < a.cols / 2 ? 'sebelah kiri' : 'sebelah kanan'
  steps.push(`Dari pintu area, lapak ada di baris ke-${rowNo}, ${side}.`)
  steps.push(`Cari papan kode ${s.code} di lapak.`)
  return steps
}

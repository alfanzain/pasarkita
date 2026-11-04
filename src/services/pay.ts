// PAY module: invoices, QRIS (mocked gateway), late fees, officer-recorded payments with offline queue.
import { db } from '@/data/db'
import { currentUser } from './auth'
import { completeRequest, stallById } from './stall'
import { online, sendWhatsApp } from '@/composables/ui'
import type { Invoice, Lease, PayMethod, StallRequest } from '@/types'
import { addDays, rupiah, tanggal, uid } from '@/utils/format'

export const QR_TTL_MIN = 60
export const HOLD_DAYS = 3
// Late fee: 2% of the bill for every started month of delay.
export const LATE_FEE_RATE = 0.02
export const DUE_DAY = 10

export function lateFee(inv: Invoice, at = new Date()) {
  if (inv.kind !== 'LAYANAN' || inv.status === 'PAID') return { months: 0, fee: 0 }
  const due = new Date(inv.dueDate)
  if (at <= due) return { months: 0, fee: 0 }
  const months = Math.ceil((at.getTime() - due.getTime()) / (30 * 86400000))
  return { months, fee: Math.round(inv.amount * LATE_FEE_RATE * months) }
}

export function totalDue(inv: Invoice) {
  return inv.amount + lateFee(inv).fee
}

export function myInvoices() {
  const me = currentUser.value
  return db.invoices
    .filter((i) => i.merchantId === me?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createRentInvoice(r: StallRequest): Invoice {
  const inv: Invoice = {
    id: uid('i'),
    kind: 'SEWA',
    merchantId: r.merchantId,
    stallId: r.stallId,
    requestId: r.id,
    period: r.kind === 'NEW' ? 'Sewa 6 bulan (lapak baru)' : `Perpanjangan 6 bulan mulai ${tanggal(r.startDate)}`,
    amount: r.price,
    dueDate: addDays(new Date(), HOLD_DAYS).toISOString(),
    status: 'UNPAID',
    createdAt: new Date().toISOString(),
  }
  db.invoices.push(inv)
  return inv
}

// Monthly service retribution for a lease = sum of components matching the stall type + general ones.
export function monthlyRetribution(lease: Lease) {
  const stall = stallById(lease.stallId)
  const items = db.retribution.filter((r) => !r.stallType || r.stallType === stall?.type)
  const perDay = items.reduce((s, r) => s + r.pricePerDay, 0)
  return { items, perDay, perMonth: perDay * 30 }
}

export function generateQr(invoiceId: string) {
  const inv = db.invoices.find((i) => i.id === invoiceId)
  if (!inv || inv.status !== 'UNPAID') return
  inv.qr = {
    code: `QRIS|PASARKITA|${inv.id}|${totalDue(inv)}|${Date.now()}`,
    expiresAt: new Date(Date.now() + QR_TTL_MIN * 60_000).toISOString(),
  }
}

export function qrValid(inv: Invoice) {
  return !!inv.qr && new Date(inv.qr.expiresAt).getTime() > Date.now()
}

export function markPaid(invoiceId: string, method: PayMethod, recordedBy?: string) {
  const inv = db.invoices.find((i) => i.id === invoiceId)
  if (!inv || inv.status !== 'UNPAID') return false
  inv.amount = totalDue(inv)
  inv.status = 'PAID'
  inv.paidAt = new Date().toISOString()
  inv.method = method
  inv.recordedBy = recordedBy
  inv.qr = undefined
  if (inv.requestId) completeRequest(inv.requestId)
  const m = db.users.find((u) => u.id === inv.merchantId)
  const s = stallById(inv.stallId)
  if (m)
    sendWhatsApp(
      m.whatsapp,
      `[PasarKita] Bukti bayar: ${inv.kind === 'SEWA' ? 'Sewa lapak' : 'Retribusi layanan'} ${s?.code} – ${inv.period}. Jumlah ${rupiah(inv.amount)} LUNAS pada ${tanggal(inv.paidAt)}. Terima kasih.`,
    )
  return true
}

// Mock payment gateway webhook — in production the gateway calls the server after the merchant scans.
export function simulateGatewayPaid(invoiceId: string) {
  return markPaid(invoiceId, 'QRIS')
}

// Officer records a payment collected in the field. When offline, it's queued with an idempotency key
// and synced later (S-PAY-02).
export function officerRecordPayment(invoiceId: string, method: PayMethod) {
  const me = currentUser.value
  if (!online.value) {
    if (db.offlineQueue.some((q) => q.invoiceId === invoiceId)) return 'queued'
    db.offlineQueue.push({ idempotencyKey: uid('idem'), invoiceId, method, at: new Date().toISOString() })
    return 'queued'
  }
  markPaid(invoiceId, method, me?.name)
  return 'paid'
}

export function syncOfflineQueue() {
  const me = currentUser.value
  let n = 0
  const queue = db.offlineQueue.splice(0)
  for (const q of queue) {
    // idempotent: markPaid is a no-op when already paid
    if (markPaid(q.invoiceId, q.method, me?.name)) n++
  }
  return n
}

export function invoicesForOfficer() {
  return db.invoices
    .filter((i) => i.status === 'UNPAID')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

// Scheduled jobs (cron in production). Here they run on app start and every minute.
import { db } from '@/data/db'
import { monthlyRetribution, DUE_DAY, HOLD_DAYS } from './pay'
import { finalizeCommodity, todayKey } from './info'
import { stallById } from './stall'
import { addDays, dateKey, uid } from '@/utils/format'

// Daily: create the monthly service retribution bill when its due date is within H-5. Deduplicated per lease+period.
export function generateMonthlyBills(now = new Date()) {
  const due = new Date(now.getFullYear(), now.getMonth(), DUE_DAY, 23, 59)
  const target = now > due ? new Date(now.getFullYear(), now.getMonth() + 1, DUE_DAY, 23, 59) : due
  if (target.getTime() - now.getTime() > 5 * 86400000) return
  const period = new Date(target.getFullYear(), target.getMonth() - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
  for (const l of db.leases) {
    if (new Date(l.endDate) < now) continue
    const dup = db.invoices.some((i) => i.leaseId === l.id && i.kind === 'LAYANAN' && i.period === period)
    if (dup) continue
    db.invoices.push({
      id: uid('i'),
      kind: 'LAYANAN',
      merchantId: l.merchantId,
      stallId: l.stallId,
      leaseId: l.id,
      period,
      amount: monthlyRetribution(l).perMonth,
      dueDate: target.toISOString(),
      status: 'UNPAID',
      createdAt: now.toISOString(),
    })
  }
}

// Approved rental requests that aren't paid within 3 days expire and the stall hold is released.
export function expireUnpaidRentals(now = new Date()) {
  for (const r of db.requests) {
    if (r.status !== 'APPROVED' || !r.decidedAt) continue
    if (addDays(new Date(r.decidedAt), HOLD_DAYS) > now) continue
    r.status = 'PAYMENT_FAILED'
    const inv = db.invoices.find((i) => i.id === r.invoiceId)
    if (inv && inv.status === 'UNPAID') inv.status = 'FAILED'
    const s = stallById(r.stallId)
    if (r.kind === 'NEW' && s) s.status = 'AVAILABLE'
  }
  for (const i of db.invoices) {
    if (i.status === 'UNPAID' && i.qr && new Date(i.qr.expiresAt) < now) i.qr = undefined
  }
}

// 23:59 job: price entries from past days that were never finalized are rolled into history.
export function rollDailyPrices() {
  const today = todayKey()
  const pastDays = new Set(
    db.priceEntries.map((e) => `${e.commodityId}|${dateKey(new Date(e.at))}`).filter((k) => !k.endsWith(today)),
  )
  pastDays.forEach((k) => {
    const [cid, date] = k.split('|') as [string, string]
    finalizeCommodity(cid, date)
  })
  db.priceEntries = db.priceEntries.filter((e) => dateKey(new Date(e.at)) === today)
}

export function runJobs() {
  generateMonthlyBills()
  expireUnpaidRentals()
  rollDailyPrices()
  db.meta.lastJobRun = new Date().toISOString()
}

export function startJobs() {
  runJobs()
  setInterval(runJobs, 60_000)
}

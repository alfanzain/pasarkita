// INFO module: commodities, daily prices & history, announcements, public search.
import { db } from '@/data/db'
import { currentUser } from './auth'
import { leaseOfStall } from './stall'
import { dateKey, uid } from '@/utils/format'

export function todayKey() {
  return dateKey(new Date())
}

export function commodityById(id: string) {
  return db.commodities.find((c) => c.id === id)
}

export function history(commodityId: string) {
  return db.dailyPrices
    .filter((d) => d.commodityId === commodityId && d.finalized)
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Latest finalized price and change vs the previous day.
export function latestPrice(commodityId: string) {
  const h = history(commodityId)
  const last = h[h.length - 1]
  const prev = h[h.length - 2]
  if (!last) return null
  const diff = prev ? last.avg - prev.avg : 0
  const pct = prev ? (diff / prev.avg) * 100 : 0
  return { ...last, prevAvg: prev?.avg ?? null, diff, pct, series: h.slice(-7).map((x) => x.avg) }
}

export function todayEntries(commodityId: string) {
  const k = todayKey()
  return db.priceEntries.filter((e) => e.commodityId === commodityId && dateKey(new Date(e.at)) === k)
}

export function addPriceEntry(commodityId: string, price: number, stallCode?: string) {
  const me = currentUser.value
  db.priceEntries.push({
    id: uid('pe'),
    commodityId,
    price,
    stallCode: stallCode || undefined,
    by: me?.name ?? '-',
    at: new Date().toISOString(),
  })
}

export function removePriceEntry(id: string) {
  const i = db.priceEntries.findIndex((e) => e.id === id)
  if (i >= 0) db.priceEntries.splice(i, 1)
}

export function finalizeCommodity(commodityId: string, date = todayKey()) {
  const entries = db.priceEntries.filter((e) => e.commodityId === commodityId && dateKey(new Date(e.at)) === date)
  if (!entries.length) return false
  const avg = Math.round(entries.reduce((s, e) => s + e.price, 0) / entries.length)
  const existing = db.dailyPrices.find((d) => d.commodityId === commodityId && d.date === date)
  if (existing) {
    existing.avg = avg
    existing.finalized = true
  } else db.dailyPrices.push({ commodityId, date, avg, finalized: true })
  return true
}

export function isFinalizedToday(commodityId: string) {
  return db.dailyPrices.some((d) => d.commodityId === commodityId && d.date === todayKey() && d.finalized)
}

export function visibleAnnouncements() {
  return db.announcements.filter((a) => a.visible).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export interface SearchHit {
  stallId: string
  code: string
  shopName: string
  goods: string[]
  location: string
}

export function searchStalls(q: string, commodityName: string) {
  const query = q.trim().toLowerCase()
  const hits: SearchHit[] = []
  for (const s of db.stalls) {
    const l = leaseOfStall(s.id)
    if (!l) continue
    const okQ =
      !query ||
      l.shopName.toLowerCase().includes(query) ||
      l.goods.some((g) => g.toLowerCase().includes(query)) ||
      s.code.toLowerCase().includes(query)
    const okC = !commodityName || l.goods.some((g) => g.toLowerCase() === commodityName.toLowerCase())
    if (okQ && okC) hits.push({ stallId: s.id, code: s.code, shopName: l.shopName, goods: l.goods, location: s.location })
  }
  return hits
}

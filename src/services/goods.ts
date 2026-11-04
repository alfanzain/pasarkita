// Goods zones. A market dedicates each area to one kind of goods, so a stall's category is its area's zone.
import { areaById, leaseOfStall, stallById } from './stall'
import type { ZoneKey } from '@/types'

export type GoodsCategoryKey = ZoneKey

export interface GoodsCategory {
  key: GoodsCategoryKey
  label: string
  // Short label for filter chips on small screens
  short: string
  icon: string
  // CSS custom properties defined in main.css
  fill: string
  ink: string
}

export const GOODS_CATEGORIES: GoodsCategory[] = [
  { key: 'SAYUR', label: 'Sayur & Buah', short: 'Sayur & Buah', icon: '🥬', fill: 'var(--cat-sayur)', ink: 'var(--cat-sayur-ink)' },
  { key: 'PROTEIN', label: 'Daging, Ikan & Telur', short: 'Daging & Ikan', icon: '🐟', fill: 'var(--cat-protein)', ink: 'var(--cat-protein-ink)' },
  { key: 'SEMBAKO', label: 'Sembako & Toko', short: 'Sembako', icon: '🍚', fill: 'var(--cat-sembako)', ink: 'var(--cat-sembako-ink)' },
  { key: 'KELONTONG', label: 'Kelontong & Rumah Tangga', short: 'Kelontong', icon: '🧴', fill: 'var(--cat-kelontong)', ink: 'var(--cat-kelontong-ink)' },
  { key: 'PAKAIAN', label: 'Pakaian & Tekstil', short: 'Pakaian', icon: '👕', fill: 'var(--cat-pakaian)', ink: 'var(--cat-pakaian-ink)' },
  { key: 'MAKANAN', label: 'Jajanan & Kuliner', short: 'Kuliner', icon: '🍢', fill: 'var(--cat-makanan)', ink: 'var(--cat-makanan-ink)' },
  { key: 'ELEKTRONIK', label: 'Elektronik & Jasa', short: 'Elektronik', icon: '🔌', fill: 'var(--cat-elektronik)', ink: 'var(--cat-elektronik-ink)' },
  { key: 'LAINNYA', label: 'Gudang & Lainnya', short: 'Gudang', icon: '📦', fill: 'var(--cat-lainnya)', ink: 'var(--cat-lainnya-ink)' },
]

export function categoryByKey(key: GoodsCategoryKey) {
  return GOODS_CATEGORIES.find((c) => c.key === key)!
}

export function zoneOfArea(areaId: string): GoodsCategory {
  return categoryByKey(areaById(areaId)?.zone ?? 'LAINNYA')
}

// Category of an occupied stall (its area's zone); null when the stall is empty.
export function stallCategory(stallId: string): GoodsCategory | null {
  if (!leaseOfStall(stallId)) return null
  const s = stallById(stallId)
  return s ? zoneOfArea(s.areaId) : null
}

// Mock persistence layer. Stands in for the REST API + PostgreSQL described in the DPPL:
// state lives in a reactive object and is persisted to localStorage so the demo survives reloads.
import { reactive, watch } from 'vue'
import { buildSeed } from './seed'
import type {
  Announcement,
  Commodity,
  DailyPrice,
  Invoice,
  Lease,
  MarketArea,
  OfflineQueueItem,
  PriceEntry,
  RetributionItem,
  Stall,
  StallRequest,
  Ticket,
  User,
} from '@/types'

export interface WaMessage {
  id: string
  to: string
  text: string
  at: string
}

export interface DB {
  users: User[]
  areas: MarketArea[]
  stalls: Stall[]
  leases: Lease[]
  requests: StallRequest[]
  invoices: Invoice[]
  retribution: RetributionItem[]
  tickets: Ticket[]
  commodities: Commodity[]
  dailyPrices: DailyPrice[]
  priceEntries: PriceEntry[]
  announcements: Announcement[]
  offlineQueue: OfflineQueueItem[]
  messages?: WaMessage[]
  meta: { ticketSeq: number; lastJobRun: string }
}

const KEY = 'pasarkita-db-v4'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    // corrupted or blocked storage: fall back to seed
  }
  return buildSeed() as DB
}

export const db = reactive<DB>(load())
if (!db.messages) db.messages = []

watch(
  db,
  () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch {
      // storage full or blocked; app keeps working in memory
    }
  },
  { deep: true },
)

export function resetDemo() {
  const fresh = buildSeed() as DB
  Object.assign(db, fresh, { messages: [] })
}

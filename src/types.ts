// Domain types for PasarKita (mirrors modules IAM, STALL, PAY, MAINT, INFO from the DPPL).

export type Role = 'PEDAGANG' | 'UPT' | 'PETUGAS'
export type VerifyStatus = 'PENDING' | 'NEEDS_CORRECTION' | 'VERIFIED'

export interface User {
  id: string
  name: string
  nik: string
  whatsapp: string
  password: string
  role: Role
  status: VerifyStatus
  // Uploaded documents are stored as data URLs (mock object storage).
  docs: {
    ktp?: string
    kartuPedagang?: string
    kartuPetugas?: string
    suratTugas?: string
  }
  createdAt: string
  lastRequestAt: string
  rejectionReason?: string
  verifiedBy?: string
  verifiedAt?: string
}

export type StallStatus = 'AVAILABLE' | 'BOOKED' | 'NOT_AVAILABLE'
export type StallType = 'KIOS' | 'LOS' | 'TOKO_5' | 'TOKO_GT5' | 'PELATARAN'

// Kind of goods an area is dedicated to (markets group one kind of goods per area).
export type ZoneKey =
  | 'SAYUR'
  | 'PROTEIN'
  | 'SEMBAKO'
  | 'KELONTONG'
  | 'PAKAIAN'
  | 'MAKANAN'
  | 'ELEKTRONIK'
  | 'LAINNYA'

export type LandmarkKind = 'PINTU' | 'TANGGA' | 'WC' | 'MUSHOLA' | 'KANTOR' | 'GUDANG'

interface GridRect {
  x: number
  y: number
  w: number
  h: number
}

// One area of one floor, e.g. "1A" = Lantai 1, Area A. Stall coordinates are local to their area grid.
export interface MarketArea {
  id: string
  floor: number
  letter: string
  zone: ZoneKey
  name: string
  cols: number
  rows: number
  aisles: (GridRect & { label?: string })[]
  landmarks: (GridRect & { kind: LandmarkKind })[]
}

export interface Stall {
  id: string
  code: string
  areaId: string
  location: string
  status: StallStatus
  pricePer6Months: number
  type: StallType
  // Position inside its area grid (in grid units).
  x: number
  y: number
  w: number
  h: number
}

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED' // approved, waiting for payment (hold 3 days)
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED' // paid
  | 'PAYMENT_FAILED' // not paid in 3 days

export interface StallRequest {
  id: string
  kind: 'NEW' | 'EXTEND'
  stallId: string
  merchantId: string
  shopName: string
  goods: string[]
  status: RequestStatus
  createdAt: string
  decidedAt?: string
  decidedBy?: string
  rejectionReason?: string
  // For EXTEND: the date the new period starts.
  startDate?: string
  price: number
  invoiceId?: string
}

// A stall owned/rented by a merchant.
export interface Lease {
  id: string
  stallId: string
  merchantId: string
  shopName: string
  goods: string[]
  startDate: string
  endDate: string
}

export type InvoiceKind = 'SEWA' | 'LAYANAN'
export type InvoiceStatus = 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED'
export type PayMethod = 'QRIS' | 'NONTUNAI_PETUGAS' | 'TUNAI_PETUGAS'

export interface Invoice {
  id: string
  kind: InvoiceKind
  merchantId: string
  stallId: string
  requestId?: string
  leaseId?: string
  period: string // e.g. "November 2026" or "1 Jan 2027 – 30 Jun 2027"
  amount: number
  dueDate: string
  status: InvoiceStatus
  createdAt: string
  paidAt?: string
  method?: PayMethod
  recordedBy?: string
  qr?: { code: string; expiresAt: string }
}

export interface RetributionItem {
  id: string
  name: string
  category: 'SEWA' | 'LAYANAN'
  stallType?: StallType
  pricePerDay: number
  updatedAt: string
  updatedBy: string
}

export type Urgency = 'RENDAH' | 'SEDANG' | 'TINGGI'
export type DamageCategory = 'SALURAN_AIR' | 'LISTRIK' | 'ATAP_BANGUNAN' | 'SANITASI' | 'LAINNYA'
export type TicketStatus = 'CLUSTER_REVIEW' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'MERGED'

export interface TicketProgress {
  id: string
  description: string
  photo?: string
  by: string
  at: string
}

export interface TicketComment {
  id: string
  progressId?: string
  text: string
  by: string
  at: string
}

export interface Ticket {
  id: string
  number?: string
  reporterId: string
  description: string
  location: { areaId: string; x: number; y: number; label: string }
  category: DamageCategory
  userUrgency: Urgency
  systemUrgency: Urgency
  urgencyNote?: string
  photo?: string
  status: TicketStatus
  similarTo?: string
  similarity?: number
  mergedInto?: string
  progress: TicketProgress[]
  comments: TicketComment[]
  createdAt: string
  finishedAt?: string
}

export interface Commodity {
  id: string
  name: string
  unit: string
  emoji: string
}

export interface PriceEntry {
  id: string
  commodityId: string
  stallCode?: string
  price: number
  by: string
  at: string
}

export interface DailyPrice {
  commodityId: string
  date: string // YYYY-MM-DD
  avg: number
  finalized: boolean
}

export interface Announcement {
  id: string
  title: string
  body: string
  visible: boolean
  createdAt: string
  updatedAt: string
  by: string
}

export interface OfflineQueueItem {
  idempotencyKey: string
  invoiceId: string
  method: PayMethod
  at: string
}

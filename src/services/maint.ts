// MAINT module: damage reports, system urgency scoring, similarity clustering, repair progress.
import { db } from '@/data/db'
import { currentUser } from './auth'
import type { DamageCategory, Ticket, Urgency } from '@/types'
import { uid } from '@/utils/format'

export const SIMILARITY_THRESHOLD = 0.55

const STOP = new Set(['di', 'ke', 'dan', 'yang', 'ada', 'kalau', 'sudah', 'sangat', 'itu', 'ini', 'dari', 'pada', 'jadi', 'mohon', 'tolong'])
const SYN: Record<string, string> = { got: 'saluran', gorong: 'saluran', selokan: 'saluran', mampet: 'tersumbat', sumbat: 'tersumbat', bocor: 'bocor', meluap: 'menggenang', banjir: 'menggenang' }

function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => SYN[w] ?? w),
  )
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let inter = 0
  a.forEach((x) => b.has(x) && inter++)
  return inter / (a.size + b.size - inter)
}

// Similarity = location proximity + description overlap + same category.
export function similarity(a: Pick<Ticket, 'description' | 'location' | 'category'>, b: Ticket) {
  // Different areas (or floors) are never "near" each other.
  const sameArea = a.location.areaId === b.location.areaId
  const dist = Math.hypot(a.location.x - b.location.x, a.location.y - b.location.y)
  const loc = sameArea ? Math.max(0, 1 - dist / 6) : 0
  const text = Math.min(1, jaccard(tokens(a.description), tokens(b.description)) * 2)
  const cat = a.category === b.category ? 1 : 0
  return Math.round((0.35 * loc + 0.35 * text + 0.3 * cat) * 100) / 100
}

const HIGH_WORDS = ['korsleting', 'percikan', 'api', 'terbakar', 'setrum', 'roboh', 'runtuh', 'ambruk', 'meluap', 'banjir', 'bahaya', 'luka', 'licin', 'kabel']
const MID_WORDS = ['bocor', 'mampet', 'tersumbat', 'mati', 'rusak', 'bau', 'menggenang', 'retak', 'gelap']

export function systemUrgency(description: string, category: DamageCategory): Urgency {
  const d = description.toLowerCase()
  let score = category === 'LISTRIK' ? 2 : category === 'SALURAN_AIR' || category === 'ATAP_BANGUNAN' ? 1 : 0
  if (HIGH_WORDS.some((w) => d.includes(w))) score += 3
  if (MID_WORDS.some((w) => d.includes(w))) score += 1
  return score >= 3 ? 'TINGGI' : score >= 2 ? 'SEDANG' : 'RENDAH'
}

function activeTickets() {
  return db.tickets.filter((t) => t.number && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'))
}

function nextNumber() {
  db.meta.ticketSeq += 1
  return 'TKT-' + String(db.meta.ticketSeq).padStart(4, '0')
}

export interface ReportInput {
  description: string
  location: { areaId: string; x: number; y: number; label: string } | null
  category: DamageCategory | ''
  userUrgency: Urgency | ''
  photo?: string
}

export function validateReport(i: ReportInput) {
  const e: string[] = []
  if (!i.description.trim()) e.push('Ceritakan kerusakannya di kolom deskripsi')
  if (!i.location) e.push('Tandai lokasi kerusakan di peta')
  if (!i.category) e.push('Pilih kategori kerusakan')
  if (!i.userUrgency) e.push('Pilih tingkat urgensi')
  if (!i.photo) e.push('Unggah foto kerusakan')
  return e
}

export function submitReport(i: ReportInput): string[] | Ticket {
  const e = validateReport(i)
  if (e.length) return e
  const me = currentUser.value!
  const draft = {
    description: i.description.trim(),
    location: i.location!,
    category: i.category as DamageCategory,
  }
  let best: { t: Ticket; s: number } | null = null
  for (const t of activeTickets()) {
    const s = similarity(draft, t)
    if (s >= SIMILARITY_THRESHOLD && (!best || s > best.s)) best = { t, s }
  }
  const t: Ticket = {
    id: uid('t'),
    reporterId: me.id,
    ...draft,
    userUrgency: i.userUrgency as Urgency,
    systemUrgency: systemUrgency(draft.description, draft.category),
    photo: i.photo,
    status: best ? 'CLUSTER_REVIEW' : 'OPEN',
    number: best ? undefined : nextNumber(),
    similarTo: best?.t.id,
    similarity: best?.s,
    progress: [],
    comments: [],
    createdAt: new Date().toISOString(),
  }
  db.tickets.push(t)
  return t
}

export function ticketById(id?: string) {
  return db.tickets.find((t) => t.id === id)
}

export function mergeTicket(id: string) {
  const t = ticketById(id)
  const target = ticketById(t?.similarTo)
  if (!t || !target) return
  t.status = 'MERGED'
  t.mergedInto = target.id
  t.number = target.number
  target.comments.push({
    id: uid('c'),
    text: `Laporan serupa dari pedagang lain digabungkan ke tiket ini: "${t.description}"`,
    by: 'Sistem',
    at: new Date().toISOString(),
  })
}

export function splitTicket(id: string) {
  const t = ticketById(id)
  if (!t) return
  t.status = 'OPEN'
  t.number = nextNumber()
  t.similarTo = undefined
}

export function updateUrgency(id: string, urgency: Urgency, note: string) {
  const t = ticketById(id)
  if (t) {
    t.systemUrgency = urgency
    t.urgencyNote = note
  }
}

export function addProgress(id: string, description: string, photo?: string) {
  const t = ticketById(id)
  const me = currentUser.value
  if (!t || !me) return
  t.progress.push({ id: uid('p'), description, photo, by: me.name, at: new Date().toISOString() })
  if (t.status === 'OPEN') t.status = 'IN_PROGRESS'
}

export function finishTicket(id: string) {
  const t = ticketById(id)
  if (!t || !t.progress.length) return 'Isi minimal satu riwayat perbaikan sebelum menyelesaikan laporan.'
  t.status = 'DONE'
  t.finishedAt = new Date().toISOString()
  // Merged reports follow their parent ticket.
  db.tickets.filter((x) => x.mergedInto === t.id).forEach((x) => (x.finishedAt = t.finishedAt))
  return ''
}

export function addComment(id: string, text: string, progressId?: string) {
  const t = ticketById(id)
  const me = currentUser.value
  if (!t || !me || !text.trim()) return
  t.comments.push({ id: uid('c'), progressId, text: text.trim(), by: me.name, at: new Date().toISOString() })
}

export function myTickets() {
  const me = currentUser.value
  return db.tickets
    .filter((t) => t.reporterId === me?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// The ticket whose progress the reporter should follow (merged reports point to the parent).
export function effectiveTicket(t: Ticket) {
  return t.mergedInto ? (ticketById(t.mergedInto) ?? t) : t
}

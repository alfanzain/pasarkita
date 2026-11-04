import type {
  Announcement,
  Commodity,
  DailyPrice,
  Invoice,
  Lease,
  RetributionItem,
  Stall,
  StallRequest,
  Ticket,
  User,
} from '@/types'
import { addDays, dateKey } from '@/utils/format'
import { generateAnnouncements } from './seedAnnouncements'
import { buildAreas, buildGeneratedLeases, buildMerchants, buildStalls } from './seedMarket'

export const SEED_PASSWORD = 'Pasar#123'

function iso(d: Date) {
  return d.toISOString()
}

export function buildSeed() {
  const now = new Date()
  const days = (n: number) => iso(addDays(now, n))

  const users: User[] = [
    {
      id: 'u-upt',
      name: 'Ratna Kusumawati',
      nik: '3273000000000001',
      whatsapp: '081200000001',
      password: SEED_PASSWORD,
      role: 'UPT',
      status: 'VERIFIED',
      docs: {},
      createdAt: days(-200),
      lastRequestAt: days(-200),
      verifiedBy: 'Sistem',
      verifiedAt: days(-200),
    },
    {
      id: 'u-petugas',
      name: 'Asep Sunandar',
      nik: '3273000000000002',
      whatsapp: '081200000002',
      password: SEED_PASSWORD,
      role: 'PETUGAS',
      status: 'VERIFIED',
      docs: {},
      createdAt: days(-150),
      lastRequestAt: days(-150),
      verifiedBy: 'Ratna Kusumawati',
      verifiedAt: days(-149),
    },
    {
      id: 'u-iyah',
      name: 'Siti Mariyah (Mak Iyah)',
      nik: '3273000000000003',
      whatsapp: '081200000003',
      password: SEED_PASSWORD,
      role: 'PEDAGANG',
      status: 'VERIFIED',
      docs: {},
      createdAt: days(-120),
      lastRequestAt: days(-120),
      verifiedBy: 'Ratna Kusumawati',
      verifiedAt: days(-119),
    },
    {
      id: 'u-dadang',
      name: 'Dadang Suherman',
      nik: '3273000000000004',
      whatsapp: '081200000004',
      password: SEED_PASSWORD,
      role: 'PEDAGANG',
      status: 'PENDING',
      docs: {},
      createdAt: days(-1),
      lastRequestAt: days(-1),
    },
    {
      id: 'u-yuli',
      name: 'Yuliani',
      nik: '3273000000000005',
      whatsapp: '081200000005',
      password: SEED_PASSWORD,
      role: 'PEDAGANG',
      status: 'NEEDS_CORRECTION',
      docs: {},
      createdAt: days(-4),
      lastRequestAt: days(-4),
      rejectionReason: 'Foto KTP buram, mohon unggah ulang foto KTP yang jelas.',
    },
    {
      id: 'u-budi',
      name: 'Budi Santoso',
      nik: '3273000000000006',
      whatsapp: '081200000006',
      password: SEED_PASSWORD,
      role: 'PEDAGANG',
      status: 'VERIFIED',
      docs: {},
      createdAt: days(-300),
      lastRequestAt: days(-300),
      verifiedBy: 'Ratna Kusumawati',
      verifiedAt: days(-299),
    },
    {
      id: 'u-hendra',
      name: 'Hendra Wijaya',
      nik: '3273000000000007',
      whatsapp: '081200000007',
      password: SEED_PASSWORD,
      role: 'PEDAGANG',
      status: 'VERIFIED',
      docs: {},
      createdAt: days(-90),
      lastRequestAt: days(-90),
      verifiedBy: 'Ratna Kusumawati',
      verifiedAt: days(-89),
    },
  ]

  // 3 floors × 3 areas, ~175 stalls (see seedMarket.ts).
  const areas = buildAreas()
  const stalls: Stall[] = buildStalls(areas)
  users.push(...buildMerchants(now))

  const commodities: Commodity[] = [
    { id: 'k-beras', name: 'Beras Medium', unit: 'kg', emoji: '🍚' },
    { id: 'k-cabai', name: 'Cabai Merah', unit: 'kg', emoji: '🌶️' },
    { id: 'k-bawang', name: 'Bawang Merah', unit: 'kg', emoji: '🧅' },
    { id: 'k-telur', name: 'Telur Ayam', unit: 'kg', emoji: '🥚' },
    { id: 'k-ayam', name: 'Daging Ayam', unit: 'kg', emoji: '🍗' },
    { id: 'k-minyak', name: 'Minyak Goreng', unit: 'liter', emoji: '🫗' },
    { id: 'k-gula', name: 'Gula Pasir', unit: 'kg', emoji: '🧂' },
    { id: 'k-tomat', name: 'Tomat', unit: 'kg', emoji: '🍅' },
    { id: 'k-ikan', name: 'Ikan Kembung', unit: 'kg', emoji: '🐟' },
  ]

  const base: Record<string, number> = {
    'k-beras': 13500,
    'k-cabai': 42000,
    'k-bawang': 36000,
    'k-telur': 28000,
    'k-ayam': 38000,
    'k-minyak': 17500,
    'k-gula': 17000,
    'k-tomat': 12000,
    'k-ikan': 34000,
  }
  const dailyPrices: DailyPrice[] = []
  for (let d = 14; d >= 1; d--) {
    for (const c of commodities) {
      const b = base[c.id] ?? 10000
      const wave = Math.sin((d + c.id.length) / 2.3) * 0.06 + (c.id === 'k-cabai' ? (14 - d) * 0.012 : 0)
      dailyPrices.push({
        commodityId: c.id,
        date: dateKey(addDays(now, -d)),
        avg: Math.round((b * (1 + wave)) / 100) * 100,
        finalized: true,
      })
    }
  }

  const leases: Lease[] = [
    {
      id: 'l-1',
      stallId: 's-1A-03',
      merchantId: 'u-iyah',
      shopName: 'Warung Sayur Mak Iyah',
      goods: ['Cabai Merah', 'Bawang Merah', 'Tomat', 'Daun Singkong'],
      startDate: days(-160),
      endDate: days(20),
    },
    {
      id: 'l-2',
      stallId: 's-1B-08',
      merchantId: 'u-budi',
      shopName: 'Ayam Segar Pak Budi',
      goods: ['Daging Ayam', 'Telur Ayam'],
      startDate: days(-100),
      endDate: days(80),
    },
    {
      id: 'l-3',
      stallId: 's-1C-01',
      merchantId: 'u-budi',
      shopName: 'Toko Sembako Berkah',
      goods: ['Beras Medium', 'Gula Pasir', 'Minyak Goreng'],
      startDate: days(-30),
      endDate: days(150),
    },
    {
      id: 'l-4',
      stallId: 's-2A-01',
      merchantId: 'u-hendra',
      shopName: 'Toko Kelontong Jaya',
      goods: ['Minyak Goreng', 'Gula Pasir', 'Sabun Cuci'],
      startDate: days(-60),
      endDate: days(120),
    },
    {
      id: 'l-5',
      stallId: 's-1A-07',
      merchantId: 'u-hendra',
      shopName: 'Buah Segar Hendra',
      goods: ['Pisang', 'Jeruk', 'Tomat'],
      startDate: days(-10),
      endDate: days(170),
    },
    {
      id: 'l-6',
      stallId: 's-1B-02',
      merchantId: 'u-hendra',
      shopName: 'Ikan Laut Jaya',
      goods: ['Ikan Kembung', 'Udang'],
      startDate: days(-40),
      endDate: days(140),
    },
  ]

  const taken = new Set(leases.map((l) => l.stallId))
  leases.push(...buildGeneratedLeases(stalls, areas, taken, now))
  const leased = new Set(leases.map((l) => l.stallId))
  for (const st of stalls) if (leased.has(st.id)) st.status = 'BOOKED'

  const requests: StallRequest[] = [
    {
      id: 'r-1',
      kind: 'NEW',
      stallId: 's-1A-03',
      merchantId: 'u-iyah',
      shopName: 'Warung Sayur Mak Iyah',
      goods: ['Cabai Merah', 'Bawang Merah', 'Tomat'],
      status: 'COMPLETED',
      createdAt: days(-165),
      decidedAt: days(-163),
      decidedBy: 'Asep Sunandar',
      price: 1500000,
    },
    {
      id: 'r-2',
      kind: 'NEW',
      stallId: 's-1C-09',
      merchantId: 'u-budi',
      shopName: 'Gorengan Pak Budi',
      goods: ['Gorengan'],
      status: 'PENDING',
      createdAt: days(-1),
      price: 500000,
    },
    {
      id: 'r-3',
      kind: 'NEW',
      stallId: 's-1A-12',
      merchantId: 'u-iyah',
      shopName: 'Sayur Mak Iyah 2',
      goods: ['Kangkung'],
      status: 'REJECTED',
      createdAt: days(-40),
      decidedAt: days(-38),
      decidedBy: 'Ratna Kusumawati',
      rejectionReason: 'Satu pedagang dibatasi maksimal satu los di Area 1A (Sayur & Buah).',
      price: 1000000,
    },
  ]

  const invoices: Invoice[] = [
    {
      id: 'i-1',
      kind: 'LAYANAN',
      merchantId: 'u-iyah',
      stallId: 's-1A-03',
      leaseId: 'l-1',
      period: monthLabel(addDays(now, -31)),
      amount: 90000,
      dueDate: days(-8),
      status: 'UNPAID',
      createdAt: days(-13),
    },
    {
      id: 'i-2',
      kind: 'LAYANAN',
      merchantId: 'u-iyah',
      stallId: 's-1A-03',
      leaseId: 'l-1',
      period: monthLabel(addDays(now, -62)),
      amount: 90000,
      dueDate: days(-38),
      status: 'PAID',
      createdAt: days(-43),
      paidAt: days(-40),
      method: 'TUNAI_PETUGAS',
      recordedBy: 'Asep Sunandar',
    },
    {
      id: 'i-3',
      kind: 'SEWA',
      merchantId: 'u-iyah',
      stallId: 's-1A-03',
      requestId: 'r-1',
      period: '6 bulan pertama',
      amount: 1500000,
      dueDate: days(-160),
      status: 'PAID',
      createdAt: days(-163),
      paidAt: days(-162),
      method: 'QRIS',
    },
    {
      id: 'i-4',
      kind: 'LAYANAN',
      merchantId: 'u-budi',
      stallId: 's-1B-08',
      leaseId: 'l-2',
      period: monthLabel(addDays(now, -31)),
      amount: 90000,
      dueDate: days(-3),
      status: 'UNPAID',
      createdAt: days(-8),
    },
  ]

  const retribution: RetributionItem[] = [
    { id: 'rt-1', name: 'Kios', category: 'SEWA', stallType: 'KIOS', pricePerDay: 3000, updatedAt: days(-60), updatedBy: 'Ratna Kusumawati' },
    { id: 'rt-2', name: 'Los', category: 'SEWA', stallType: 'LOS', pricePerDay: 3000, updatedAt: days(-60), updatedBy: 'Ratna Kusumawati' },
    { id: 'rt-3', name: 'Toko ukuran 5 meter', category: 'LAYANAN', stallType: 'TOKO_5', pricePerDay: 7000, updatedAt: days(-60), updatedBy: 'Ratna Kusumawati' },
    { id: 'rt-4', name: 'Toko ukuran > 5 meter', category: 'LAYANAN', stallType: 'TOKO_GT5', pricePerDay: 10000, updatedAt: days(-20), updatedBy: 'Ratna Kusumawati' },
    { id: 'rt-5', name: 'Pedagang pelataran pasar', category: 'LAYANAN', stallType: 'PELATARAN', pricePerDay: 3000, updatedAt: days(-60), updatedBy: 'Ratna Kusumawati' },
    { id: 'rt-6', name: 'Kebersihan & sampah', category: 'LAYANAN', pricePerDay: 1000, updatedAt: days(-5), updatedBy: 'Ratna Kusumawati' },
    { id: 'rt-7', name: 'Keamanan', category: 'LAYANAN', pricePerDay: 1000, updatedAt: days(-5), updatedBy: 'Ratna Kusumawati' },
  ]

  const tickets: Ticket[] = [
    {
      id: 't-1',
      number: 'TKT-0001',
      reporterId: 'u-iyah',
      description: 'Saluran air di lorong tengah Area 1A mampet, air menggenang kalau hujan.',
      location: { areaId: '1A', x: 5, y: 4.75, label: 'Lorong tengah Area 1A' },
      category: 'SALURAN_AIR',
      userUrgency: 'SEDANG',
      systemUrgency: 'TINGGI',
      status: 'IN_PROGRESS',
      progress: [
        {
          id: 'p-1',
          description: 'Petugas sudah cek lokasi, sampah plastik menyumbat gorong-gorong. Pembersihan dijadwalkan besok pagi.',
          by: 'Asep Sunandar',
          at: days(-2),
        },
      ],
      comments: [{ id: 'c-1', progressId: 'p-1', text: 'Terima kasih Pak, mohon secepatnya.', by: 'Siti Mariyah (Mak Iyah)', at: days(-2) }],
      createdAt: days(-3),
    },
    {
      id: 't-2',
      number: 'TKT-0002',
      reporterId: 'u-budi',
      description: 'Lampu di los daging mati, gelap kalau subuh.',
      location: { areaId: '1B', x: 4, y: 4.75, label: 'Lorong tengah Area 1B' },
      category: 'LISTRIK',
      userUrgency: 'TINGGI',
      systemUrgency: 'SEDANG',
      status: 'OPEN',
      progress: [],
      comments: [],
      createdAt: days(-1),
    },
    {
      id: 't-3',
      reporterId: 'u-hendra',
      description: 'Got di lorong tengah Area 1A tersumbat, bau dan air meluap ke jalan.',
      location: { areaId: '1A', x: 5.6, y: 4.6, label: 'Dekat lapak 1A-08' },
      category: 'SALURAN_AIR',
      userUrgency: 'TINGGI',
      systemUrgency: 'TINGGI',
      status: 'CLUSTER_REVIEW',
      similarTo: 't-1',
      similarity: 0.82,
      progress: [],
      comments: [],
      createdAt: days(0),
    },
    {
      id: 't-4',
      number: 'TKT-0000',
      reporterId: 'u-iyah',
      description: 'Atap bocor di atas lapak 1A-03.',
      location: { areaId: '1A', x: 5.5, y: 1.4, label: 'Lapak 1A-03' },
      category: 'ATAP_BANGUNAN',
      userUrgency: 'SEDANG',
      systemUrgency: 'SEDANG',
      status: 'DONE',
      progress: [
        { id: 'p-2', description: 'Seng atap diganti 2 lembar.', by: 'Asep Sunandar', at: days(-20) },
      ],
      comments: [],
      createdAt: days(-25),
      finishedAt: days(-20),
    },
  ]

  const announcements: Announcement[] = [
    {
      id: 'a-1',
      title: 'Kerja bakti bersih pasar',
      body: 'Hari Minggu pukul 06.00 seluruh pedagang diundang kerja bakti membersihkan saluran air. Sarapan disediakan UPT Pasar.',
      visible: true,
      createdAt: days(-2),
      updatedAt: days(-2),
      by: 'Ratna Kusumawati',
    },
    {
      id: 'a-2',
      title: 'Pembayaran retribusi bisa lewat petugas',
      body: 'Bapak/Ibu yang belum terbiasa membayar dengan QRIS dapat membayar tunai melalui Pak Asep (petugas lapangan). Bukti bayar akan dikirim lewat WhatsApp.',
      visible: true,
      createdAt: days(-6),
      updatedAt: days(-6),
      by: 'Ratna Kusumawati',
    },
    {
      id: 'a-3',
      title: 'Perbaikan atap Area 1A selesai',
      body: 'Perbaikan atap Area 1A telah selesai dikerjakan.',
      visible: false,
      createdAt: days(-20),
      updatedAt: days(-19),
      by: 'Asep Sunandar',
    },
  ]

  return {
    users,
    areas,
    stalls,
    leases,
    requests,
    invoices,
    retribution,
    tickets,
    commodities,
    dailyPrices,
    priceEntries: [],
    // 3 hand-written + 97 generated = 100 announcements
    announcements: [...announcements, ...generateAnnouncements(now, 97)],
    offlineQueue: [],
    meta: { ticketSeq: 2, lastJobRun: '' },
  }
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// Deterministic demo market: 3 floors × 3 areas, each area dedicated to one kind of goods.
// All coordinates are local to a 12 × 10 area grid.
import type { Lease, MarketArea, Stall, StallType, User, ZoneKey } from '@/types'
import { addDays } from '@/utils/format'

const COLS = 12
const ROWS = 10

// Area entrance: a door strip on the bottom edge, centred.
const DOOR = { kind: 'PINTU' as const, x: 5, y: 9.45, w: 2, h: 0.55 }

function area(
  id: string,
  zone: ZoneKey,
  name: string,
  aisles: MarketArea['aisles'],
  landmarks: MarketArea['landmarks'] = [],
): MarketArea {
  return {
    id,
    floor: Number(id[0]),
    letter: id[1]!,
    zone,
    name,
    cols: COLS,
    rows: ROWS,
    aisles,
    landmarks: [DOOR, ...landmarks],
  }
}

const KIOS_AISLES = [
  { x: 0, y: 3.85, w: COLS, h: 1.05, label: 'Lorong Tengah' },
  { x: 0, y: 8.35, w: COLS, h: 1.1, label: 'Lorong Depan' },
]
const LOS_AISLES = [
  { x: 0, y: 4.25, w: COLS, h: 1.05, label: 'Lorong Tengah' },
  { x: 0, y: 9.0, w: COLS, h: 0.45 },
]

export function buildAreas(): MarketArea[] {
  return [
    area('1A', 'SAYUR', 'Sayur & Buah', LOS_AISLES),
    area('1B', 'PROTEIN', 'Daging, Ikan & Telur', LOS_AISLES, [
      { kind: 'TANGGA', x: 9.85, y: 0.5, w: 1.85, h: 2.6 },
      { kind: 'WC', x: 9.85, y: 5.5, w: 1.85, h: 1.6 },
      { kind: 'MUSHOLA', x: 9.85, y: 7.25, w: 1.85, h: 1.6 },
    ]),
    area('1C', 'SEMBAKO', 'Sembako & Toko', [
      { x: 0, y: 5.25, w: COLS, h: 0.95, label: 'Pelataran (luar gedung)' },
    ]),
    area('2A', 'KELONTONG', 'Kelontong & Rumah Tangga', KIOS_AISLES),
    area('2B', 'PAKAIAN', 'Pakaian & Tekstil', KIOS_AISLES, [
      { kind: 'TANGGA', x: 8.1, y: 6.75, w: 3.6, h: 1.5 },
    ]),
    area('2C', 'MAKANAN', 'Jajanan & Kue', KIOS_AISLES, [{ kind: 'WC', x: 8.1, y: 6.75, w: 3.6, h: 1.5 }]),
    area('3A', 'ELEKTRONIK', 'Elektronik & Jasa', KIOS_AISLES),
    area('3B', 'LAINNYA', 'Gudang & Kantor UPT', [{ x: 0, y: 4.5, w: COLS, h: 1, label: 'Lorong Gudang' }], [
      { kind: 'KANTOR', x: 0.5, y: 0.5, w: 5.4, h: 3.6 },
      { kind: 'TANGGA', x: 9.0, y: 6.75, w: 2.7, h: 1.5 },
    ]),
    area('3C', 'MAKANAN', 'Food Court', KIOS_AISLES, [{ kind: 'MUSHOLA', x: 8.1, y: 6.75, w: 3.6, h: 1.5 }]),
  ]
}

export function areaLocation(a: MarketArea) {
  return `Lantai ${a.floor} · Area ${a.letter} (${a.name})`
}

interface Slot {
  x: number
  y: number
  w: number
  h: number
  type: StallType
  price: number
}

function row(y: number, count: number, w: number, h: number, type: StallType, price: number, x0 = 0.5, gap = 0.1) {
  return Array.from({ length: count }, (_, i): Slot => ({ x: x0 + i * (w + gap), y, w, h, type, price }))
}

// Stall slots per area. Back-to-back rows share an edge; aisles separate the pairs.
function slotsFor(a: MarketArea): Slot[] {
  const LOS = (n: number) => [
    ...row(0.5, n, 2.15, 1.85, 'LOS', 1000000),
    ...row(2.4, n, 2.15, 1.85, 'LOS', 1000000),
    ...row(5.4, n, 2.15, 1.75, 'LOS', 1000000),
    ...row(7.2, n, 2.15, 1.75, 'LOS', 1000000),
  ]
  const KIOS = (lastRowCount = 6) => [
    ...row(0.6, 6, 1.75, 1.6, 'KIOS', 1500000),
    ...row(2.25, 6, 1.75, 1.6, 'KIOS', 1500000),
    ...row(5.0, 6, 1.75, 1.6, 'KIOS', 1500000),
    ...row(6.7, lastRowCount, 1.75, 1.55, 'KIOS', 1500000),
  ]
  switch (a.id) {
    case '1A':
      return LOS(5)
    case '1B':
      return LOS(4)
    case '1C':
      return [
        ...row(0.5, 3, 3.6, 2.2, 'TOKO_GT5', 4500000),
        ...row(2.85, 4, 2.65, 2.2, 'TOKO_5', 3000000),
        ...row(6.4, 6, 1.75, 1.2, 'PELATARAN', 500000),
        ...row(7.75, 6, 1.75, 1.2, 'PELATARAN', 500000),
      ]
    case '2B':
    case '2C':
    case '3C':
      return KIOS(4)
    case '3B':
      return [
        ...row(0.5, 2, 2.6, 1.75, 'KIOS', 1200000, 6.4),
        ...row(2.35, 2, 2.6, 1.75, 'KIOS', 1200000, 6.4),
        ...row(5.7, 3, 2.6, 2.4, 'KIOS', 1200000, 0.5),
      ]
    default:
      return KIOS()
  }
}

export function buildStalls(areas: MarketArea[]): Stall[] {
  const stalls: Stall[] = []
  for (const a of areas) {
    slotsFor(a).forEach((sl, i) => {
      const code = `${a.id}-${String(i + 1).padStart(2, '0')}`
      stalls.push({
        id: `s-${code}`,
        code,
        areaId: a.id,
        location: areaLocation(a) + (sl.type === 'PELATARAN' ? ' · Pelataran' : ''),
        // A few stalls are under repair.
        status: (i * 7 + a.floor * 3) % 23 === 4 ? 'NOT_AVAILABLE' : 'AVAILABLE',
        pricePer6Months: sl.price,
        type: sl.type,
        x: Math.round(sl.x * 100) / 100,
        y: sl.y,
        w: sl.w,
        h: sl.h,
      })
    })
  }
  return stalls
}

// --- Generated merchants so the map looks like a living market ---

const OWNERS = [
  'Bu Rina', 'Pak Ujang', 'Bu Euis', 'Pak Dedi', 'Bu Nining', 'Pak Cecep', 'Bu Yati', 'Pak Agus',
  'Bu Imas', 'Pak Iwan', 'Bu Lilis', 'Pak Engkus', 'Bu Tati', 'Pak Tatang', 'Bu Neneng', 'Pak Rahmat',
  'Bu Dewi', 'Pak Hendi', 'Bu Sari', 'Pak Ojo',
]

const SHOPS: Record<ZoneKey, { prefix: string; goods: string[] }[]> = {
  SAYUR: [
    { prefix: 'Sayur Segar', goods: ['Kangkung', 'Bayam', 'Tomat', 'Cabai Merah'] },
    { prefix: 'Buah Manis', goods: ['Pisang', 'Jeruk', 'Apel', 'Mangga'] },
    { prefix: 'Bumbu Dapur', goods: ['Bawang Merah', 'Bawang Putih', 'Jahe', 'Kunyit'] },
    { prefix: 'Lalapan & Sayuran Hijau Organik', goods: ['Selada', 'Kemangi', 'Timun'] },
  ],
  PROTEIN: [
    { prefix: 'Ayam Potong', goods: ['Daging Ayam', 'Ati Ampela'] },
    { prefix: 'Ikan Segar', goods: ['Ikan Kembung', 'Ikan Mas', 'Udang'] },
    { prefix: 'Daging Sapi', goods: ['Daging Sapi', 'Tulang Iga'] },
    { prefix: 'Telur', goods: ['Telur Ayam', 'Telur Bebek', 'Tahu', 'Tempe'] },
  ],
  SEMBAKO: [
    { prefix: 'Toko Sembako', goods: ['Beras Medium', 'Gula Pasir', 'Minyak Goreng'] },
    { prefix: 'Grosir Beras', goods: ['Beras Medium', 'Beras Pandan Wangi'] },
    { prefix: 'Gorengan', goods: ['Gorengan', 'Bala-bala', 'Cireng'] },
  ],
  KELONTONG: [
    { prefix: 'Kelontong', goods: ['Sabun', 'Deterjen', 'Sampo'] },
    { prefix: 'Toko Plastik', goods: ['Ember', 'Baskom', 'Kantong Plastik'] },
    { prefix: 'Perabot Rumah Tangga Sejahtera Abadi', goods: ['Panci', 'Wajan', 'Sapu'] },
  ],
  PAKAIAN: [
    { prefix: 'Konveksi', goods: ['Kaos', 'Celana', 'Seragam Sekolah'] },
    { prefix: 'Batik', goods: ['Batik', 'Kain Sarung'] },
    { prefix: 'Busana Muslim', goods: ['Gamis', 'Kerudung', 'Koko'] },
    { prefix: 'Penjahit & Permak Jeans Kilat', goods: ['Jahit', 'Permak'] },
  ],
  MAKANAN: [
    { prefix: 'Kue Basah', goods: ['Kue Lapis', 'Serabi', 'Klepon'] },
    { prefix: 'Nasi Kuning', goods: ['Nasi Kuning', 'Nasi Uduk'] },
    { prefix: 'Bakso & Mie Ayam', goods: ['Bakso', 'Mie Ayam'] },
    { prefix: 'Es Campur', goods: ['Es Campur', 'Es Kelapa'] },
  ],
  ELEKTRONIK: [
    { prefix: 'Servis HP', goods: ['Servis HP', 'Aksesoris HP', 'Pulsa'] },
    { prefix: 'Elektronik', goods: ['Kipas Angin', 'Lampu', 'Kabel'] },
    { prefix: 'Jam & Kacamata', goods: ['Jam Tangan', 'Kacamata'] },
    { prefix: 'Fotokopi & Cetak Foto', goods: ['Fotokopi', 'Cetak Foto', 'ATK'] },
  ],
  LAINNYA: [{ prefix: 'Gudang', goods: ['Penyimpanan Barang'] }],
}

export function buildMerchants(now: Date): User[] {
  return OWNERS.map((name, i) => {
    const n = String(i + 1).padStart(2, '0')
    const at = addDays(now, -(60 + i * 5)).toISOString()
    return {
      id: `u-m${n}`,
      name,
      nik: `32730000000100${n}`,
      whatsapp: `08130000${String(1000 + i)}`,
      password: 'Pasar#123',
      role: 'PEDAGANG',
      status: 'VERIFIED',
      docs: {},
      createdAt: at,
      lastRequestAt: at,
      verifiedBy: 'Ratna Kusumawati',
      verifiedAt: at,
    }
  })
}

// Occupies roughly half of the stalls that have no hand-written lease yet.
export function buildGeneratedLeases(stalls: Stall[], areas: MarketArea[], taken: Set<string>, now: Date): Lease[] {
  const leases: Lease[] = []
  stalls.forEach((s, i) => {
    if (taken.has(s.id) || s.status === 'NOT_AVAILABLE') return
    if ((i * 37 + 11) % 100 >= 52) return
    const a = areas.find((x) => x.id === s.areaId)!
    const options = SHOPS[a.zone]
    const shop = options[i % options.length]!
    const owner = OWNERS[i % OWNERS.length]!
    leases.push({
      id: `l-g${i}`,
      stallId: s.id,
      merchantId: `u-m${String((i % OWNERS.length) + 1).padStart(2, '0')}`,
      shopName: `${shop.prefix} ${owner}`,
      goods: [...shop.goods],
      startDate: addDays(now, -(20 + (i % 150))).toISOString(),
      endDate: addDays(now, 30 + (i % 150)).toISOString(),
    })
  })
  return leases
}

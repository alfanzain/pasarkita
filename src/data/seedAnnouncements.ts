// Deterministic dummy announcements so lists, search and paging can be tried with realistic volume.
import type { Announcement } from '@/types'
import { addDays } from '@/utils/format'

const BLOK = ['Blok A', 'Blok B', 'Blok C', 'Pelataran Timur']
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const JAM = ['05.00', '06.00', '07.30', '09.00', '13.00', '15.30']
const KOMODITAS = ['cabai merah', 'bawang merah', 'telur ayam', 'beras medium', 'minyak goreng', 'daging ayam']
const PETUGAS = ['Ratna Kusumawati', 'Asep Sunandar']

type Template = (v: { blok: string; hari: string; jam: string; komoditas: string; n: number }) => {
  title: string
  body: string
}

const TEMPLATES: Template[] = [
  ({ hari, jam }) => ({
    title: `Kerja bakti hari ${hari}`,
    body: `Seluruh pedagang diundang kerja bakti membersihkan lorong dan saluran air pada hari ${hari} pukul ${jam}. Mohon membawa sapu dan karung masing-masing.`,
  }),
  ({ blok, hari, jam }) => ({
    title: `Pemadaman listrik sementara di ${blok}`,
    body: `PLN akan melakukan pemeliharaan jaringan pada hari ${hari} mulai pukul ${jam} selama kurang lebih 3 jam. Pedagang ${blok} diharap menyiapkan penerangan cadangan.`,
  }),
  ({ n }) => ({
    title: `Pengingat retribusi bulan ke-${(n % 12) + 1}`,
    body: 'Tagihan retribusi layanan pasar bulan ini sudah terbit. Bayar sebelum tanggal 10 agar tidak kena denda. Bisa lewat QRIS atau tunai ke petugas lapangan.',
  }),
  ({ blok }) => ({
    title: `Perbaikan saluran air ${blok}`,
    body: `Saluran air di sekitar ${blok} sedang diperbaiki. Mohon hati-hati saat melintas dan jangan membuang sampah ke selokan.`,
  }),
  ({ komoditas }) => ({
    title: `Harga ${komoditas} naik`,
    body: `Harga ${komoditas} di tingkat pemasok sedang naik karena pasokan berkurang. UPT Pasar memantau setiap hari, lihat menu Harga Hari Ini untuk harga terbaru.`,
  }),
  ({ hari, jam }) => ({
    title: 'Posyandu lansia di pasar',
    body: `Pemeriksaan tekanan darah dan gula darah gratis untuk pedagang dan pengunjung lansia, hari ${hari} pukul ${jam} di depan kantor UPT Pasar.`,
  }),
  ({ blok }) => ({
    title: `Penataan parkir dekat ${blok}`,
    body: `Mulai minggu ini kendaraan bongkar muat parkir di sisi ${blok}. Petugas parkir akan membantu mengarahkan.`,
  }),
  () => ({
    title: 'Pendaftaran pedagang baru dibuka',
    body: 'Beberapa lapak kosong sudah bisa diajukan lewat aplikasi PasarKita menu Ajukan Lapak. Yang kesulitan bisa dibantu di kantor UPT Pasar.',
  }),
  ({ hari }) => ({
    title: 'Perubahan jam buka pasar',
    body: `Mulai hari ${hari} pasar buka pukul 04.00 dan tutup pukul 17.00. Mohon pedagang menyesuaikan jadwal.`,
  }),
  ({ blok }) => ({
    title: `Ronda malam ${blok}`,
    body: `Jadwal ronda malam pedagang ${blok} sudah ditempel di papan pengumuman. Terima kasih telah menjaga keamanan pasar bersama.`,
  }),
  () => ({
    title: 'Lomba kebersihan lapak',
    body: 'UPT Pasar mengadakan lomba lapak terbersih. Pemenang mendapat potongan retribusi satu bulan. Penilaian dilakukan diam-diam oleh petugas.',
  }),
  ({ hari, jam }) => ({
    title: 'Sosialisasi pembayaran QRIS',
    body: `Petugas akan membantu cara membayar retribusi dengan QRIS pada hari ${hari} pukul ${jam}. Bawa HP Anda, kami bantu sampai bisa.`,
  }),
]

const LONG_TAIL =
  ' Bagi Bapak/Ibu yang berhalangan hadir, silakan menghubungi petugas lapangan agar tetap mendapat informasi lengkap. Kami juga akan menyampaikan ulang lewat grup WhatsApp pedagang dan papan pengumuman di setiap blok. Terima kasih atas perhatian dan kerja samanya demi pasar yang bersih, aman, dan nyaman.'

export function generateAnnouncements(now: Date, count: number): Announcement[] {
  const list: Announcement[] = []
  for (let i = 0; i < count; i++) {
    const tpl = TEMPLATES[i % TEMPLATES.length]!
    const { title, body } = tpl({
      blok: BLOK[i % BLOK.length]!,
      hari: HARI[(i * 3) % HARI.length]!,
      jam: JAM[(i * 5) % JAM.length]!,
      komoditas: KOMODITAS[i % KOMODITAS.length]!,
      n: i,
    })
    const created = addDays(now, -(1 + i * 2))
    created.setHours(7 + (i % 9), (i * 13) % 60, 0, 0)
    list.push({
      id: `a-g${i + 1}`,
      title,
      body: i % 6 === 0 ? body + LONG_TAIL : body,
      // Roughly 1 in 10 has been taken down.
      visible: i % 10 !== 7,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
      by: PETUGAS[i % PETUGAS.length]!,
    })
  }
  return list
}

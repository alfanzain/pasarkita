# pasarkita

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
bun install
```

### Compile and Hot-Reload for Development

```sh
bun dev
```

### Type-Check, Compile and Minify for Production

```sh
bun run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
bun lint
```

## PasarKita — prototype

Mobile-first Vue 3 front-end for UPT Pasar, Pedagang, Petugas Lapangan and Pengunjung.
There is no backend yet: `src/data/db.ts` is a mock data layer (persisted to `localStorage`) and
`src/services/*` hold the business rules per DPPL module (IAM, STALL, PAY, MAINT, INFO). WhatsApp
messages (OTP, receipts) and the QRIS gateway are simulated.

### Demo accounts

Login uses **NIK + kata sandi**, as specified in the use cases. Every demo account uses the
password `Pasar#123`.

| Role | NIK | What to try |
| --- | --- | --- |
| UPT Pasar | `3273000000000001` | Verifikasi pendaftaran, Master Lapak & Retribusi, persetujuan pengajuan |
| Petugas Lapangan | `3273000000000002` | Catat pembayaran lapangan (also offline), harga harian, laporan kerusakan |
| Pedagang — Mak Iyah | `3273000000000003` | Owns stall `1A-03`, has an overdue bill, lease ends soon |
| Pedagang, waiting verification | `3273000000000004` | Status pendaftaran page |
| Pedagang, needs correction | `3273000000000005` | Rejected registration, can fix and resubmit |

There are also 20 generated merchants (NIK `3273000000010001` – `3273000000010020`, same password)
who rent the other occupied stalls.

- **Lupa kata sandi:** enter a NIK; the OTP shows in the simulated WhatsApp popup and under
  Menu → *Pesan WhatsApp*.
- **Reset data:** Menu → *Mode demo* → *Atur ulang data demo* restores the seed.
- **Market seed:** 3 floors × 3 areas (~176 stalls), each area dedicated to one kind of goods. Stall
  codes are `{floor}{area}-{number}`, e.g. `1A-03` = Lantai 1, Area A, lapak 03.

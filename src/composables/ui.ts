// Global UI state: toasts, simulated WhatsApp inbox, accessibility preferences.
import { reactive, ref, watch } from 'vue'
import { db } from '@/data/db'
import { uid } from '@/utils/format'

export type ToastKind = 'ok' | 'bad' | 'info'
export interface Toast {
  id: string
  kind: ToastKind
  text: string
}

export const toasts = reactive<Toast[]>([])

export function toast(text: string, kind: ToastKind = 'ok', ms = 5000) {
  const t = { id: uid('t'), kind, text }
  toasts.push(t)
  setTimeout(() => {
    const i = toasts.findIndex((x) => x.id === t.id)
    if (i >= 0) toasts.splice(i, 1)
  }, ms)
}

// Simulated WhatsApp gateway (MessagingPort). Messages pop up so the demo can show OTPs and receipts.
export const waPopup = ref<{ to: string; text: string } | null>(null)

export function sendWhatsApp(to: string, text: string) {
  db.messages?.unshift({ id: uid('wa'), to, text, at: new Date().toISOString() })
  waPopup.value = { to, text }
}

// Accessibility preferences — adjustable text size and contrast help older users.
const PREF_KEY = 'pasarkita-prefs-v2'
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (raw) return JSON.parse(raw) as { fontScale: number; contrast: boolean }
  } catch {
    // ignore
  }
  return { fontScale: 1, contrast: false }
}
export const prefs = reactive(loadPrefs())
watch(
  prefs,
  () => {
    document.documentElement.style.setProperty('--scale', String(prefs.fontScale))
    document.documentElement.dataset.contrast = prefs.contrast ? 'high' : ''
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
    } catch {
      // ignore
    }
  },
  { immediate: true, deep: true },
)

// Confirmation dialog, used before irreversible actions so mis-taps don't cause harm.
export const confirmState = reactive<{
  open: boolean
  title: string
  body: string
  okText: string
  danger: boolean
  resolve?: (v: boolean) => void
}>({ open: false, title: '', body: '', okText: 'Ya, lanjutkan', danger: false })

export function confirmDialog(
  title: string,
  body = '',
  opts: { okText?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    Object.assign(confirmState, {
      open: true,
      title,
      body,
      okText: opts.okText ?? 'Ya, lanjutkan',
      danger: opts.danger ?? false,
      resolve,
    })
  })
}

// Network status, for the offline banner and the petugas offline queue.
export const online = ref(navigator.onLine)
window.addEventListener('online', () => (online.value = true))
window.addEventListener('offline', () => (online.value = false))

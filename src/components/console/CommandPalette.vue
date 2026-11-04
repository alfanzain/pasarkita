<script setup lang="ts">
// ⌘K / Ctrl+K palette: jump to any staff page, stall or merchant from anywhere.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { menuGroups } from '@/composables/nav'
import { db } from '@/data/db'
import { currentUser } from '@/services/auth'
import { leaseOfStall } from '@/services/stall'

const emit = defineEmits<{ close: [] }>()
const router = useRouter()
const q = ref('')
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

interface Hit {
  key: string
  group: string
  icon: string
  label: string
  sub?: string
  to: string
}

const isUpt = computed(() => currentUser.value?.role === 'UPT')
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const hits = computed<Hit[]>(() => {
  const term = norm(q.value.trim())
  const match = (...parts: (string | undefined)[]) => !term || parts.some((p) => p && norm(p).includes(term))

  const pages: Hit[] = menuGroups.value
    .flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })))
    .filter((i) => match(i.label, i.group))
    .map((i) => ({ key: 'p' + i.to, group: 'Halaman', icon: i.icon, label: i.label, sub: i.group, to: i.to }))

  if (!term) return pages

  const stalls: Hit[] = db.stalls
    .map((s) => ({ s, lease: leaseOfStall(s.id) }))
    .filter(({ s, lease }) => match(s.code, s.location, lease?.shopName))
    .slice(0, 6)
    .map(({ s, lease }) => ({
      key: 's' + s.id,
      group: 'Lapak',
      icon: 'store',
      label: `${s.code}${lease ? ' · ' + lease.shopName : ''}`,
      sub: s.location,
      to: isUpt.value ? `/kelola/lapak?q=${encodeURIComponent(s.code)}` : `/kelola/pembayaran?q=${encodeURIComponent(s.code)}`,
    }))

  const people: Hit[] = db.users
    .filter((u) => u.role === 'PEDAGANG' && match(u.name, u.nik))
    .slice(0, 6)
    .map((u) => {
      const pending = u.status !== 'VERIFIED'
      let to = isUpt.value ? `/kelola/lapak?q=${encodeURIComponent(u.name)}` : `/kelola/pembayaran?q=${encodeURIComponent(u.name)}`
      if (pending && isUpt.value) to = `/kelola/verifikasi-user?id=${u.id}`
      return {
        key: 'u' + u.id,
        group: 'Pedagang',
        icon: 'user',
        label: u.name,
        sub: `NIK ${u.nik}${pending ? ' · belum terverifikasi' : ''}`,
        to,
      }
    })

  return [...pages, ...stalls, ...people]
})

const grouped = computed(() => {
  const out: { group: string; items: (Hit & { idx: number })[] }[] = []
  hits.value.forEach((h, idx) => {
    let g = out.find((x) => x.group === h.group)
    if (!g) out.push((g = { group: h.group, items: [] }))
    g.items.push({ ...h, idx })
  })
  return out
})

watch(q, () => (active.value = 0))
const activeId = computed(() => {
  const h = hits.value[active.value]
  return h ? 'cp-' + h.key : undefined
})

function go(h?: Hit) {
  if (!h) return
  router.push(h.to)
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, hits.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    go(hits.value[active.value])
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  } else return
  nextTick(() => listEl.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }))
}

onMounted(() => {
  input.value?.focus()
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="cp-backdrop" @click.self="emit('close')">
      <div class="cp" role="dialog" aria-modal="true" aria-label="Cari cepat">
        <div class="cp-input">
          <AppIcon name="search" :size="18" />
          <input
            ref="input"
            v-model="q"
            type="search"
            placeholder="Cari halaman, kode lapak, nama pedagang, NIK…"
            aria-label="Kata kunci"
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
            :aria-activedescendant="activeId"
            @keydown="onKey"
          />
          <kbd class="kbd">Esc</kbd>
        </div>
        <div id="cp-list" ref="listEl" class="cp-list" role="listbox">
          <div v-for="g in grouped" :key="g.group" class="cp-group">
            <div class="cp-group-title">{{ g.group }}</div>
            <button
              v-for="h in g.items"
              :id="'cp-' + h.key"
              :key="h.key"
              type="button"
              role="option"
              class="cp-item"
              :data-active="h.idx === active"
              :aria-selected="h.idx === active"
              @mousemove="active = h.idx"
              @click="go(h)"
            >
              <span class="cp-ico"><AppIcon :name="h.icon" :size="16" /></span>
              <span class="grow cp-text">
                <span class="cp-label">{{ h.label }}</span>
                <span v-if="h.sub" class="cp-sub">{{ h.sub }}</span>
              </span>
              <AppIcon v-if="h.idx === active" name="chevron" :size="16" class="cp-enter" />
            </button>
          </div>
          <p v-if="!hits.length" class="cp-empty">Tidak ada hasil untuk “{{ q }}”.</p>
        </div>
        <footer class="cp-foot">
          <span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> pilih</span>
          <span><kbd class="kbd">↵</kbd> buka</span>
          <span><kbd class="kbd">/</kbd> buka pencarian</span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgb(17 24 39 / 40%);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10vh 12px 12px;
}
.cp {
  width: 100%;
  max-width: 600px;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgb(16 24 40 / 8%);
  overflow: hidden;
  animation: pop 0.14s ease-out;
}
@keyframes pop {
  from {
    transform: scale(0.98) translateY(-4px);
    opacity: 0;
  }
}
.cp-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
}
.cp-input input {
  flex: 1;
  height: 52px;
  border: 0;
  outline: none;
  font: inherit;
  font-size: 1rem;
  color: var(--ink);
  background: none;
}
.cp-list {
  overflow-y: auto;
  padding: 6px;
}
.cp-group-title {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 8px 10px 4px;
}
.cp-item {
  appearance: none;
  border: 0;
  background: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 8px;
  font: inherit;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
}
.cp-item[data-active='true'] {
  background: var(--brand-soft);
}
.cp-ico {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--ink-2);
  flex: none;
}
.cp-item[data-active='true'] .cp-ico {
  background: var(--surface);
  color: var(--brand);
}
.cp-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}
.cp-label {
  font-weight: 500;
  font-size: 0.93rem;
}
.cp-sub {
  font-size: 0.8rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp-enter {
  color: var(--brand);
}
.cp-empty {
  padding: 24px;
  text-align: center;
  color: var(--muted);
  margin: 0;
}
.cp-foot {
  display: flex;
  gap: 16px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 0.78rem;
  color: var(--muted);
}
.cp-foot .kbd {
  margin-right: 3px;
}
@media (max-width: 640px) {
  .cp-foot {
    display: none;
  }
}
</style>

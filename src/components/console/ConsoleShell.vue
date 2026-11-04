<script setup lang="ts">
// Layout for UPT Pasar & Petugas Lapangan: collapsible sidebar + breadcrumb topbar on desktop,
// compact topbar + bottom bar on phones. Pedagang and guests keep the elder-first shell in App.vue.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PageBreadcrumbs from './PageBreadcrumbs.vue'
import CommandPalette from './CommandPalette.vue'
import { bottomNav, menuGroups, staffCounts } from '@/composables/nav'
import { online, prefs } from '@/composables/ui'
import { currentUser, logout } from '@/services/auth'
import { resetDemo } from '@/data/db'
import { ROLE_LABEL } from '@/utils/format'

const emit = defineEmits<{ menu: [] }>()
const route = useRoute()
const router = useRouter()

const RAIL_KEY = 'pasarkita-console-rail'
function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}
const rail = ref(readRail())
watch(rail, (v) => {
  try {
    localStorage.setItem(RAIL_KEY, v ? '1' : '0')
  } catch {
    // storage blocked: preference lasts for this visit only
  }
})

const paletteOpen = ref(false)
const accountOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    accountOpen.value = false
  },
)

const back = computed(() => route.meta.back)
const title = computed(() => route.meta.title ?? 'PasarKita')
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const totalTodo = computed(() => {
  const c = staffCounts.value
  return (currentUser.value?.role === 'UPT' ? c.pendingUsers : 0) + c.pendingReq + c.clusterReview
})

function isActive(to: string) {
  if (to === '/kelola') return route.path === to
  return route.path === to || route.path.startsWith(to + '/')
}

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteOpen.value = !paletteOpen.value
  } else if (e.key === '/' && !typing && !paletteOpen.value) {
    e.preventDefault()
    paletteOpen.value = true
  } else if (e.key === 'Escape') {
    accountOpen.value = false
  }
}
function onDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.acct')) accountOpen.value = false
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onDocClick)
})

async function doLogout() {
  logout()
  await router.push('/')
}
function doReset() {
  resetDemo()
  logout()
  router.push('/')
}
</script>

<template>
  <div class="cs" :class="{ rail }">
    <aside class="cs-side" aria-label="Menu utama">
      <div class="cs-brand">
        <RouterLink to="/kelola" class="cs-logo-link">
          <span class="cs-logo" aria-hidden="true">PK</span>
          <span class="cs-brand-text">
            <span class="cs-brand-name">PasarKita</span>
            <span class="cs-brand-sub">Konsol Pengelola</span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="cs-rail-btn"
          :aria-label="rail ? 'Lebarkan menu' : 'Ciutkan menu'"
          :aria-pressed="rail"
          @click="rail = !rail"
        >
          <AppIcon name="sidebar" :size="18" />
        </button>
      </div>

      <button type="button" class="cs-search" @click="paletteOpen = true">
        <AppIcon name="search" :size="16" />
        <span class="cs-search-text grow">Cari…</span>
        <kbd class="kbd cs-search-kbd">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
      </button>

      <nav class="cs-nav">
        <div v-for="g in menuGroups" :key="g.title" class="cs-group">
          <div class="cs-group-title">{{ g.title }}</div>
          <RouterLink
            v-for="i in g.items"
            :key="i.to"
            :to="i.to"
            class="cs-link"
            :class="{ active: isActive(i.to) }"
            :aria-current="isActive(i.to) ? 'page' : undefined"
            :title="rail ? i.label : undefined"
          >
            <AppIcon :name="i.icon" :size="18" />
            <span class="cs-link-label grow">{{ i.label }}</span>
            <span v-if="i.badge" class="cs-count" :aria-label="`${i.badge} menunggu`">{{ i.badge }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="cs-foot">
        <a href="/" class="cs-link cs-public" target="_blank" rel="noopener" :title="rail ? 'Lihat situs publik' : undefined">
          <AppIcon name="external" :size="18" />
          <span class="cs-link-label grow">Lihat situs publik</span>
        </a>
        <div class="acct">
          <button
            type="button"
            class="cs-user"
            :aria-expanded="accountOpen"
            aria-haspopup="menu"
            @click="accountOpen = !accountOpen"
          >
            <span class="cs-avatar" aria-hidden="true">{{ currentUser?.name.charAt(0) }}</span>
            <span class="cs-user-text grow">
              <span class="cs-user-name truncate">{{ currentUser?.name }}</span>
              <span class="cs-user-role">{{ currentUser ? ROLE_LABEL[currentUser.role] : '' }}</span>
            </span>
            <AppIcon name="chevronDown" :size="16" class="cs-user-chev" />
          </button>
          <div v-if="accountOpen" class="cs-menu" role="menu">
            <RouterLink to="/akun" class="cs-menu-item" role="menuitem"><AppIcon name="user" :size="16" /> Akun saya</RouterLink>
            <RouterLink to="/pesan" class="cs-menu-item" role="menuitem">
              <AppIcon name="whatsapp" :size="16" /> Pesan WhatsApp (simulasi)
            </RouterLink>
            <label class="cs-menu-item">
              <AppIcon name="contrast" :size="16" />
              <span class="grow">Kontras tinggi</span>
              <input v-model="prefs.contrast" type="checkbox" class="cs-switch" />
            </label>
            <hr />
            <button type="button" class="cs-menu-item" role="menuitem" @click="doReset">
              <AppIcon name="refresh" :size="16" /> Atur ulang data demo
            </button>
            <button type="button" class="cs-menu-item danger" role="menuitem" @click="doLogout">
              <AppIcon name="logout" :size="16" /> Keluar
            </button>
          </div>
        </div>
      </div>
    </aside>

    <div class="cs-main">
      <header class="cs-top">
        <RouterLink v-if="back" :to="back" class="icon-btn cs-back" aria-label="Kembali">
          <AppIcon name="back" :size="22" />
        </RouterLink>
        <RouterLink v-else to="/kelola" class="cs-logo cs-logo-sm" aria-label="Beranda pengelola">PK</RouterLink>
        <div class="cs-title truncate">{{ title }}</div>
        <PageBreadcrumbs class="cs-crumbs grow" />
        <span v-if="!online" class="cs-offline" role="status">
          <AppIcon name="wifiOff" :size="16" />
          <span class="cs-offline-text">Offline · tersimpan di perangkat</span>
        </span>
        <button type="button" class="cs-top-search" @click="paletteOpen = true">
          <AppIcon name="search" :size="16" />
          <span>Cari lapak, pedagang, menu…</span>
          <kbd class="kbd">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
        </button>
        <button type="button" class="icon-btn cs-search-icon" aria-label="Cari" @click="paletteOpen = true">
          <AppIcon name="search" :size="22" />
        </button>
        <RouterLink to="/kelola" class="icon-btn cs-bell" :aria-label="`${totalTodo} pekerjaan menunggu`">
          <AppIcon name="bell" :size="20" />
          <span v-if="totalTodo" class="cs-dot">{{ totalTodo }}</span>
        </RouterLink>
      </header>

      <main id="main" class="container">
        <slot />
      </main>

      <nav class="cs-bottom" aria-label="Navigasi bawah">
        <RouterLink
          v-for="i in bottomNav"
          :key="i.to"
          :to="i.to"
          class="cs-bn"
          :class="{ active: isActive(i.to) }"
          :aria-current="isActive(i.to) ? 'page' : undefined"
        >
          <span class="cs-bn-icon">
            <AppIcon :name="i.icon" :size="22" />
            <span v-if="i.badge" class="cs-bn-badge">{{ i.badge }}</span>
          </span>
          <span class="cs-bn-label">{{ i.label }}</span>
        </RouterLink>
        <button type="button" class="cs-bn" @click="emit('menu')">
          <span class="cs-bn-icon"><AppIcon name="menu" :size="22" /></span>
          <span class="cs-bn-label">Menu</span>
        </button>
      </nav>
    </div>

    <CommandPalette v-if="paletteOpen" @close="paletteOpen = false" />
  </div>
</template>

<style scoped>
.cs {
  display: flex;
  min-height: 100dvh;
  background: var(--bg);
}

/* ---------- Sidebar ---------- */
.cs-side {
  display: none;
}
@media (min-width: 1024px) {
  .cs-side {
    display: flex;
    flex-direction: column;
    width: 252px;
    flex: none;
    position: sticky;
    top: 0;
    height: 100dvh;
    background: #fbfbfc;
    border-right: 1px solid var(--line);
    padding: 12px 10px;
    transition: width 0.18s ease;
  }
  .rail .cs-side {
    width: 64px;
  }
}
.cs-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 2px 12px 4px;
}
.cs-logo-link {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: var(--ink);
}
.cs-logo {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-decoration: none;
  box-shadow: inset 0 -2px 0 rgb(0 0 0 / 18%);
}
.cs-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}
.cs-brand-name {
  font-weight: 700;
}
.cs-brand-sub {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 500;
}
.cs-rail-btn {
  appearance: none;
  border: 0;
  background: none;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--muted);
  cursor: pointer;
}
.cs-rail-btn:hover {
  background: var(--surface-3);
  color: var(--ink);
}
.rail .cs-brand {
  flex-direction: column;
  padding-left: 2px;
}
.rail .cs-brand-text,
.rail .cs-search-text,
.rail .cs-search-kbd,
.rail .cs-link-label,
.rail .cs-user-text,
.rail .cs-user-chev,
.rail .cs-group-title {
  display: none;
}

.cs-search {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 8px 0 10px;
  margin: 0 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}
.cs-search:hover {
  border-color: var(--muted);
}
.rail .cs-search {
  justify-content: center;
  padding: 0;
}

.cs-nav {
  flex: 1;
  overflow-y: auto;
  margin: 0 -10px;
  padding: 0 10px;
  scrollbar-width: thin;
}
.cs-group {
  margin-top: 10px;
}
.rail .cs-group + .cs-group {
  border-top: 1px solid var(--line);
  padding-top: 8px;
}
.cs-group-title {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 6px 10px 4px;
}
.cs-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--ink-2);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.92rem;
  white-space: nowrap;
}
.cs-link:hover {
  background: var(--surface-3);
  color: var(--ink);
}
.cs-link.active {
  background: var(--surface);
  color: var(--brand);
  font-weight: 600;
  box-shadow:
    0 1px 2px rgb(16 24 40 / 8%),
    0 0 0 1px var(--line);
}
.rail .cs-link {
  justify-content: center;
  padding: 0;
}
.cs-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--ink-2);
  font-size: 0.72rem;
  font-weight: 600;
  display: grid;
  place-items: center;
  font-variant-numeric: tabular-nums;
}
.cs-link.active .cs-count {
  background: var(--brand-soft);
  color: var(--brand);
}
.rail .cs-count {
  position: absolute;
  top: 2px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 0.65rem;
  background: var(--bad);
  color: #fff;
}

.cs-foot {
  border-top: 1px solid var(--line);
  padding-top: 8px;
  margin-top: 8px;
}
.acct {
  position: relative;
  margin-top: 4px;
}
.cs-user {
  appearance: none;
  border: 0;
  background: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: 8px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--ink);
}
.cs-user:hover,
.cs-user[aria-expanded='true'] {
  background: var(--surface-3);
}
.rail .cs-user {
  justify-content: center;
}
.cs-avatar {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #e3a21a, #c9821a);
  color: #1a1d1b;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
}
.cs-user-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.cs-user-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.cs-user-role {
  font-size: 0.78rem;
  color: var(--muted);
}
.cs-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  width: 248px;
  z-index: 40;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
}
.cs-menu hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 6px 0;
}
.cs-menu-item {
  appearance: none;
  border: 0;
  background: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
  text-align: left;
}
.cs-menu-item:hover {
  background: var(--surface-2);
}
.cs-menu-item.danger {
  color: var(--bad);
}
.cs-switch {
  accent-color: var(--brand);
  width: 16px;
  height: 16px;
}

/* ---------- Main column & topbar ---------- */
.cs-main {
  flex: 1;
  min-width: 0;
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 12px);
}
.cs-top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  height: calc(var(--top-h) + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 8px 0;
  background: rgb(255 255 255 / 88%);
  backdrop-filter: saturate(180%) blur(10px);
  border-bottom: 1px solid var(--line);
}
.cs-logo-sm {
  margin: 6px 12px 6px 14px;
  position: relative;
}
/* 44px touch area around the 32px logo */
.cs-logo-sm::after {
  content: '';
  position: absolute;
  inset: -6px;
}
.cs-back {
  color: var(--ink);
}
.cs-title {
  flex: 1;
  font-weight: 650;
  font-size: 1.02rem;
}
.cs-crumbs,
.cs-top-search {
  display: none;
}
.cs-offline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
.cs-offline-text {
  display: none;
}
.cs-bell {
  position: relative;
  color: var(--ink-2);
  text-decoration: none;
}
.cs-dot {
  position: absolute;
  top: 6px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--bad);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px #fff;
}
@media (min-width: 640px) {
  .cs-offline-text {
    display: inline;
  }
}
@media (min-width: 1024px) {
  .cs-top {
    padding: 0 24px 0 32px;
    gap: 12px;
  }
  .cs-back,
  .cs-logo-sm,
  .cs-title,
  .cs-search-icon {
    display: none;
  }
  .cs-crumbs {
    display: flex;
  }
  .cs-top-search {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: 300px;
    height: 34px;
    padding: 0 8px 0 10px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--muted);
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .cs-top-search span {
    flex: 1;
    text-align: left;
  }
  .cs-top-search:hover {
    border-color: var(--muted);
  }
  .cs-main {
    padding-bottom: 0;
  }
}

/* ---------- Bottom bar (phones/tablets) ---------- */
.cs-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  background: rgb(255 255 255 / 94%);
  backdrop-filter: saturate(180%) blur(10px);
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
}
.cs-bn {
  flex: 1;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  min-height: var(--nav-h);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}
.cs-bn.active {
  color: var(--brand);
  font-weight: 600;
}
.cs-bn-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 28px;
  border-radius: 999px;
}
.cs-bn.active .cs-bn-icon {
  background: var(--brand-soft);
}
.cs-bn-label {
  font-size: 0.72rem;
}
.cs-bn-badge {
  position: absolute;
  top: -4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--bad);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px #fff;
}
@media (min-width: 1024px) {
  .cs-bottom {
    display: none;
  }
}
</style>

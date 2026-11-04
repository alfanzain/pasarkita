<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import ConsoleShell from '@/components/console/ConsoleShell.vue'
import { bottomNav, menuGroups } from '@/composables/nav'
import { confirmState, online, prefs, toasts, waPopup } from '@/composables/ui'
import { currentUser, logout } from '@/services/auth'
import { resetDemo } from '@/data/db'
import { ROLE_LABEL } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const sizeOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

const title = computed(() => route.meta.title ?? 'PasarKita')
// Only office staff get the desktop sidebar; guests and merchants keep the phone layout on every screen.
const staffLayout = computed(
  () => currentUser.value?.status === 'VERIFIED' && currentUser.value.role !== 'PEDAGANG',
)
const back = computed(() => route.meta.back)

// Staff get the dense "console" design tokens (see main.css). Set on <html> so teleported
// sheets, toasts and dialogs pick them up too.
watchEffect(() => {
  if (staffLayout.value) document.documentElement.dataset.ui = 'console'
  else delete document.documentElement.dataset.ui
})

function isActive(to: string) {
  if (to === '/' || to === '/pedagang' || to === '/kelola') return route.path === to
  return route.path.startsWith(to)
}

async function doLogout() {
  logout()
  menuOpen.value = false
  await router.push('/')
}

function closeConfirm(v: boolean) {
  confirmState.open = false
  confirmState.resolve?.(v)
}

function doReset() {
  resetDemo()
  logout()
  menuOpen.value = false
  router.push('/')
}

const sizes = [
  { v: 1, label: 'Biasa' },
  { v: 1.1, label: 'Besar' },
  { v: 1.25, label: 'Lebih Besar' },
  { v: 1.4, label: 'Sangat Besar' },
]
</script>

<template>
  <a href="#main" class="skip">Lewati ke isi halaman</a>

  <ConsoleShell v-if="staffLayout" @menu="menuOpen = true">
    <RouterView />
  </ConsoleShell>

  <div v-else class="shell">
    <div class="main-col">
      <header class="topbar">
        <div class="topbar-inner" :class="{ 'has-back': back }">
          <RouterLink v-if="back" :to="back" class="icon-btn back" aria-label="Kembali">
            <AppIcon name="back" :size="28" />
            <span class="back-text">Kembali</span>
          </RouterLink>
          <RouterLink to="/" class="brand brand-mobile">
            <span class="logo" aria-hidden="true">PK</span>
            <span class="brand-text">PasarKita</span>
          </RouterLink>
          <div class="grow top-title">{{ title }}</div>
          <!-- Tablet/desktop: the bottom bar items move up here (guests & merchants) -->
          <nav class="topnav" aria-label="Navigasi utama">
            <RouterLink
              v-for="i in bottomNav"
              :key="i.to"
              :to="i.to"
              class="tn"
              :class="{ active: isActive(i.to) }"
              :aria-current="isActive(i.to) ? 'page' : undefined"
            >
              <AppIcon :name="i.icon" :size="22" />
              {{ i.label }}
              <span v-if="i.badge" class="tn-badge">{{ i.badge }}</span>
            </RouterLink>
          </nav>
          <button type="button" class="icon-btn" aria-label="Ukuran tulisan" @click="sizeOpen = true">
            <span class="aa">A<small>A</small></span>
          </button>
          <button type="button" class="icon-btn menu-btn" aria-label="Buka menu" @click="menuOpen = true">
            <AppIcon name="menu" :size="28" />
            <span class="menu-text">Menu</span>
          </button>
        </div>
      </header>

      <div v-if="!online" class="offline" role="status">
        <AppIcon name="wifiOff" :size="22" />
        Tidak ada internet. Data tersimpan di HP dan dikirim otomatis saat sinyal kembali.
      </div>

      <main id="main" class="container">
        <RouterView />
      </main>

      <nav class="bottom" aria-label="Navigasi bawah">
        <RouterLink
          v-for="i in bottomNav"
          :key="i.to"
          :to="i.to"
          class="bn"
          :class="{ active: isActive(i.to) }"
          :aria-current="isActive(i.to) ? 'page' : undefined"
        >
          <span class="bn-icon">
            <AppIcon :name="i.icon" :size="26" />
            <span v-if="i.badge" class="bn-badge">{{ i.badge }}</span>
          </span>
          <span class="bn-label">{{ i.label }}</span>
        </RouterLink>
        <button type="button" class="bn" @click="menuOpen = true">
          <span class="bn-icon"><AppIcon name="menu" :size="26" /></span>
          <span class="bn-label">Menu</span>
        </button>
      </nav>
    </div>
  </div>

  <!-- Full menu -->
  <BottomSheet v-if="menuOpen" title="Menu" @close="menuOpen = false">
    <div v-if="currentUser" class="card card-tight row who">
      <span class="avatar" aria-hidden="true">{{ currentUser.name.charAt(0) }}</span>
      <div class="grow">
        <div class="bold">{{ currentUser.name }}</div>
        <div class="small muted">{{ ROLE_LABEL[currentUser.role] }}</div>
      </div>
    </div>
    <div v-for="g in menuGroups" :key="g.title" class="menu-group">
      <div class="side-title">{{ g.title }}</div>
      <RouterLink v-for="i in g.items" :key="i.to" :to="i.to" class="menu-link">
        <AppIcon :name="i.icon" :size="24" />
        <span class="grow">{{ i.label }}</span>
        <AppIcon name="chevron" :size="20" />
      </RouterLink>
    </div>
    <div v-if="staffLayout" class="menu-group">
      <div class="side-title">Akun</div>
      <RouterLink to="/akun" class="menu-link"><AppIcon name="user" :size="24" /><span class="grow">Akun Saya</span></RouterLink>
      <RouterLink to="/pesan" class="menu-link"><AppIcon name="whatsapp" :size="24" /><span class="grow">Pesan WhatsApp (simulasi)</span></RouterLink>
      <a href="/" target="_blank" rel="noopener" class="menu-link"><AppIcon name="external" :size="24" /><span class="grow">Lihat situs publik</span></a>
      <label class="menu-link"><AppIcon name="contrast" :size="24" /><span class="grow">Kontras tinggi</span><input v-model="prefs.contrast" type="checkbox" /></label>
    </div>
    <div class="stack" style="margin-top: 16px">
      <RouterLink v-if="!currentUser" to="/masuk" class="btn btn-block">Masuk</RouterLink>
      <button v-else type="button" class="btn btn-danger-outline btn-block" @click="doLogout">
        <AppIcon name="logout" /> Keluar
      </button>
      <details class="small muted demo">
        <summary>Mode demo</summary>
        <p>Data contoh tersimpan di peramban ini.</p>
        <button type="button" class="btn btn-ghost btn-sm" @click="doReset">Atur ulang data demo</button>
      </details>
    </div>
  </BottomSheet>

  <!-- Text size & contrast -->
  <BottomSheet v-if="sizeOpen" title="Tampilan Tulisan" @close="sizeOpen = false">
    <p class="muted">Pilih ukuran tulisan yang paling nyaman dibaca.</p>
    <div class="choice-grid">
      <label v-for="s in sizes" :key="s.v" class="choice">
        <input v-model="prefs.fontScale" type="radio" name="fs" :value="s.v" />
        <span :style="{ fontSize: s.v + 'rem' }">{{ s.label }}</span>
      </label>
    </div>
    <label class="choice" style="margin-top: 14px">
      <input v-model="prefs.contrast" type="checkbox" />
      Kontras tinggi (warna lebih tegas)
    </label>
    <template #footer>
      <button type="button" class="btn" @click="sizeOpen = false">Selesai</button>
    </template>
  </BottomSheet>

  <!-- Confirmation dialog -->
  <BottomSheet v-if="confirmState.open" :title="confirmState.title" @close="closeConfirm(false)">
    <p v-if="confirmState.body">{{ confirmState.body }}</p>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="closeConfirm(false)">Batal</button>
      <button type="button" class="btn" :class="{ 'btn-danger': confirmState.danger }" @click="closeConfirm(true)">
        {{ confirmState.okText }}
      </button>
    </template>
  </BottomSheet>

  <!-- Simulated WhatsApp notification -->
  <div v-if="waPopup" class="wa" role="status">
    <div class="wa-head">
      <AppIcon name="whatsapp" :size="22" />
      <span class="grow bold">WhatsApp ke {{ waPopup.to }}</span>
      <button type="button" class="icon-btn" aria-label="Tutup pesan" @click="waPopup = null">
        <AppIcon name="close" :size="22" />
      </button>
    </div>
    <p>{{ waPopup.text }}</p>
    <span class="small muted">Simulasi — di aplikasi nyata pesan ini dikirim ke WhatsApp.</span>
  </div>

  <div class="toasts" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="'tone-' + t.kind">
      <AppIcon :name="t.kind === 'ok' ? 'check' : t.kind === 'bad' ? 'alert' : 'info'" />
      <span class="grow">{{ t.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.skip {
  position: absolute;
  left: -999px;
}
.skip:focus {
  left: 8px;
  top: 8px;
  z-index: 100;
  background: #fff;
  padding: 8px 12px;
}
.shell {
  display: flex;
  min-height: 100dvh;
}
.main-col {
  flex: 1;
  min-width: 0;
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 12px);
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 6px 8px;
  padding-top: calc(6px + env(safe-area-inset-top));
  background: var(--brand);
  color: var(--brand-ink);
}
.topbar-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 52px;
  max-width: 1120px;
  margin: 0 auto;
}
/* On phones a back arrow replaces the logo */
.has-back .brand-mobile,
.brand-text,
.menu-text,
.topnav {
  display: none;
}
.topnav {
  gap: 4px;
  align-items: center;
}
.tn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 12px;
  color: var(--brand-ink);
  text-decoration: none;
  font-weight: 600;
}
.tn:hover {
  background: rgb(255 255 255 / 12%);
}
.tn.active {
  background: rgb(255 255 255 / 16%);
  box-shadow: inset 0 -3px 0 var(--accent);
}
.tn-badge {
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  padding: 0 6px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 0.75rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.top-title {
  font-weight: 800;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 4px;
}
.topbar .icon-btn:hover {
  background: rgb(255 255 255 / 15%);
}
.back {
  text-decoration: none;
  color: var(--brand-ink);
  gap: 2px;
  padding-right: 8px;
}
.back-text {
  font-size: 0.95rem;
}
.aa {
  font-weight: 800;
  font-size: 1.25rem;
}
.aa small {
  font-size: 0.8rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  font-weight: 800;
  font-size: 1.15rem;
}
.brand-mobile {
  padding: 0 6px;
}
.logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent);
  color: var(--accent-ink);
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 0.95rem;
}
.offline {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 16px;
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 600;
  border-bottom: 2px solid var(--warn);
}

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4px 16px rgb(0 0 0 / 6%);
}
.bn {
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
  gap: 2px;
  text-decoration: none;
  color: var(--ink-2);
  font-weight: 600;
  cursor: pointer;
  position: relative;
}
.bn.active {
  color: var(--brand);
}
.bn.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22%;
  right: 22%;
  height: 4px;
  border-radius: 0 0 4px 4px;
  background: var(--brand);
}
.bn-icon {
  position: relative;
}
.bn-label {
  font-size: 0.8rem;
  white-space: nowrap;
}
.bn-badge {
  position: absolute;
  top: -6px;
  right: -12px;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: var(--bad);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border: 2px solid var(--surface);
}

.side-title {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 6px 10px;
}
.who {
  margin-bottom: 8px;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 1.2rem;
}
.menu-group {
  margin-top: 12px;
}
.menu-link {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: var(--tap);
  padding: 0 12px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
  font-weight: 600;
  margin-bottom: 8px;
}
.demo summary {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.demo ul {
  padding-left: 18px;
}

.wa {
  position: fixed;
  z-index: 60;
  left: 12px;
  right: 12px;
  top: calc(72px + env(safe-area-inset-top));
  max-width: 480px;
  margin: 0 auto;
  background: #e7fbe9;
  border: 2px solid #25a244;
  border-radius: 16px;
  padding: 10px 12px 12px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 20%);
}
.wa-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #136b2b;
}
.wa p {
  margin: 4px 0 6px;
  font-size: 1.02rem;
}

.toasts {
  position: fixed;
  z-index: 70;
  left: 12px;
  right: 12px;
  bottom: calc(var(--nav-h) + 14px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 520px;
  margin: 0 auto;
  pointer-events: none;
}
.toast {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 14px;
  border: 2px solid currentColor;
  font-weight: 700;
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
  pointer-events: auto;
}
.toast span {
  color: var(--ink);
}
</style>

<script setup lang="ts">
// Breadcrumbs from the route's `meta.back` chain, always rooted at the staff home.
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()

const crumbs = computed(() => {
  const chain: { to: string; label: string }[] = []
  let back = route.meta.back
  let guard = 0
  while (back && guard++ < 6) {
    const r = router.resolve(back)
    chain.unshift({ to: r.fullPath, label: r.path === '/kelola' ? 'Beranda' : (r.meta.title ?? back) })
    back = r.meta.back
  }
  if (route.path !== '/kelola' && chain[0]?.to !== '/kelola') chain.unshift({ to: '/kelola', label: 'Beranda' })
  return chain
})
</script>

<template>
  <nav aria-label="Lokasi halaman" class="bc">
    <template v-for="c in crumbs" :key="c.to">
      <RouterLink :to="c.to" class="bc-link">{{ c.label }}</RouterLink>
      <AppIcon name="chevron" :size="14" class="bc-sep" />
    </template>
    <span class="bc-current" aria-current="page">{{ route.path === '/kelola' ? 'Beranda' : route.meta.title }}</span>
  </nav>
</template>

<style scoped>
.bc {
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 0.9rem;
  white-space: nowrap;
}
.bc-link {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
}
.bc-link:hover {
  color: var(--ink);
}
.bc-sep {
  color: var(--line-strong);
  flex: none;
}
.bc-current {
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

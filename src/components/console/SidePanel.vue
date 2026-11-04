<script setup lang="ts">
// Detail drawer for staff screens: slides in from the right on desktop so the list stays visible,
// and becomes a bottom sheet on phones. Same API as BottomSheet (title, @close, #footer).
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { confirmState } from '@/composables/ui'

const props = withDefaults(defineProps<{ title: string; subtitle?: string; wide?: boolean }>(), {
  subtitle: undefined,
  wide: false,
})
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
let lastFocus: HTMLElement | null = null

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function onKey(e: KeyboardEvent) {
  // A confirmation dialog stacked on top handles its own Escape.
  if (confirmState.open) return
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'Tab' && panel.value) {
    const els = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = els[0]
    const last = els[els.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
onMounted(() => {
  lastFocus = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  nextTick(() => panel.value?.focus())
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  lastFocus?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="sp-backdrop" @click.self="emit('close')">
      <section
        ref="panel"
        class="sp"
        :class="{ wide: props.wide }"
        role="dialog"
        aria-modal="true"
        :aria-label="props.title"
        tabindex="-1"
      >
        <header class="sp-head">
          <div class="grow sp-titles">
            <h2>{{ props.title }}</h2>
            <p v-if="props.subtitle" class="sp-sub">{{ props.subtitle }}</p>
          </div>
          <slot name="head" />
          <button type="button" class="icon-btn" aria-label="Tutup" @click="emit('close')">
            <AppIcon name="close" :size="20" />
          </button>
        </header>
        <div class="sp-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="sp-foot">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.sp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(17 24 39 / 35%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sp {
  width: 100%;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  box-shadow: var(--shadow-lg);
  outline: none;
  animation: sp-up 0.2s ease-out;
}
@keyframes sp-up {
  from {
    transform: translateY(32px);
    opacity: 0;
  }
}
.sp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 12px 20px;
  border-bottom: 1px solid var(--line);
}
.sp-titles {
  min-width: 0;
}
.sp-head h2 {
  margin: 0;
  font-size: 1.07rem;
}
.sp-sub {
  margin: 2px 0 0;
  font-size: 0.86rem;
  color: var(--muted);
}
.sp-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
}
.sp-foot {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--surface-2);
}
@media (max-width: 1023px) {
  .sp-foot :deep(.btn) {
    flex: 1;
  }
}
@media (min-width: 1024px) {
  .sp-backdrop {
    justify-content: flex-end;
    align-items: stretch;
    background: rgb(17 24 39 / 22%);
  }
  .sp {
    width: 520px;
    max-height: none;
    height: 100dvh;
    border-radius: 0;
    border-left: 1px solid var(--line);
    animation: sp-in 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .sp.wide {
    width: 720px;
  }
  @keyframes sp-in {
    from {
      transform: translateX(24px);
      opacity: 0;
    }
  }
}
</style>

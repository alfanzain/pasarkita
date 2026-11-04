<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

// Modal that slides up from the bottom on phones (thumb reach) and centers on wide screens.
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="props.title">
        <header class="sheet-head">
          <h2 class="grow">{{ props.title }}</h2>
          <button type="button" class="icon-btn" aria-label="Tutup" @click="emit('close')">
            <AppIcon name="close" />
          </button>
        </header>
        <div class="sheet-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="sheet-foot">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 45%);
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  background: var(--bg);
  width: 100%;
  max-width: 640px;
  max-height: 92dvh;
  border-radius: 22px 22px 0 0;
  display: flex;
  flex-direction: column;
  animation: up 0.2s ease-out;
}
@media (min-width: 720px) {
  .backdrop {
    align-items: center;
  }
  .sheet {
    border-radius: 22px;
  }
}
@keyframes up {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
}
.sheet-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 6px 18px;
}
.sheet-head h2 {
  margin: 0;
}
.sheet-body {
  padding: 8px 18px 18px;
  overflow-y: auto;
}
.sheet-foot {
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  gap: 10px;
}
.sheet-foot :deep(.btn) {
  flex: 1;
}
</style>

<script setup lang="ts">
// Building overview: floors stacked top to bottom, one tile per area, tinted by the area's goods zone.
// Zone icons appear here (and in the legend) only — never on individual stalls.
import { computed } from 'vue'
import { zoneOfArea } from '@/services/goods'
import { areasByFloor, leaseOfStall, stallsInArea } from '@/services/stall'

const props = defineProps<{
  // Optional per-area counts (e.g. search matches or damage markers). Areas at 0 are dimmed.
  badges?: Record<string, number>
  badgeLabel?: string
}>()
const model = defineModel<string>({ required: true })

const floors = computed(() =>
  areasByFloor().map((f) => ({
    ...f,
    areas: f.areas.map((a) => {
      const stalls = stallsInArea(a.id)
      return {
        a,
        zone: zoneOfArea(a.id),
        // Narrow phone tiles: the area's own name if short, otherwise the zone's short label.
        short: a.name.length <= 11 ? a.name : zoneOfArea(a.id).short,
        open: stalls.filter((s) => leaseOfStall(s.id)).length,
        total: stalls.length,
      }
    }),
  })),
)
</script>

<template>
  <nav class="building" aria-label="Pilih lantai dan area">
    <div v-for="f in floors" :key="f.floor" class="floor">
      <span class="floor-label">Lantai {{ f.floor }}</span>
      <div class="tiles">
        <button
          v-for="t in f.areas"
          :key="t.a.id"
          type="button"
          class="tile"
          :class="{
            on: model === t.a.id,
            zero: props.badges && !props.badges[t.a.id],
          }"
          :style="{ '--z': t.zone.fill, '--zi': t.zone.ink }"
          :aria-pressed="model === t.a.id"
          :aria-label="`Lantai ${t.a.floor} Area ${t.a.letter}, ${t.a.name}, ${t.open} toko buka`"
          @click="model = t.a.id"
        >
          <span class="tile-top">
            <span class="tile-id">{{ t.a.id }}</span>
            <span class="tile-icon" aria-hidden="true">{{ t.zone.icon }}</span>
            <span v-if="props.badges && props.badges[t.a.id]" class="tile-badge">
              {{ props.badges[t.a.id] }}<span class="sr-only"> {{ props.badgeLabel ?? 'hasil' }}</span>
            </span>
          </span>
          <span class="tile-name tile-long">{{ t.a.name }}</span>
          <span class="tile-name tile-short" aria-hidden="true">{{ t.short }}</span>
          <span class="tile-sub">{{ t.open }}/{{ t.total }} toko</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.building {
  display: grid;
  gap: 6px;
}
.floor {
  display: grid;
  grid-template-columns: 4.2em 1fr;
  gap: 8px;
  align-items: stretch;
}
.floor-label {
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  background: var(--surface-2);
  border-radius: 10px;
  text-align: center;
  line-height: 1.15;
  padding: 4px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.tile {
  appearance: none;
  min-height: 64px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 2px solid transparent;
  border-left: 5px solid var(--zi);
  background: var(--z);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  transition: transform 0.1s;
}
.tile:hover {
  border-color: var(--zi);
  border-left-color: var(--zi);
}
.tile.on {
  border-color: var(--accent-strong);
  border-left-color: var(--zi);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.tile.zero {
  opacity: 0.45;
}
.tile-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tile-id {
  font-weight: 800;
  color: var(--zi);
  font-size: 1rem;
}
.tile-icon {
  font-size: 0.95rem;
}
.tile-badge {
  margin-left: auto;
  min-width: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-strong);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
}
.tile-name {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.tile-sub {
  font-size: 0.72rem;
  color: var(--ink-2);
}
.tile-short {
  display: none;
}
@media (max-width: 480px) {
  .tile-sub,
  .tile-long {
    display: none;
  }
  .tile-short {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile {
    padding: 6px 8px;
  }
}
</style>

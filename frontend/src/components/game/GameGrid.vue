<script setup lang="ts">
import { computed } from 'vue';
import GameRow from './GameRow.vue';
import type { GridRow } from './rowState';
import { TOTAL_TURNS } from '@shared/types';

const props = defineProps<{ rows: GridRow[] }>();

/** Always render TOTAL_TURNS rows, padding the unused slots as empty (spec §7.3). */
const paddedRows = computed<GridRow[]>(() => {
  const out = props.rows.slice(0, TOTAL_TURNS);
  while (out.length < TOTAL_TURNS) out.push({ state: 'empty' });
  return out;
});
</script>

<template>
  <div class="grid-container">
    <GameRow v-for="(row, i) in paddedRows" :key="i" :row="row" />
  </div>
</template>

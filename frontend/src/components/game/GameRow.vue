<script setup lang="ts">
import { computed } from 'vue';
import { type GridRow, FILLED_STATES } from './rowState';

const props = defineProps<{ row: GridRow }>();

// 'awaiting' uses the base .grid-row (solid border, no modifier); others map to state-*.
const stateClass = computed(() => (props.row.state === 'awaiting' ? '' : `state-${props.row.state}`));
const isFilled = computed(() => FILLED_STATES.has(props.row.state));
</script>

<template>
  <div class="grid-row" :class="stateClass">
    <div class="left-block">
      <span v-if="isFilled" class="badge">{{ row.label }}</span>
      <template v-else-if="row.state === 'awaiting'">
        <div class="badge-empty"></div>
        <span class="awaiting-text">Awaiting clue entry…</span>
      </template>
      <div v-else class="badge-empty"></div>
    </div>
    <div class="result-value">{{ isFilled ? row.result : '' }}</div>
  </div>
</template>

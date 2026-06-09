<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Command } from '@shared/types';
import { TOTAL_TURNS } from '@shared/types';
import AppHeader from '@/components/layout/AppHeader.vue';
import GameGrid from '@/components/game/GameGrid.vue';
import CommandSelector from '@/components/input/CommandSelector.vue';
import ValueInput from '@/components/input/ValueInput.vue';
import SubmitButton from '@/components/input/SubmitButton.vue';
import { type GridRow, FILLED_STATES } from '@/components/game/rowState';

// Static sample history mirroring the blueprint (Task 4.1).
// Replaced by the Pinia gameStore + live backend in Task 4.2.
const rows = ref<GridRow[]>([
  { state: 'val', label: 'VAL 0', result: '-4' },
  { state: 'inc', label: 'IS_INC 1', result: 'Increasing' },
  { state: 'awaiting' },
]);

const command = ref<Command>('val');
const inputValue = ref('');

const turnsUsed = computed(() => rows.value.filter((r) => FILLED_STATES.has(r.state)).length);
const turnsRemaining = computed(() => TOTAL_TURNS - turnsUsed.value);

function onSubmit(): void {
  // Wired to the store + backend in Task 4.2.
}
</script>

<template>
  <main class="game-container">
    <AppHeader />

    <GameGrid :rows="rows" />

    <div class="controls-container">
      <div class="input-row">
        <CommandSelector v-model="command" />
        <ValueInput :command="command" v-model="inputValue" />
      </div>
      <SubmitButton :disabled="turnsRemaining === 0" @submit="onSubmit" />
      <div class="status-bar">Remaining Guess Bullets: {{ turnsRemaining }} / {{ TOTAL_TURNS }}</div>
    </div>
  </main>
</template>

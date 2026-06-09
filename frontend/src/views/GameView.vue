<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import type { Command } from '@shared/types';
import { TOTAL_TURNS } from '@shared/types';
import { useGameStore } from '@/stores/gameStore';
import AppHeader from '@/components/layout/AppHeader.vue';
import GameGrid from '@/components/game/GameGrid.vue';
import CommandSelector from '@/components/input/CommandSelector.vue';
import ValueInput from '@/components/input/ValueInput.vue';
import SubmitButton from '@/components/input/SubmitButton.vue';
import type { GridRow } from '@/components/game/rowState';

const store = useGameStore();
const { history, turnsRemaining, gameStatus, secret, inputError } = storeToRefs(store);

const command = ref<Command>('val');
const inputValue = ref('');

const isOver = computed(() => gameStatus.value === 'won' || gameStatus.value === 'lost');

// Display rows = submitted moves, plus an "awaiting" slot while the game is live.
const displayRows = computed<GridRow[]>(() => {
  const rows = [...history.value];
  if (gameStatus.value === 'active' && rows.length < TOTAL_TURNS) {
    rows.push({ state: 'awaiting' });
  }
  return rows;
});

async function onSubmit(): Promise<void> {
  await store.submitClue(command.value, inputValue.value);
  if (!store.inputError) inputValue.value = '';
}

async function newGame(): Promise<void> {
  command.value = 'val';
  inputValue.value = '';
  await store.startFreePlay();
}

onMounted(() => {
  void store.startFreePlay();
});
</script>

<template>
  <main class="game-container">
    <AppHeader />

    <GameGrid :rows="displayRows" />

    <div class="controls-container">
      <template v-if="!isOver">
        <div class="input-row">
          <CommandSelector v-model="command" />
          <ValueInput :command="command" v-model="inputValue" />
        </div>
        <SubmitButton :disabled="gameStatus !== 'active'" @submit="onSubmit" />
        <div v-if="inputError" class="status-bar" style="color: var(--color-directional)">
          {{ inputError }}
        </div>
        <div class="status-bar">Remaining Guess Bullets: {{ turnsRemaining }} / {{ TOTAL_TURNS }}</div>
      </template>

      <template v-else>
        <div class="status-bar" style="font-size: 1rem; color: var(--color-text)">
          {{ gameStatus === 'won' ? '🎯 Solved it!' : 'Out of turns.' }}
          <span class="result-value">f(x) = {{ secret }}</span>
        </div>
        <button class="btn-submit" @click="newGame">New Game</button>
      </template>
    </div>
  </main>
</template>

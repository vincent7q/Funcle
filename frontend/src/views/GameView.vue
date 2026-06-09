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
import WinScreen from '@/components/game/WinScreen.vue';
import type { GridRow } from '@/components/game/rowState';

const store = useGameStore();
const { history, turnsRemaining, gameStatus, secret, inputError, mode, puzzleNumber } =
  storeToRefs(store);

const command = ref<Command>('val');
const inputValue = ref('');

const isOver = computed(() => gameStatus.value === 'won' || gameStatus.value === 'lost');
const endStatus = computed<'won' | 'lost'>(() => (gameStatus.value === 'won' ? 'won' : 'lost'));
const turnsUsed = computed(() => TOTAL_TURNS - turnsRemaining.value);

const displayRows = computed<GridRow[]>(() => {
  const rows = [...history.value];
  if (gameStatus.value === 'active' && rows.length < TOTAL_TURNS) {
    rows.push({ state: 'awaiting' });
  }
  return rows;
});

function resetInput(): void {
  command.value = 'val';
  inputValue.value = '';
}

async function onSubmit(): Promise<void> {
  await store.submitClue(command.value, inputValue.value);
  if (!store.inputError) inputValue.value = '';
}

async function selectDaily(): Promise<void> {
  resetInput();
  await store.startDaily();
}

async function selectFreePlay(): Promise<void> {
  resetInput();
  await store.startFreePlay();
}

onMounted(() => {
  void store.startDaily();
});
</script>

<template>
  <main class="game-container">
    <AppHeader />

    <div class="mode-tabs">
      <button class="mode-tab" :class="{ active: mode === 'daily' }" @click="selectDaily">
        Daily<span v-if="mode === 'daily' && puzzleNumber"> #{{ puzzleNumber }}</span>
      </button>
      <button class="mode-tab" :class="{ active: mode === 'freeplay' }" @click="selectFreePlay">
        Free Play
      </button>
    </div>

    <GameGrid :rows="displayRows" />

    <div v-if="!isOver" class="controls-container">
      <div class="input-row">
        <CommandSelector v-model="command" />
        <ValueInput :command="command" v-model="inputValue" />
      </div>
      <SubmitButton :disabled="gameStatus !== 'active'" @submit="onSubmit" />
      <div v-if="inputError" class="status-bar" style="color: var(--color-directional)">
        {{ inputError }}
      </div>
      <div class="status-bar">Remaining Guess Bullets: {{ turnsRemaining }} / {{ TOTAL_TURNS }}</div>
    </div>

    <WinScreen
      v-if="isOver"
      :status="endStatus"
      :secret="secret"
      :turns-used="turnsUsed"
      :mode="mode"
      :puzzle-number="puzzleNumber"
      @play-again="selectFreePlay"
    />
  </main>
</template>

<style scoped>
.mode-tabs {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 10px;
}
.mode-tab {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  min-height: 32px;
  padding: 0 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.mode-tab.active {
  color: var(--color-text);
  border-color: var(--color-text-muted);
  background: var(--color-card);
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GameMode } from '@shared/types';
import { TOTAL_TURNS } from '@shared/types';
import type { GridRow } from './rowState';
import { buildShareText } from '@/lib/share';

const props = withDefaults(
  defineProps<{
    status: 'won' | 'lost';
    secret: string | null;
    turnsUsed: number;
    mode: GameMode;
    puzzleNumber: number | null;
    rows?: GridRow[];
  }>(),
  { rows: () => [] },
);

defineEmits<{ playAgain: [] }>();

const heading = computed(() => (props.status === 'won' ? '🎯 Solved it!' : 'Out of turns'));
const actionLabel = computed(() => (props.mode === 'freeplay' ? 'New Game' : 'Play Free Play'));
const title = computed(() =>
  props.mode === 'daily' && props.puzzleNumber ? `Daily #${props.puzzleNumber}` : 'Free Play',
);

const copied = ref(false);
async function share(): Promise<void> {
  const text = buildShareText({
    mode: props.mode,
    puzzleNumber: props.puzzleNumber,
    status: props.status,
    turnsUsed: props.turnsUsed,
    rows: props.rows,
  });
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Clipboard unavailable (e.g. insecure context) — silently ignore.
  }
}
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true">
    <div class="overlay-card">
      <p class="overlay-eyebrow">{{ title }}</p>
      <h2 class="overlay-heading">{{ heading }}</h2>
      <p class="overlay-turns">{{ turnsUsed }} / {{ TOTAL_TURNS }} turns</p>
      <p v-if="secret" class="overlay-secret">
        f(x) = <span class="result-value">{{ secret }}</span>
      </p>

      <!-- Slot for the end-game graph (Task 5.2). -->
      <slot />

      <button class="btn-share" @click="share">{{ copied ? 'Copied!' : 'Share' }}</button>
      <button class="btn-submit" @click="$emit('playAgain')">{{ actionLabel }}</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 16px;
  z-index: 50;
}
.overlay-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.overlay-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.overlay-heading {
  margin: 0;
  font-size: 1.6rem;
}
.overlay-turns {
  margin: 0;
  color: var(--color-text-muted);
}
.overlay-secret {
  margin: 0;
  font-size: 1.1rem;
}
.btn-share {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  height: 44px;
  border-radius: 4px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.9rem;
}
.btn-share:hover {
  border-color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { StatsResponse } from '@shared/types';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

defineEmits<{ close: [] }>();

const auth = useAuthStore();
const stats = ref<StatsResponse | null>(null);
const loading = ref(true);

const winPct = computed(() => {
  if (!stats.value || stats.value.gamesPlayed === 0) return 0;
  return Math.round((stats.value.gamesWon / stats.value.gamesPlayed) * 100);
});
const maxBucket = computed(() =>
  stats.value ? Math.max(1, ...Object.values(stats.value.winDistribution)) : 1,
);
const bucket = (n: number) => stats.value?.winDistribution[String(n)] ?? 0;

onMounted(async () => {
  try {
    stats.value = await api.stats(auth.currentUserId);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-head">
        <h2>Statistics</h2>
        <button class="modal-close" aria-label="Close" @click="$emit('close')">✕</button>
      </div>

      <p v-if="loading">Loading…</p>
      <template v-else-if="stats">
        <div class="stat-grid">
          <div><div class="stat-num">{{ stats.gamesPlayed }}</div><div class="stat-lbl">Played</div></div>
          <div><div class="stat-num">{{ winPct }}</div><div class="stat-lbl">Win %</div></div>
          <div><div class="stat-num">{{ stats.currentStreak }}</div><div class="stat-lbl">Streak</div></div>
          <div><div class="stat-num">{{ stats.maxStreak }}</div><div class="stat-lbl">Max</div></div>
        </div>

        <h3 class="dist-title">Guess distribution</h3>
        <div v-for="n in 6" :key="n" class="dist-row">
          <span class="dist-n">{{ n }}</span>
          <div class="dist-bar" :style="{ width: `${Math.max(10, (bucket(n) / maxBucket) * 100)}%` }">
            {{ bucket(n) }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
  margin-bottom: 16px;
}
.stat-num {
  font-size: 1.6rem;
  font-weight: 700;
}
.stat-lbl {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.dist-title {
  font-size: 0.95rem;
  margin: 8px 0;
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}
.dist-n {
  width: 12px;
  font-family: 'Courier New', monospace;
}
.dist-bar {
  background: var(--color-success);
  color: #fff;
  text-align: right;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.85rem;
  min-width: 24px;
}
</style>

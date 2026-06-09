<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip, Legend } from 'chart.js';
import type { Coefficients } from '@shared/types';
import { buildCurve, type Point } from '@/lib/curve';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend);

const props = defineProps<{ coeffs: Coefficients; discovered: Point[] }>();

const curve = computed(() => buildCurve(props.coeffs, props.discovered));

const chartData = computed(() => ({
  datasets: [
    {
      type: 'line' as const,
      label: 'f(x)',
      data: curve.value.line,
      borderColor: '#538d4e',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
    },
    {
      type: 'line' as const,
      label: 'Your val points',
      data: curve.value.points,
      showLine: false,
      borderColor: '#b59f3b',
      backgroundColor: '#b59f3b',
      pointRadius: 5,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { type: 'linear' as const, grid: { color: '#3a3a3c' }, ticks: { color: '#818384' } },
    y: { grid: { color: '#3a3a3c' }, ticks: { color: '#818384' } },
  },
  plugins: { legend: { labels: { color: '#ffffff' } } },
};
</script>

<template>
  <div class="chart-wrap">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  height: 220px;
  width: 100%;
}
</style>

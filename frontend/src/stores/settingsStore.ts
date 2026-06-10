import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const KEY = 'funcle_show_graph';

/** Client preferences persisted to localStorage (spec §7.4, §7.7). */
export const useSettingsStore = defineStore('settings', () => {
  const stored = localStorage.getItem(KEY);
  // Default ON; only an explicit 'false' disables the end-game graph.
  const showGraph = ref<boolean>(stored === null ? true : stored === 'true');

  watch(showGraph, (value) => localStorage.setItem(KEY, String(value)), { flush: 'sync' });

  function setShowGraph(value: boolean): void {
    showGraph.value = value;
  }
  function toggleGraph(): void {
    showGraph.value = !showGraph.value;
  }

  return { showGraph, setShowGraph, toggleGraph };
});

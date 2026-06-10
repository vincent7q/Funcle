import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('settingsStore', () => {
  it('defaults showGraph to true', () => {
    expect(useSettingsStore().showGraph).toBe(true);
  });

  it('persists a disabled graph preference to localStorage', () => {
    const store = useSettingsStore();
    store.setShowGraph(false);
    expect(localStorage.getItem('funcle_show_graph')).toBe('false');
  });

  it('reads a persisted preference on a fresh store', () => {
    localStorage.setItem('funcle_show_graph', 'false');
    setActivePinia(createPinia());
    expect(useSettingsStore().showGraph).toBe(false);
  });

  it('toggles the preference', () => {
    const store = useSettingsStore();
    store.toggleGraph();
    expect(store.showGraph).toBe(false);
    store.toggleGraph();
    expect(store.showGraph).toBe(true);
  });
});

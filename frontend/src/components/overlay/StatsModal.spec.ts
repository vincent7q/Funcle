import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StatsModal from './StatsModal.vue';

vi.mock('@/api/client', () => ({
  api: {
    stats: vi.fn().mockResolvedValue({
      gamesPlayed: 10,
      gamesWon: 7,
      currentStreak: 3,
      maxStreak: 5,
      winDistribution: { '1': 1, '3': 6 },
    }),
  },
}));

beforeEach(() => {
  localStorage.clear();
});

describe('StatsModal', () => {
  it('fetches and displays the player stats', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(StatsModal, { global: { plugins: [pinia] } });
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('10'); // games played
    expect(text).toContain('70'); // win % (7/10)
    expect(text).toContain('Guess distribution');
  });
});

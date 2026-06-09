import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import GameView from './GameView.vue';

vi.mock('@/api/client', () => ({
  api: {
    newSession: vi.fn().mockResolvedValue({ sessionId: 's1', turnsRemaining: 6 }),
    getDaily: vi
      .fn()
      .mockResolvedValue({ sessionId: 'd1', turnsRemaining: 6, puzzleNumber: 1, history: [] }),
    val: vi.fn(),
    isInc: vi.fn(),
    target: vi.fn(),
  },
}));

async function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(GameView, { global: { plugins: [pinia] } });
  await flushPromises(); // let onMounted -> startFreePlay resolve
  return wrapper;
}

beforeEach(() => vi.clearAllMocks());

describe('GameView (wired to the store)', () => {
  it('renders the FUNCLE header and subtitle', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('h1').text()).toBe('FUNCLE');
    expect(wrapper.find('.app-subtitle').text()).toContain('Function Detective');
  });

  it('starts a session and shows six rows with all turns remaining', async () => {
    const wrapper = await mountView();
    expect(wrapper.findAll('.grid-row')).toHaveLength(6);
    expect(wrapper.find('.status-bar').text()).toContain('6 / 6');
  });

  it('renders the command selector and submit button while active', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('#action-select').exists()).toBe(true);
    expect(wrapper.find('.btn-submit').text()).toBe('Submit Clue');
  });

  it('defaults to Daily mode with the Daily tab active', async () => {
    const wrapper = await mountView();
    const tabs = wrapper.findAll('.mode-tab');
    expect(tabs).toHaveLength(2);
    const daily = tabs.find((t) => t.text().startsWith('Daily'));
    expect(daily?.classes()).toContain('active');
  });
});

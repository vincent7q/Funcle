import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import GameView from './GameView.vue';

vi.mock('@/api/client', () => ({
  api: {
    newSession: vi.fn().mockResolvedValue({ sessionId: 's1', turnsRemaining: 6 }),
    getDaily: vi.fn(),
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
});

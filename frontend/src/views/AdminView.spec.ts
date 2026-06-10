import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AdminView from './AdminView.vue';

vi.mock('@/api/client', () => ({
  api: {
    adminLogin: vi.fn().mockResolvedValue({ token: 't1' }),
    adminListPuzzles: vi.fn().mockResolvedValue([]),
    adminCreatePuzzle: vi.fn(),
    adminUpdatePuzzle: vi.fn(),
    adminDeletePuzzle: vi.fn(),
  },
}));

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(AdminView, { global: { plugins: [pinia] } });
}

beforeEach(() => vi.clearAllMocks());

describe('AdminView', () => {
  it('shows the password login form when not authenticated', () => {
    const wrapper = mountView();
    expect(wrapper.find('#admin-password').exists()).toBe(true);
    expect(wrapper.find('.admin-table').exists()).toBe(false);
  });

  it('reveals the scheduling form + table after a successful login', async () => {
    const wrapper = mountView();
    await wrapper.find('#admin-password').setValue('pw');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('#p-date').exists()).toBe(true);
    expect(wrapper.find('#p-expr').exists()).toBe(true);
    expect(wrapper.find('.admin-table').exists()).toBe(true);
  });
});

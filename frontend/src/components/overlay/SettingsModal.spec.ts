import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsModal from './SettingsModal.vue';

vi.mock('@/api/client', () => ({ api: { login: vi.fn(), register: vi.fn() } }));

function mountModal() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(SettingsModal, { global: { plugins: [pinia] } });
}

beforeEach(() => {
  localStorage.clear();
});

describe('SettingsModal', () => {
  it('toggles the show-graph setting on click', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('.toggle').classes()).toContain('on'); // default ON
    await wrapper.find('.toggle').trigger('click');
    expect(wrapper.find('.toggle').classes()).not.toContain('on');
    expect(localStorage.getItem('funcle_show_graph')).toBe('false');
  });

  it('shows the account login/register form when logged out', () => {
    const wrapper = mountModal();
    expect(wrapper.find('.acct-tabs').exists()).toBe(true);
  });

  it('emits close from the close button', async () => {
    const wrapper = mountModal();
    await wrapper.find('.modal-close').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});

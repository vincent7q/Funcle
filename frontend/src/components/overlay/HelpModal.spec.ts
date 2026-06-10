import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HelpModal from './HelpModal.vue';

describe('HelpModal', () => {
  it('renders how-to-play content', () => {
    const wrapper = mount(HelpModal);
    expect(wrapper.text()).toContain('How to play');
    expect(wrapper.text()).toContain('6 turns');
  });

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(HelpModal);
    await wrapper.find('.modal-close').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});

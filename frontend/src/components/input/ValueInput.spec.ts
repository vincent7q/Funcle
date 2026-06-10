import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ValueInput from './ValueInput.vue';

describe('ValueInput', () => {
  it('renders a number field (step=any) for val and is_inc (§7.5, §13 Q4)', () => {
    for (const command of ['val', 'is_inc'] as const) {
      const wrapper = mount(ValueInput, {
        props: { command, modelValue: '' },
      });
      const input = wrapper.get('input');
      expect(input.attributes('type')).toBe('number');
      expect(input.attributes('step')).toBe('any');
      expect(wrapper.text()).toContain('Input x');
    }
  });

  it('renders a text field for target', () => {
    const wrapper = mount(ValueInput, {
      props: { command: 'target', modelValue: '' },
    });
    const input = wrapper.get('input');
    expect(input.attributes('type')).toBe('text');
    expect(wrapper.text()).toContain('Expression');
  });

  it('emits a numeric model value from the number field', async () => {
    const wrapper = mount(ValueInput, {
      props: { command: 'val', modelValue: '' },
    });
    await wrapper.get('input').setValue('2.5');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted?.at(-1)).toEqual([2.5]);
  });

  it('emits a string model value from the expression field', async () => {
    const wrapper = mount(ValueInput, {
      props: { command: 'target', modelValue: '' },
    });
    await wrapper.get('input').setValue('x^2 - 4');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted?.at(-1)).toEqual(['x^2 - 4']);
  });
});

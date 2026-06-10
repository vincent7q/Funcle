import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GameRow from './GameRow.vue';

describe('GameRow', () => {
  it('renders a val row with green state, badge, and result', () => {
    const wrapper = mount(GameRow, { props: { row: { state: 'val', label: 'VAL 0', result: '-4' } } });
    expect(wrapper.classes()).toContain('grid-row');
    expect(wrapper.classes()).toContain('state-val');
    expect(wrapper.find('.badge').text()).toBe('VAL 0');
    expect(wrapper.find('.result-value').text()).toBe('-4');
  });

  it('renders an is_inc row with yellow state', () => {
    const wrapper = mount(GameRow, {
      props: { row: { state: 'inc', label: 'IS_INC 1', result: 'Increasing' } },
    });
    expect(wrapper.classes()).toContain('state-inc');
    expect(wrapper.find('.result-value').text()).toBe('Increasing');
  });

  it('renders a target-win row', () => {
    const wrapper = mount(GameRow, {
      props: { row: { state: 'target-win', label: 'TARGET', result: '🎯' } },
    });
    expect(wrapper.classes()).toContain('state-target-win');
  });

  it('renders an awaiting row with placeholder text and no state modifier', () => {
    const wrapper = mount(GameRow, { props: { row: { state: 'awaiting' } } });
    expect(wrapper.classes()).toContain('grid-row');
    expect(wrapper.classes()).not.toContain('state-awaiting');
    expect(wrapper.find('.awaiting-text').exists()).toBe(true);
    expect(wrapper.find('.badge').exists()).toBe(false);
  });

  it('renders an empty row with the empty state and a dot, no badge or result', () => {
    const wrapper = mount(GameRow, { props: { row: { state: 'empty' } } });
    expect(wrapper.classes()).toContain('state-empty');
    expect(wrapper.find('.badge-empty').exists()).toBe(true);
    expect(wrapper.find('.badge').exists()).toBe(false);
    expect(wrapper.find('.result-value').text()).toBe('');
  });
});

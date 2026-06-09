import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GameView from './GameView.vue';

describe('GameView (static screen)', () => {
  it('renders the FUNCLE header and subtitle', () => {
    const wrapper = mount(GameView);
    expect(wrapper.find('h1').text()).toBe('FUNCLE');
    expect(wrapper.find('.app-subtitle').text()).toContain('Function Detective');
  });

  it('always renders six grid rows (sample moves + padded empties)', () => {
    const wrapper = mount(GameView);
    expect(wrapper.findAll('.grid-row')).toHaveLength(6);
    expect(wrapper.find('.state-val').exists()).toBe(true);
    expect(wrapper.find('.state-inc').exists()).toBe(true);
    expect(wrapper.findAll('.state-empty').length).toBeGreaterThan(0);
  });

  it('shows the remaining-turns status reflecting the filled rows', () => {
    const wrapper = mount(GameView);
    // 2 filled sample rows -> 4 remaining of 6.
    expect(wrapper.find('.status-bar').text()).toContain('4 / 6');
  });

  it('renders the command selector and submit button', () => {
    const wrapper = mount(GameView);
    expect(wrapper.find('#action-select').exists()).toBe(true);
    expect(wrapper.find('.btn-submit').text()).toBe('Submit Clue');
  });
});

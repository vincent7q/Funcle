import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WinScreen from './WinScreen.vue';

const base = {
  secret: 'x^2 - 4',
  turnsUsed: 3,
  mode: 'daily' as const,
  puzzleNumber: 42,
};

describe('WinScreen', () => {
  it('shows a win with the revealed secret and turns used', () => {
    const wrapper = mount(WinScreen, { props: { ...base, status: 'won' } });
    expect(wrapper.text()).toContain('Solved');
    expect(wrapper.text()).toContain('x^2 - 4');
    expect(wrapper.text()).toContain('3 / 6');
  });

  it('shows a loss state and still reveals the secret', () => {
    const wrapper = mount(WinScreen, { props: { ...base, status: 'lost', turnsUsed: 6 } });
    expect(wrapper.text().toLowerCase()).toContain('out of turns');
    expect(wrapper.text()).toContain('x^2 - 4');
  });

  it('omits the f(x) line when the secret is unavailable', () => {
    const wrapper = mount(WinScreen, { props: { ...base, status: 'won', secret: null } });
    expect(wrapper.text()).not.toContain('f(x) =');
  });

  it('emits playAgain when the action button is clicked', async () => {
    const wrapper = mount(WinScreen, { props: { ...base, status: 'won' } });
    await wrapper.find('.btn-submit').trigger('click');
    expect(wrapper.emitted('playAgain')).toHaveLength(1);
  });

  it('copies the share text to the clipboard on Share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = mount(WinScreen, {
      props: {
        ...base,
        status: 'won',
        rows: [
          { state: 'val', label: 'VAL 0', result: '-4' },
          { state: 'target-win', label: 'TARGET', result: '🎯' },
        ],
      },
    });
    await wrapper.find('.btn-share').trigger('click');
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]?.[0]).toContain('Funcle - Daily #42');
    vi.unstubAllGlobals();
  });
});

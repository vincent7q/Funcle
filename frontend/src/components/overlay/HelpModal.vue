<script setup lang="ts">
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-head">
        <h2>How to play</h2>
        <button class="modal-close" aria-label="Close" @click="$emit('close')">✕</button>
      </div>

      <p>Identify the secret polynomial <strong>f(x)</strong> in <strong>6 turns</strong>.</p>
      <ul class="help-list">
        <li><span class="chip val">val x</span> evaluates f(x) at a number — returns the value.</li>
        <li>
          <span class="chip inc">is_inc x</span> checks the slope at x —
          <em>Increasing / Decreasing / Stationary</em>.
        </li>
        <li><span class="chip target">target …</span> submits your guess, e.g. <code>x^2 - 4</code>.</li>
      </ul>
      <p>
        Every command uses a turn. Your <code>target</code> wins if it's equivalent to f(x) —
        reordered (<code>-4 + x^2</code>) and factored (<code>(x-2)(x+2)</code>) forms all count.
      </p>
      <p class="help-muted">
        Play the <strong>Daily</strong> puzzle (same for everyone each day) or <strong>Free
        Play</strong> for endless random puzzles.
      </p>
    </div>
  </div>
</template>

<style scoped>
.help-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chip {
  display: inline-block;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 4px;
  color: #fff;
}
.chip.val {
  background: var(--color-success);
}
.chip.inc {
  background: var(--color-directional);
}
.chip.target {
  background: var(--color-border);
}
.help-muted {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
code {
  font-family: 'Courier New', monospace;
}
</style>

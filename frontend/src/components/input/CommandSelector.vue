<script setup lang="ts">
import type { Command } from '@shared/types';

const model = defineModel<Command>({ required: true });
</script>

<template>
  <div class="control-group">
    <label class="control-label" for="action-select">Select Action</label>
    <select id="action-select" class="control-field" v-model="model">
      <option value="val">val (Evaluate Point)</option>
      <option value="is_inc">is_inc (Check Direction)</option>
      <option value="target">target (Submit Final Guess)</option>
    </select>
  </div>
</template>

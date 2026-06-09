<script setup lang="ts">
import { computed } from 'vue';
import type { Command } from '@shared/types';

const props = defineProps<{ command: Command }>();
const model = defineModel<string>({ required: true });

const isTarget = computed(() => props.command === 'target');
</script>

<template>
  <div class="control-group" :class="{ small: !isTarget }">
    <label class="control-label" for="param-input">{{ isTarget ? 'Expression' : 'Input x' }}</label>
    <!-- Number field for val/is_inc; text field for target (spec §7.5). -->
    <input
      v-if="!isTarget"
      id="param-input"
      class="control-field"
      type="number"
      step="any"
      inputmode="decimal"
      placeholder="e.g. 5"
      v-model="model"
    />
    <input
      v-else
      id="param-input"
      class="control-field"
      type="text"
      placeholder="e.g. x^2 - 4"
      v-model="model"
    />
  </div>
</template>

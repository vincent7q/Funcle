<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
defineEmits<{ submit: [] }>();
</script>

<template>
  <button class="btn-submit" :disabled="disabled" @click="$emit('submit')">Submit Clue</button>
</template>

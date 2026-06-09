<script setup lang="ts">
// Help / Stats / Settings open overlays (wired in Phase 7); emit for now.
defineEmits<{ help: []; stats: []; settings: [] }>();
</script>

<template>
  <header class="app-header">
    <h1>FUNCLE</h1>
    <p class="app-subtitle">The Function Detective Puzzle</p>
    <div class="header-actions">
      <button class="header-btn" aria-label="Help" @click="$emit('help')">?</button>
      <button class="header-btn" @click="$emit('stats')">Stats</button>
      <button class="header-btn" aria-label="Settings" @click="$emit('settings')">⚙</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

defineEmits<{ close: [] }>();

const settings = useSettingsStore();
const { showGraph } = storeToRefs(settings);

const auth = useAuthStore();
const { isLoggedIn, username, error } = storeToRefs(auth);

const mode = ref<'login' | 'register'>('login');
const name = ref('');
const password = ref('');

async function submitAccount(): Promise<void> {
  const ok =
    mode.value === 'login'
      ? await auth.login(name.value, password.value)
      : await auth.register(name.value, password.value);
  if (ok) {
    name.value = '';
    password.value = '';
  }
}
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-head">
        <h2>Settings</h2>
        <button class="modal-close" aria-label="Close" @click="$emit('close')">✕</button>
      </div>

      <div class="setting-row">
        <span>Show end-game graph</span>
        <button
          class="toggle"
          :class="{ on: showGraph }"
          role="switch"
          :aria-checked="showGraph"
          aria-label="Toggle end-game graph"
          @click="settings.toggleGraph()"
        >
          <span class="knob" />
        </button>
      </div>

      <hr class="sep" />

      <div v-if="isLoggedIn" class="account">
        <p>Signed in as <strong>{{ username }}</strong></p>
        <button class="btn-secondary" type="button" @click="auth.logout()">Log out</button>
      </div>

      <form v-else class="account" @submit.prevent="submitAccount">
        <div class="acct-tabs">
          <button
            type="button"
            class="acct-tab"
            :class="{ active: mode === 'login' }"
            @click="mode = 'login'"
          >
            Log in
          </button>
          <button
            type="button"
            class="acct-tab"
            :class="{ active: mode === 'register' }"
            @click="mode = 'register'"
          >
            Register
          </button>
        </div>
        <input
          v-model="name"
          class="control-field"
          placeholder="Username"
          autocomplete="username"
        />
        <input
          v-model="password"
          class="control-field"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
        />
        <button class="btn-submit" type="submit">
          {{ mode === 'login' ? 'Log in' : 'Create account' }}
        </button>
        <p v-if="error" class="acct-error">{{ error }}</p>
        <p class="acct-hint">Optional — an account syncs your stats. Anonymous play works too.</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.toggle {
  width: 46px;
  height: 26px;
  border-radius: 13px;
  background: var(--color-border);
  border: none;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.toggle.on {
  background: var(--color-success);
}
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
}
.toggle.on .knob {
  left: 23px;
}
.sep {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 16px 0;
}
.account {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.acct-tabs {
  display: flex;
  gap: 8px;
}
.acct-tab {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}
.acct-tab.active {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}
.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  height: 44px;
  border-radius: 4px;
  cursor: pointer;
}
.acct-error {
  color: var(--color-directional);
  margin: 0;
}
.acct-hint {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 4px 0 0;
}
</style>

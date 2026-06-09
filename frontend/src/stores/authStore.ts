import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AuthResponse } from '@shared/types';
import { api } from '@/api/client';
import { getAnonId } from '@/lib/anonId';

const KEY = 'funcle_user';

/**
 * Optional player accounts (spec §5). When logged in, the account UUID is used
 * to key sessions + stats; otherwise the anonymous browser UUID is used. The
 * logged-in identity is persisted to localStorage so it survives reloads.
 */
export const useAuthStore = defineStore('auth', () => {
  const raw = localStorage.getItem(KEY);
  const user = ref<AuthResponse | null>(raw ? (JSON.parse(raw) as AuthResponse) : null);
  const error = ref<string | null>(null);

  const isLoggedIn = computed(() => user.value !== null);
  const username = computed(() => user.value?.username ?? null);
  /** Account id if logged in, else the anonymous browser id (§5.1). */
  const currentUserId = computed(() => user.value?.userId ?? getAnonId());

  function persist(): void {
    if (user.value) localStorage.setItem(KEY, JSON.stringify(user.value));
    else localStorage.removeItem(KEY);
  }

  async function register(name: string, password: string): Promise<boolean> {
    error.value = null;
    try {
      user.value = await api.register(name, password);
      persist();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Registration failed';
      return false;
    }
  }

  async function login(name: string, password: string): Promise<boolean> {
    error.value = null;
    try {
      user.value = await api.login(name, password);
      persist();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed';
      return false;
    }
  }

  function logout(): void {
    user.value = null;
    persist();
  }

  return { user, error, isLoggedIn, username, currentUserId, register, login, logout };
});

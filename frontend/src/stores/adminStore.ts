import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AdminPuzzleSummary } from '@shared/types';
import { api, type AdminPuzzleBody } from '@/api/client';

/** Admin session + daily-puzzle scheduling state (spec §3.3, §10). */
export const useAdminStore = defineStore('admin', () => {
  const token = ref<string | null>(null);
  const puzzles = ref<AdminPuzzleSummary[]>([]);
  const error = ref<string | null>(null);
  const formError = ref<string | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => token.value !== null);

  async function login(password: string): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      const res = await api.adminLogin(password);
      token.value = res.token;
      await fetchPuzzles();
    } catch (e) {
      token.value = null;
      error.value = e instanceof Error ? e.message : 'Login failed';
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    token.value = null;
    puzzles.value = [];
  }

  async function fetchPuzzles(): Promise<void> {
    if (!token.value) return;
    puzzles.value = await api.adminListPuzzles(token.value);
  }

  async function schedule(body: AdminPuzzleBody): Promise<void> {
    formError.value = null;
    if (!token.value) return;
    try {
      await api.adminCreatePuzzle(token.value, body);
      await fetchPuzzles();
    } catch (e) {
      formError.value = e instanceof Error ? e.message : 'Could not schedule the puzzle';
    }
  }

  async function update(date: string, body: AdminPuzzleBody): Promise<void> {
    formError.value = null;
    if (!token.value) return;
    try {
      await api.adminUpdatePuzzle(token.value, date, body);
      await fetchPuzzles();
    } catch (e) {
      formError.value = e instanceof Error ? e.message : 'Could not update the puzzle';
    }
  }

  async function remove(date: string): Promise<void> {
    if (!token.value) return;
    try {
      await api.adminDeletePuzzle(token.value, date);
      await fetchPuzzles();
    } catch (e) {
      formError.value = e instanceof Error ? e.message : 'Could not delete the puzzle';
    }
  }

  return {
    token,
    puzzles,
    error,
    formError,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchPuzzles,
    schedule,
    update,
    remove,
  };
});

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAdminStore } from '@/stores/adminStore';

const store = useAdminStore();
const { puzzles, error, formError, isAuthenticated } = storeToRefs(store);

const password = ref('');

const today = new Date().toISOString().slice(0, 10);
const formDate = ref('');
const formExpr = ref('');
const formNote = ref('');
const editingDate = ref<string | null>(null);

const submitLabel = computed(() => (editingDate.value ? 'Update Puzzle' : 'Schedule Puzzle'));
const isFuture = (date: string) => date > today;

async function doLogin(): Promise<void> {
  await store.login(password.value);
  password.value = '';
}

function resetForm(): void {
  formDate.value = '';
  formExpr.value = '';
  formNote.value = '';
  editingDate.value = null;
}

async function submitForm(): Promise<void> {
  const body = {
    puzzleDate: formDate.value,
    expression: formExpr.value,
    note: formNote.value || undefined,
  };
  if (editingDate.value) {
    await store.update(editingDate.value, body);
  } else {
    await store.schedule(body);
  }
  if (!store.formError) resetForm();
}

function startEdit(row: { puzzleDate: string; expression: string; note: string | null }): void {
  formDate.value = row.puzzleDate;
  formExpr.value = row.expression;
  formNote.value = row.note ?? '';
  editingDate.value = row.puzzleDate;
}

onMounted(() => {
  if (isAuthenticated.value) void store.fetchPuzzles();
});
</script>

<template>
  <main class="admin">
    <h1>Funcle Admin</h1>
    <p class="admin-sub">Schedule daily puzzles</p>

    <!-- Login gate -->
    <form v-if="!isAuthenticated" class="admin-card" @submit.prevent="doLogin">
      <label class="control-label" for="admin-password">Admin password</label>
      <input
        id="admin-password"
        v-model="password"
        class="control-field"
        type="password"
        autocomplete="current-password"
      />
      <button class="btn-submit" type="submit">Log in</button>
      <p v-if="error" class="admin-error">{{ error }}</p>
    </form>

    <template v-else>
      <!-- Schedule / edit form -->
      <form class="admin-card" @submit.prevent="submitForm">
        <h2>{{ editingDate ? `Edit ${editingDate}` : 'New puzzle' }}</h2>
        <label class="control-label" for="p-date">Date</label>
        <input
          id="p-date"
          v-model="formDate"
          class="control-field"
          type="date"
          :min="today"
          :disabled="editingDate !== null"
          required
        />
        <label class="control-label" for="p-expr">Answer (f(x), e.g. x^2 - 4)</label>
        <input id="p-expr" v-model="formExpr" class="control-field" type="text" required />
        <label class="control-label" for="p-note">Note (optional, private)</label>
        <input id="p-note" v-model="formNote" class="control-field" type="text" />
        <div class="admin-actions">
          <button class="btn-submit" type="submit">{{ submitLabel }}</button>
          <button v-if="editingDate" class="btn-secondary" type="button" @click="resetForm">
            Cancel
          </button>
        </div>
        <p v-if="formError" class="admin-error">{{ formError }}</p>
      </form>

      <!-- Scheduled puzzles -->
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>#</th>
            <th>f(x)</th>
            <th>Note</th>
            <th>Source</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in puzzles" :key="p.puzzleDate">
            <td>{{ p.puzzleDate }}</td>
            <td>{{ p.puzzleNumber }}</td>
            <td class="result-value">{{ p.expression }}</td>
            <td>{{ p.note }}</td>
            <td>{{ p.source }}</td>
            <td>
              <template v-if="isFuture(p.puzzleDate)">
                <button class="btn-link" type="button" @click="startEdit(p)">Edit</button>
                <button class="btn-link danger" type="button" @click="store.remove(p.puzzleDate)">
                  Delete
                </button>
              </template>
              <span v-else class="admin-locked">locked</span>
            </td>
          </tr>
          <tr v-if="puzzles.length === 0">
            <td colspan="6" class="admin-empty">No puzzles scheduled yet.</td>
          </tr>
        </tbody>
      </table>
    </template>
  </main>
</template>

<style scoped>
.admin {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
  width: 100%;
}
.admin h1 {
  margin: 0;
  letter-spacing: 2px;
}
.admin-sub {
  color: var(--color-text-muted);
  margin: 4px 0 20px;
}
.admin-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}
.admin-card h2 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}
.admin-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  height: 44px;
  border-radius: 4px;
  padding: 0 16px;
  cursor: pointer;
}
.admin-error {
  color: var(--color-directional);
  margin: 8px 0 0;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.admin-table th,
.admin-table td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
}
.admin-table th {
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 1px;
}
.btn-link {
  background: none;
  border: none;
  color: var(--color-success);
  cursor: pointer;
  padding: 0 6px;
}
.btn-link.danger {
  color: var(--color-directional);
}
.admin-locked,
.admin-empty {
  color: var(--color-text-muted);
}
</style>

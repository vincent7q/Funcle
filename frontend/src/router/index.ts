import { createRouter, createWebHistory } from 'vue-router';
import GameView from '../views/GameView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'game',
      component: GameView,
    },
    // /admin is added in Phase 6 (password-gated puzzle scheduling).
  ],
});

export default router;

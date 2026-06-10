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
    {
      // Password-gated puzzle scheduling (§3.3). Intentionally not linked from
      // the game UI; lazy-loaded so it stays out of the main bundle.
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
    },
  ],
});

export default router;

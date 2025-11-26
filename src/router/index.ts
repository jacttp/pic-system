/* src/router/index.ts */
import { createRouter, createWebHistory } from 'vue-router'
// import { useAuthStore } from '@/modules/Auth/stores/authStore'
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'hub',
      component: () => import('@/modules/Hub/views/HubView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/Auth/views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
        path: '/admin',
        component: () => import('@/modules/Shared/layouts/AdminLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: 'users',
                name: 'users',
                component: () => import('@/modules/Users/views/UserList.vue')
            },
            {
                path: 'products',
                name: 'products',
                component: () => import('@/modules/Products/views/ProductList.vue')
            },
            // NUEVAS RUTAS FASE 6
            {
                path: 'clients',
                name: 'clients',
                component: () => import('@/modules/Clients/views/ClientList.vue')
            },
            {
                path: 'audit',
                name: 'audit',
                component: () => import('@/modules/Audit/views/AuditLog.vue')
            }
        ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    if (to.meta.requiresAuth && !authStore.isAuthenticated) return next('/login');
    if (to.meta.guestOnly && authStore.isAuthenticated) return next('/');
    next();
});

export default router
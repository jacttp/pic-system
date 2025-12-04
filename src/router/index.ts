/* src/router/index.ts */
import { createRouter, createWebHistory } from 'vue-router'
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
            {
                path: 'clients',
                name: 'clients',
                component: () => import('@/modules/Clients/views/ClientList.vue')
            },
            {
                path: 'audit',
                name: 'audit',
                component: () => import('@/modules/Audit/views/AuditLog.vue')
            },
            // NUEVA RUTA: Módulo PIC (Fase 2)
            {
                path: 'pic', 
                name: 'pic-report',
                component: () => import('@/modules/PIC/views/PicDashboardView.vue')
            }
        ]
    },
    // Ruta comodín para redirigir cualquier URL no encontrada al inicio
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

// Guardia de navegación global
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    
    // Verificación de doble capa: Store o LocalStorage
    const hasToken = authStore.isAuthenticated || !!localStorage.getItem('pic_auth_token');

    // 1. Si la ruta requiere auth y no hay token
    if (to.meta.requiresAuth && !hasToken) {
        console.log('⛔ Acceso denegado: Usuario no autenticado.');
        return next('/login');
    }
    
    // 2. Si la ruta es solo para invitados (Login) y ya hay token
    if (to.meta.guestOnly && hasToken) {
        return next('/');
    }
    
    next();
});

export default router
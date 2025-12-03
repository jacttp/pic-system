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
    // AGREGA ESTO PARA DEPURAR
    console.log('Navegando a:', to.path); 
    console.log('Ruta macheada:', to.matched);

    const authStore = useAuthStore();
    
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        console.log('Bloqueado por Auth, redirigiendo a login');
        return next('/login');
    }
    
    if (to.meta.guestOnly && authStore.isAuthenticated) return next('/');
    
    next();
});

export default router
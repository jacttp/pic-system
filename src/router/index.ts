/* src/router/index.ts */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';

// Función auxiliar robusta para verificar expiración
function isTokenExpired(token: string): boolean {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return true;

        // 1. Normalizar Base64Url a Base64 estándar
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // 2. Decodificar
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const { exp } = JSON.parse(jsonPayload);
        
        // --- DEBUG: BORRAR EN PRODUCCIÓN ---
        const now = Date.now() / 1000;
        const timeLeft = exp - now;
        console.log(`⏱️ Token Check: Expira en ${timeLeft.toFixed(1)} segundos`);
        // -----------------------------------

        // Si la fecha actual es mayor a la de expiración
        return Date.now() >= exp * 1000;
    } catch (e) {
        console.error("Error al decodificar token:", e);
        return true; // Ante la duda, bloquear
    }
}

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
    
    // Obtener token (prioridad: Store > LocalStorage)
    const token = authStore.token || localStorage.getItem('pic_auth_token');
    
    // Verificar existencia Y validez
    const isAuthenticated = token && !isTokenExpired(token);

    // 1. Si la ruta requiere auth
    if (to.meta.requiresAuth) {
        if (!isAuthenticated) {
            // Si el token existe pero expiró, limpiamos para evitar bucles
            if (token) {
                console.log('🔒 Sesión expirada. Redirigiendo a login...');
                authStore.logout(); // Esto limpia el estado y localStorage
            }
            return next('/login');
        }
    }
    
    // 2. Si la ruta es solo para invitados (Login) y está autenticado
    if (to.meta.guestOnly && isAuthenticated) {
        return next('/');
    }
    
    next();
});
export default router
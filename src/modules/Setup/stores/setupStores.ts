// src/modules/Setup/stores/setupStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import setupApi from '../services/setupApi';
import type { SystemModule } from '../types/setupTypes';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { ROLE_LEVELS } from '../types/setupTypes';

export const useSetupStore = defineStore('setup', () => {
   const modules = ref<SystemModule[]>([]);
   const isLoading = ref(false);
   const authStore = useAuthStore();

   // Datos Mock para desarrollo (Fallback)
   const MOCK_MODULES: SystemModule[] = [
      // Analítica
      { ModuleId: 1, ModuleKey: 'HUB', Label: 'Hub Central', Route: '/', Icon: 'fa-solid fa-chart-simple', Category: 'Analítica', DisplayOrder: 10, IsActive: true, MinRoleLevel: 1, DevStatus: 'Finished' },
      { ModuleId: 2, ModuleKey: 'PIC_RPT', Label: 'Reporte PIC', Route: '/admin/pic', Icon: 'fa-solid fa-chart-pie', Category: 'Analítica', DisplayOrder: 20, IsActive: true, MinRoleLevel: 1, DevStatus: 'Maintaining' },
      { ModuleId: 3, ModuleKey: 'LOGISTICS', Label: 'Logística', Route: '/admin/pic-logistics', Icon: 'fa-solid fa-route', Category: 'Analítica', DisplayOrder: 30, IsActive: true, MinRoleLevel: 1, DevStatus: 'Development' },
      { ModuleId: 4, ModuleKey: 'FORECAST', Label: 'Forecast', Route: '/admin/pic-forecast', Icon: 'fa-solid fa-arrow-trend-up', Category: 'Analítica', DisplayOrder: 40, IsActive: true, MinRoleLevel: 1, DevStatus: 'Development' },

      // Gestión
      { ModuleId: 5, ModuleKey: 'USERS', Label: 'Usuarios', Route: '/admin/users', Icon: 'fa-solid fa-users', Category: 'Gestión', DisplayOrder: 50, IsActive: true, MinRoleLevel: 3, DevStatus: 'Finished' }, // Admin only
      { ModuleId: 6, ModuleKey: 'PRODUCTS', Label: 'Productos', Route: '/admin/products', Icon: 'fa-solid fa-boxes-stacked', Category: 'Gestión', DisplayOrder: 60, IsActive: true, MinRoleLevel: 2, DevStatus: 'Finished' },
      { ModuleId: 7, ModuleKey: 'CLIENTS', Label: 'Clientes', Route: '/admin/clients', Icon: 'fa-solid fa-store', Category: 'Gestión', DisplayOrder: 70, IsActive: true, MinRoleLevel: 2, DevStatus: 'Development' },
      { ModuleId: 8, ModuleKey: 'VAL_CLI', Label: 'Validación Clientes', Route: '/admin/clients-validation', Icon: 'fa-solid fa-user-check', Category: 'Gestión', DisplayOrder: 80, IsActive: true, MinRoleLevel: 2, DevStatus: 'Development' },

      // Sistema
      { ModuleId: 9, ModuleKey: 'AUDIT', Label: 'Auditoría', Route: '/admin/audit', Icon: 'fa-solid fa-shield-cat', Category: 'Sistema', DisplayOrder: 90, IsActive: true, MinRoleLevel: 3, DevStatus: 'Maintaining' },
      { ModuleId: 10, ModuleKey: 'SETUP', Label: 'Setup', Route: '/admin/setup', Icon: 'fa-solid fa-gear', Category: 'Sistema', DisplayOrder: 100, IsActive: true, MinRoleLevel: 3, DevStatus: 'Finished' },
   ];

   // 1. Fetch de módulos
   async function fetchModules() {
      isLoading.value = true;
      try {
         modules.value = await setupApi.getModules();
      } catch (error) {
         console.warn("⚠️ API Backend no disponible. Usando datos Mock para 'Setup'.");
         modules.value = MOCK_MODULES;
      } finally {
         isLoading.value = false;
      }
   }

   // 2. Computed: Menú filtrado para el usuario actual
   const userMenu = computed(() => {
      // Normalizar rol del usuario actual
      const userRoleStr = authStore.user?.role || 'User';
      // Obtener nivel numérico (1=User, 2=General, 3=Admin)
      const userLevel = ROLE_LEVELS[userRoleStr] || 1;

      return modules.value
         .filter(m => m.IsActive)                   // Solo módulos activos globalmente
         .filter(m => m.MinRoleLevel <= userLevel)  // Solo si tengo nivel suficiente
         .sort((a, b) => a.DisplayOrder - b.DisplayOrder); // Ordenados por DisplayOrder
   });

   // 3. Computed: Agrupado por Categoría (para el sidebar)
   const groupedMenu = computed(() => {
      // Definimos el orden deseado de las categorías
      const categoryOrder = ['Analítica', 'Gestión', 'Sistema', 'Otro'];

      const groups: Record<string, SystemModule[]> = {};

      // Agrupar
      userMenu.value.forEach(m => {
         const cat = m.Category || 'Otro';
         if (!groups[cat]) groups[cat] = [];
         groups[cat].push(m);
      });

      // Retornar objeto ordenado por keys específicas
      const orderedGroups: Record<string, SystemModule[]> = {};
      categoryOrder.forEach(cat => {
         if (groups[cat] && groups[cat].length > 0) {
            orderedGroups[cat] = groups[cat];
         }
      });

      // Añadir cualquier otra categoría que no esté en la lista predefinida
      Object.keys(groups).forEach(key => {
         if (!orderedGroups[key]) {
            orderedGroups[key] = groups[key]!;
         }
      });

      return orderedGroups;
   });

   // 4. Acción Admin: Cambiar estado (Toggle)
   async function toggleModuleStatus(moduleId: number, currentStatus: boolean) {
      const originalState = modules.value.find(m => m.ModuleId === moduleId)?.IsActive;
      try {
         // UI Optimista: cambiar inmediatamente
         const mod = modules.value.find(m => m.ModuleId === moduleId);
         if (mod) mod.IsActive = !currentStatus;

         await setupApi.toggleModuleStatus(moduleId, !currentStatus);
         return true;
      } catch (e) {
         console.error("Error actualizando módulo", e);
         // Revertir en caso de error
         const mod = modules.value.find(m => m.ModuleId === moduleId);
         if (mod) mod.IsActive = originalState ?? currentStatus;
         return false;
      }
   }

   return {
      modules,
      isLoading,
      userMenu,
      groupedMenu,
      fetchModules,
      toggleModuleStatus
   };
});
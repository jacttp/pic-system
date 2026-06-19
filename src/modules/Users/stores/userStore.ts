/* src/modules/Users/stores/userStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userApi } from '../services/userApi';
import type { UserFull, UserCreatePayload, UserUpdatePayload, MessagePayload, AssignedStoreDetail } from '../types/user.types';
import type { HubFeatureKey, UserFeatureOverride } from '@/modules/Setup/types/setupTypes';

export const useUserStore = defineStore('users', () => {
   const users = ref<UserFull[]>([]);
   const activeUsers = ref<UserFull[]>([]);
   const jefaturas = ref<string[]>([]);
   const gerencias = ref<string[]>([]);
   const zonas = ref<string[]>([]);
   const loading = ref(false);
   const error = ref<string | null>(null);
   const featureOverrides = ref<Record<number, UserFeatureOverride[]>>({});
   const assignedStores = ref<Record<number, AssignedStoreDetail[]>>({});
   const assignedStoresLoading = ref<Record<number, boolean>>({});
   const assignedStoresError = ref<Record<number, string | null>>({});

   // --- Acciones ---

   async function fetchUsers() {
      loading.value = true;
      error.value = null;
      try {
         users.value = await userApi.getUsers();
      } catch (e: any) {
         error.value = 'Error al cargar usuarios';
         console.error(e);
      } finally {
         loading.value = false;
      }
   }

   async function fetchActiveUsers() {
      try {
         activeUsers.value = await userApi.getActiveUsers();
      } catch (e: any) {
         console.error('Error al cargar usuarios activos:', e);
      }
   }

   async function fetchJefaturas(gerencia?: string) {
      try {
         const data = await userApi.getJefaturas(gerencia);
         const unique = new Set([...data, 'Corporativo']);
         jefaturas.value = Array.from(unique).sort((a, b) => {
            if (a === 'Corporativo') return -1;
            if (b === 'Corporativo') return 1;
            return a.localeCompare(b);
         });
      } catch (e: any) {
         console.error('Error al cargar jefaturas:', e);
         jefaturas.value = ['Corporativo'];
      }
   }

   async function fetchGerencias() {
      try {
         const data = await userApi.getGerencias();
         const unique = new Set([...data, 'Corporativo']);
         gerencias.value = Array.from(unique).sort((a, b) => {
            if (a === 'Corporativo') return -1;
            if (b === 'Corporativo') return 1;
            return a.localeCompare(b);
         });
      } catch (e: any) {
         console.error('Error al cargar gerencias:', e);
         gerencias.value = ['Corporativo'];
      }
   }

   async function fetchZonas(gerencia?: string, jefatura?: string) {
      try {
         const data = await userApi.getZonas(gerencia, jefatura);
         const unique = new Set([...data, 'Corporativo']);
         zonas.value = Array.from(unique).sort((a, b) => {
            if (a === 'Corporativo') return -1;
            if (b === 'Corporativo') return 1;
            return a.localeCompare(b);
         });
      } catch (e: any) {
         console.error('Error al cargar zonas:', e);
         zonas.value = ['Corporativo'];
      }
   }

   async function createUser(payload: UserCreatePayload) {
      loading.value = true;
      error.value = null;
      try {
         const success = await userApi.createUser(payload);
         if (success) {
            await fetchUsers();
            return true;
         }
         return false;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al crear usuario';
         throw e;
      } finally {
         loading.value = false;
      }
   }

   async function updateUser(id: number, payload: UserUpdatePayload) {
      loading.value = true;
      error.value = null;
      try {
         const success = await userApi.updateUser(id, payload);
         if (success) {
            await fetchUsers();
            return true;
         }
         return false;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al actualizar usuario';
         throw e;
      } finally {
         loading.value = false;
      }
   }

   async function deleteUser(id: number) {
      loading.value = true;
      error.value = null;
      try {
         const success = await userApi.deleteUser(id);
         if (success) {
            users.value = users.value.filter(u => u.IdUser !== id);
            return true;
         }
         return false;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al eliminar usuario';
         throw e;
      } finally {
         loading.value = false;
      }
   }

   async function toggleBlock(id: number, currentlyBlocked: boolean) {
      loading.value = true;
      error.value = null;
      try {
         const success = await userApi.blockUser(id, !currentlyBlocked);
         if (success) {
            // Actualizar estado local optimista
            const user = users.value.find(u => u.IdUser === id);
            if (user) {
               user.Status = currentlyBlocked ? 'active' : 'blocked';
            }
            return true;
         }
         return false;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al cambiar estado del usuario';
         throw e;
      } finally {
         loading.value = false;
      }
   }

   async function sendMessage(payload: MessagePayload) {
      loading.value = true;
      error.value = null;
      try {
         const success = await userApi.sendMessage(payload);
         return success;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al enviar mensaje';
         throw e;
      } finally {
         loading.value = false;
      }
   }

   async function changePassword(id: number, newPassword: string) {
      loading.value = true;
      error.value = null;
      try {
         const success = await userApi.changePassword(id, newPassword);
         return success;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al cambiar contraseña';
         throw e;
      } finally {
         loading.value = false;
      }
   }

   async function fetchFeatureOverrides(id: number) {
      try {
         featureOverrides.value[id] = await userApi.getFeatureOverrides(id);
      } catch (e: any) {
         console.error('Error al cargar permisos especiales del usuario:', e);
         featureOverrides.value[id] = [];
      }
   }

   async function updateFeatureOverride(id: number, featureKey: HubFeatureKey, value: boolean | null) {
      const success = await userApi.updateFeatureOverride(id, featureKey, value);
      if (success) await fetchFeatureOverrides(id);
      return success;
   }

   const isScopedValue = (value?: string | null) => {
      if (!value) return false;
      return value.trim() !== '' && value !== 'Corporativo';
   };

   function buildAssignedStoreFilters(user: UserFull) {
      const filters: Record<string, string[]> = {};

      if (user.TipoUser === 'SuperAdmin') return filters;

      if (user.TipoUser === 'Gerente') {
         if (isScopedValue(user.Gerencia)) filters.Gerencia = [user.Gerencia];
         return filters;
      }

      if (user.TipoUser === 'Jefe') {
         if (isScopedValue(user.jefatura)) filters.Jefatura = [user.jefatura];
         return filters;
      }

      if (isScopedValue(user.Gerencia)) filters.Gerencia = [user.Gerencia];
      if (isScopedValue(user.jefatura)) filters.Jefatura = [user.jefatura];
      if (isScopedValue(user.Zona)) filters.Zona = [user.Zona!];

      return filters;
   }

   function getAssignedStoreScopeError(user: UserFull, filters: Record<string, string[]>) {
      if (user.TipoUser === 'SuperAdmin') return null;
      if (user.TipoUser === 'Gerente' && !filters.Gerencia) {
         return 'El gerente no tiene una gerencia asignada para resolver sus tiendas.';
      }
      if (user.TipoUser === 'Jefe' && !filters.Jefatura) {
         return 'El jefe no tiene una jefatura asignada para resolver sus tiendas.';
      }
      if (Object.keys(filters).length === 0) {
         return 'El usuario no tiene una estructura comercial asignada.';
      }
      return null;
   }

   async function fetchAssignedStores(user: UserFull) {
      const filters = buildAssignedStoreFilters(user);
      const scopeError = getAssignedStoreScopeError(user, filters);

      if (scopeError) {
         assignedStores.value[user.IdUser] = [];
         assignedStoresError.value[user.IdUser] = scopeError;
         return;
      }

      assignedStoresLoading.value[user.IdUser] = true;
      assignedStoresError.value[user.IdUser] = null;

      try {
         assignedStores.value[user.IdUser] = await userApi.getAssignedStoreDetails(filters);
      } catch (e: any) {
         console.error('Error al cargar tiendas asignadas:', e);
         assignedStores.value[user.IdUser] = [];
         assignedStoresError.value[user.IdUser] = e.response?.data?.message || 'Error al cargar tiendas asignadas.';
      } finally {
         assignedStoresLoading.value[user.IdUser] = false;
      }
   }

   // Obtener usuario por ID (desde la lista ya cargada)
   function getUserById(id: number): UserFull | undefined {
      return users.value.find(u => u.IdUser === id);
   }

   return {
      users,
      activeUsers,
      jefaturas,
      gerencias,
      zonas,
      loading,
      error,
      featureOverrides,
      assignedStores,
      assignedStoresLoading,
      assignedStoresError,
      fetchUsers,
      fetchActiveUsers,
      fetchJefaturas,
      fetchGerencias,
      fetchZonas,
      createUser,
      updateUser,
      deleteUser,
      toggleBlock,
      sendMessage,
      changePassword,
      fetchFeatureOverrides,
      updateFeatureOverride,
      fetchAssignedStores,
      buildAssignedStoreFilters,
      getUserById
   };
});

/* src/modules/Users/stores/userStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userApi } from '../services/userApi';
import type { UserFull, UserCreatePayload, UserUpdatePayload, MessagePayload } from '../types/user.types';

export const useUserStore = defineStore('users', () => {
   const users = ref<UserFull[]>([]);
   const activeUsers = ref<UserFull[]>([]);
   const loading = ref(false);
   const error = ref<string | null>(null);

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

   // Obtener usuario por ID (desde la lista ya cargada)
   function getUserById(id: number): UserFull | undefined {
      return users.value.find(u => u.IdUser === id);
   }

   return {
      users,
      activeUsers,
      loading,
      error,
      fetchUsers,
      fetchActiveUsers,
      createUser,
      updateUser,
      deleteUser,
      toggleBlock,
      sendMessage,
      getUserById
   };
});
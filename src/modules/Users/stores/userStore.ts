/* src/modules/Users/stores/userStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userApi } from '../services/userApi';
import type { User } from '@/types/auth';

export const useUserStore = defineStore('users', () => {
   const users = ref<User[]>([]);
   const loading = ref(false);
   const error = ref<string | null>(null);

   // Acciones
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

   async function createUser(userData: any) {
      loading.value = true;
      try {
         const success = await userApi.createUser(userData);
         if (success) {
            await fetchUsers(); // Recargar lista
            return true;
         }
         return false;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error al crear usuario';
         throw e; // Re-lanzar para que el formulario lo maneje
      } finally {
         loading.value = false;
      }
   }

   return {
      users,
      loading,
      error,
      fetchUsers,
      createUser
   };
});
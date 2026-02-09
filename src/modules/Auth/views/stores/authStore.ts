/* src/modules/Auth/stores/authStore.ts */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../../services/authApi';
import type { User } from '@/types/auth'; // Ensure types import is correct
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
   const router = useRouter();

   // Estado
   const token = ref<string | null>(localStorage.getItem('pic_auth_token'));
   const user = ref<User | null>(JSON.parse(localStorage.getItem('pic_user_data') || 'null'));
   const isLoading = ref(false);
   const error = ref<string | null>(null);

   // Getters
   const isAuthenticated = computed(() => !!token.value);
   const isAdmin = computed(() => user.value?.role === 'Admin');

   // Acciones
   async function login(username: string, password: string): Promise<boolean> {
      isLoading.value = true;
      error.value = null;

      try {
         const data = await authApi.login({ username, password });

         if (data.success) {
            const { token: newToken, user: newUser } = data.data;

            // Actualizar estado
            token.value = newToken;
            user.value = newUser;

            // Persistir
            localStorage.setItem('pic_auth_token', newToken);
            localStorage.setItem('pic_user_data', JSON.stringify(newUser));

            return true;
         }
         return false;
      } catch (e: any) {
         error.value = e.response?.data?.message || 'Error de conexión o credenciales inválidas';
         return false;
      } finally {
         isLoading.value = false;
      }
   }

   function logout() {
      token.value = null;
      user.value = null;
      localStorage.removeItem('pic_auth_token');
      localStorage.removeItem('pic_user_data');
      // Forzar recarga o redirigir
      window.location.href = '/login';
   }

   return {
      token,
      user,
      isLoading,
      error,
      isAuthenticated,
      isAdmin,
      login,
      logout
   };
});

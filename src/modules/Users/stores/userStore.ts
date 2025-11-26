/* src/modules/Users/stores/userStore.ts */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/axios';
import type { User } from '@/types/auth'; // Reusamos la interfaz User

export const useUserStore = defineStore('users', () => {
    const users = ref<User[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Acciones
    async function fetchUsers() {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.get('/users');
            if (response.data.success) {
                users.value = response.data.data;
            }
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
            const response = await api.post('/users', userData);
            if (response.data.success) {
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
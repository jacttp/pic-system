/* src/modules/Clients/stores/clientStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';
import type { Client, ClientResponse } from '@/types/clients';

export const useClientStore = defineStore('clients', () => {
    const clients = ref<Client[]>([]);
    const totalRecords = ref(0);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function fetchClients(page = 1, limit = 10, search = '') {
        isLoading.value = true;
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            if (search) params.append('search', search);

            const { data } = await api.get<ClientResponse>(`/clients?${params.toString()}`);
            
            if (data.success) {
                clients.value = data.data;
                totalRecords.value = data.total;
            }
        } catch (e: any) {
            console.error(e);
            error.value = 'Error al cargar clientes';
        } finally {
            isLoading.value = false;
        }
    }

    async function createClient(client: Partial<Client>) {
        isLoading.value = true;
        try {
            await api.post('/clients', client);
            return true;
        } catch (e: any) {
            throw e.response?.data?.message || 'Error al crear cliente';
        } finally {
            isLoading.value = false;
        }
    }

    async function updateClient(id: number, client: Partial<Client>) {
        isLoading.value = true;
        try {
            await api.put(`/clients/${id}`, client);
            return true;
        } catch (e: any) {
            throw e.response?.data?.message || 'Error al actualizar';
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteClient(id: number) {
        try {
            await api.delete(`/clients/${id}`);
            return true;
        } catch (e: any) {
            throw e.response?.data?.message || 'Error al eliminar';
        }
    }

    return {
        clients,
        totalRecords,
        isLoading,
        error,
        fetchClients,
        createClient,
        updateClient,
        deleteClient
    };
});
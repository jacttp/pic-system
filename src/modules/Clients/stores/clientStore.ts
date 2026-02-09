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

   const canales = ref<string[]>([]);
   const gerencias = ref<string[]>([]);
   const jefaturas = ref<string[]>([]);

   // async function fetchCanales() {
   //    try {
   //       // Override baseURL to avoid /v2
   //       const { data } = await api.get('/filters/canales', {
   //          baseURL: import.meta.env.VITE_API_BASE_URL
   //       });
   //       if (Array.isArray(data)) {
   //          canales.value = data;
   //       } else if (data.data && Array.isArray(data.data)) {
   //          canales.value = data.data;
   //       }
   //    } catch (e) {
   //       console.error('Error al cargar canales', e);
   //    }
   // }


   // async function fetchGerencias() {
   //    try {
   //       const { data } = await api.get('/filters/gerencias', {
   //          baseURL: import.meta.env.VITE_API_BASE_URL
   //       });
   //       if (Array.isArray(data)) {
   //          gerencias.value = data;
   //       } else if (data.data && Array.isArray(data.data)) {
   //          gerencias.value = data.data;
   //       }
   //    } catch (e) {
   //       console.error('Error al cargar gerencias', e);
   //    }
   // }

   // async function fetchJefaturas() {
   //    try {
   //       // Nota: El usuario indicó router.post('/jefaturas', getJefaturas);
   //       const { data } = await api.post('/filters/jefaturas', {}, {
   //          baseURL: import.meta.env.VITE_API_BASE_URL
   //       });
   //       if (Array.isArray(data)) {
   //          jefaturas.value = data;
   //       } else if (data.data && Array.isArray(data.data)) {
   //          jefaturas.value = data.data;
   //       }
   //    } catch (e) {
   //       console.error('Error al cargar jefaturas', e);
   //    }
   // }

   // async function fetchClientById(id: number): Promise<Client | null> {
   //    try {
   //       const { data } = await api.get<{ success: boolean, data: Client }>(`/clients/${id}`);
   //       if (data.success) {
   //          return data.data;
   //       }
   //       return null;
   //    } catch (e) {
   //       console.error('Error fetching client by ID', e);
   //       throw e;
   //    }
   // }

   async function fetchCanales() {
      try {
         // Al ser la base .../api, esto llama a: .../api/filters/canales
         const { data } = await api.get('/filters/canales', {
            baseURL: import.meta.env.VITE_API_BASE_URL
         });

         if (Array.isArray(data)) {
            canales.value = data;
         } else if (data.data && Array.isArray(data.data)) {
            canales.value = data.data;
         }
      } catch (e) {
         console.error('Error al cargar canales', e);
      }
   }

   async function fetchGerencias() {
      try {
         const { data } = await api.get('/filters/gerencias', {
            baseURL: import.meta.env.VITE_API_BASE_URL
         });

         if (Array.isArray(data)) {
            gerencias.value = data;
         } else if (data.data && Array.isArray(data.data)) {
            gerencias.value = data.data;
         }
      } catch (e) {
         console.error('Error al cargar gerencias', e);
      }
   }

   async function fetchJefaturas() {
      try {
         const { data } = await api.post('/filters/jefaturas', {}, {
            baseURL: import.meta.env.VITE_API_BASE_URL
         });

         if (Array.isArray(data)) {
            jefaturas.value = data;
         } else if (data.data && Array.isArray(data.data)) {
            jefaturas.value = data.data;
         }
      } catch (e) {
         console.error('Error al cargar jefaturas', e);
      }
   }

   // --- CLIENTE POR ID (CRUD V2) ---

   async function fetchClientById(id: number | string): Promise<Client | null> {
      try {
         // Axios base URL is already /api/v2 so we just need /clients/${id}
         const { data } = await api.get<{ success: boolean, data: Client }>(`/clients/${id}`);
         if (data.success) {
            return data.data;
         }
         return null;
      } catch (e) {
         console.error('Error fetching client by ID', e);
         throw e;
      }
   }




   return {
      clients,
      totalRecords,
      isLoading,
      error,
      canales,
      gerencias,
      jefaturas,
      fetchClients,
      createClient,
      updateClient,
      deleteClient,
      fetchCanales,
      fetchGerencias,
      fetchJefaturas,
      fetchClientById
   };
});
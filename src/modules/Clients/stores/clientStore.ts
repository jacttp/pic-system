/* src/modules/Clients/stores/clientStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { clientApi } from '../services/clientApi';
import type { Client, ClientFilterOptions } from '@/types/clients'; // Adjust types as needed

export const useClientStore = defineStore('clients', () => {
   // State
   const clients = ref<Client[]>([]);
   const totalRecords = ref(0);
   const isLoading = ref(false);
   const error = ref<string | null>(null);
   const filters = ref<ClientFilterOptions>({
      canales: [],
      gerencias: [],
      jefaturas: []
   });

   // Getters for filters (Expose them directly if needed)
   const canales = ref<string[]>([]);
   const gerencias = ref<string[]>([]);
   const jefaturas = ref<string[]>([]);

   // Actions
   async function fetchClients(page = 1, limit = 10, search = '', filterParams: any = {}) {
      isLoading.value = true;
      try {
         const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            ...filterParams
         });
         const data = await clientApi.getClients(params);
         if (data.success) {
            clients.value = data.data;
            totalRecords.value = data.total;
         }
      } catch (e: any) {
         error.value = 'Error fetching clients';
         console.error(e);
      } finally {
         isLoading.value = false;
      }
   }

   // Unified fetch (Optional, kept for backward comp)
   async function fetchFilters() {
      try {
         const [c, g, j] = await Promise.all([
            clientApi.getCanales(),
            clientApi.getGerencias(),
            clientApi.getJefaturas()
         ]);

         // Update state
         canales.value = c;
         gerencias.value = g;
         jefaturas.value = j;

         // Update legacy filters object if needed
         filters.value = { canales: c, gerencias: g, jefaturas: j };
      } catch (e) {
         console.error('Error fetching filters', e);
      }
   }

   // Individual fetch actions (Required by ClientEditView.vue)
   async function fetchCanales() {
      try {
         canales.value = await clientApi.getCanales();
         filters.value.canales = canales.value;
      } catch (e) { console.error(e); }
   }

   async function fetchGerencias() {
      try {
         gerencias.value = await clientApi.getGerencias();
         filters.value.gerencias = gerencias.value;
      } catch (e) { console.error(e); }
   }

   async function fetchJefaturas() {
      try {
         jefaturas.value = await clientApi.getJefaturas();
         filters.value.jefaturas = jefaturas.value;
      } catch (e) { console.error(e); }
   }

   async function createClient(client: Partial<Client>) {
      try {
         await clientApi.createClient(client);
         return true;
      } catch (e) {
         console.error(e);
         return false;
      }
   }

   async function updateClient(id: number, client: Partial<Client>) {
      try {
         await clientApi.updateClient(id, client);
         return true;
      } catch (e) {
         console.error(e);
         return false;
      }
   }

   async function deleteClient(id: number) {
      try {
         await clientApi.deleteClient(id);
         return true;
      } catch (e) {
         console.error(e);
         return false;
      }
   }

   async function fetchClientById(id: number | string) {
      try {
         return await clientApi.getClientById(id);
      } catch (e) {
         console.error(e);
         return null;
      }
   }

   return {
      clients,
      totalRecords,
      isLoading,
      error,
      filters,
      canales,
      gerencias,
      jefaturas,
      fetchClients,
      fetchFilters,
      fetchCanales,
      fetchGerencias,
      fetchJefaturas,
      createClient,
      updateClient,
      deleteClient,
      fetchClientById
   };
});
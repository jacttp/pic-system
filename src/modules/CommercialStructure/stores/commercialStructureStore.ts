/* src/modules/CommercialStructure/stores/commercialStructureStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { commercialStructureApi } from '../services/commercialStructureApi';
import type { CommercialStructure } from '@/types/commercialStructure';

export const useCommercialStructureStore = defineStore('commercialStructure', () => {
   // State
   const items = ref<CommercialStructure[]>([]);
   const totalRecords = ref(0);
   const isLoading = ref(false);
   const error = ref<string | null>(null);
   const rutaMOptions = ref<string[]>([]);

   // Actions
   async function fetchItems(page = 1, limit = 20, search = '') {
      isLoading.value = true;
      error.value = null;
      try {
         const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search
         });
         const data = await commercialStructureApi.getAll(params);
         if (data.success) {
            items.value = data.data;
            totalRecords.value = data.total;
         }
      } catch (e: any) {
         error.value = 'Error al obtener estructura comercial';
         console.error(e);
      } finally {
         isLoading.value = false;
      }
   }

   async function fetchByRuta(ruta: string) {
      try {
         return await commercialStructureApi.getByRuta(ruta);
      } catch (e) {
         console.error(e);
         return null;
      }
   }

   async function createItem(item: Partial<CommercialStructure>) {
      try {
         await commercialStructureApi.create(item);
         return true;
      } catch (e) {
         console.error(e);
         return false;
      }
   }

   async function updateItem(ruta: string, item: Partial<CommercialStructure>) {
      try {
         const result = await commercialStructureApi.update(ruta, item);
         return result;
      } catch (e) {
         console.error(e);
         return null;
      }
   }

   async function fetchRutaMOptions() {
      try {
         rutaMOptions.value = await commercialStructureApi.getRutaMOptions();
      } catch (e) {
         console.error(e);
      }
   }

   async function deleteItem(ruta: string) {
      try {
         await commercialStructureApi.remove(ruta);
         return true;
      } catch (e) {
         console.error(e);
         return false;
      }
   }

   return {
      items,
      totalRecords,
      isLoading,
      error,
      rutaMOptions,
      fetchItems,
      fetchByRuta,
      createItem,
      updateItem,
      deleteItem,
      fetchRutaMOptions
   };
});

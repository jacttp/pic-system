import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { chainConfigApi } from '../services/chainConfigApi';
import type {
   ChainSkuMapping,
   ChainSkuMappingPayload,
   ChainSkuUnit,
   ChainSkuUnitPayload,
   ChainStoreConfig,
   ChainStoreConfigPayload,
   ChainConfigDiagnostics,
   ChainConfigBulkSummary,
   ChainConfigBulkType,
   ChainZ8CatalogItem,
   ChainZ8CatalogPayload,
} from '../types/chainConfigTypes';

export const useChainConfigStore = defineStore('chain-config', () => {
   const storeConfigs = ref<ChainStoreConfig[]>([]);
   const skuUnits = ref<ChainSkuUnit[]>([]);
   const skuMappings = ref<ChainSkuMapping[]>([]);
   const z8Catalog = ref<ChainZ8CatalogItem[]>([]);
   const diagnostics = ref<ChainConfigDiagnostics | null>(null);

   const loadingStores = ref(false);
   const loadingSkuUnits = ref(false);
   const loadingMappings = ref(false);
   const loadingZ8Catalog = ref(false);
   const loadingDiagnostics = ref(false);
   const loadingBulk = ref(false);
   const saving = ref(false);
   const error = ref<string | null>(null);

   const skuOptions = computed(() =>
      skuUnits.value
         .map(sku => ({ sku_muliix: sku.sku_muliix, sku_nombre: sku.sku_nombre }))
         .sort((a, b) => a.sku_nombre.localeCompare(b.sku_nombre))
   );

   const storeOptions = computed(() =>
      storeConfigs.value
         .map(row => ({
            id_cliente: row.id_cliente,
            nombre_tienda: row.nombre_tienda || row.id_cliente,
            jefatura: row.Jefatura || row.jefatura || 'N/D',
         }))
         .sort((a, b) => a.nombre_tienda.localeCompare(b.nombre_tienda))
   );

   async function fetchStoreConfigs() {
      loadingStores.value = true;
      error.value = null;
      try {
         storeConfigs.value = await chainConfigApi.getStoreConfigs();
      } catch (e) {
         error.value = 'No se pudieron cargar las configuraciones de tienda.';
         console.error('[chainConfigStore.fetchStoreConfigs]', e);
      } finally {
         loadingStores.value = false;
      }
   }

   async function fetchSkuUnits() {
      loadingSkuUnits.value = true;
      error.value = null;
      try {
         skuUnits.value = await chainConfigApi.getSkuUnits();
      } catch (e) {
         error.value = 'No se pudieron cargar las unidades SKU.';
         console.error('[chainConfigStore.fetchSkuUnits]', e);
      } finally {
         loadingSkuUnits.value = false;
      }
   }

   async function fetchSkuMappings() {
      loadingMappings.value = true;
      error.value = null;
      try {
         skuMappings.value = await chainConfigApi.getSkuMappings();
      } catch (e) {
         error.value = 'No se pudieron cargar las homologaciones SKU-cadena.';
         console.error('[chainConfigStore.fetchSkuMappings]', e);
      } finally {
         loadingMappings.value = false;
      }
   }

   async function fetchZ8Catalog() {
      loadingZ8Catalog.value = true;
      error.value = null;
      try {
         z8Catalog.value = await chainConfigApi.getZ8Catalog();
      } catch (e) {
         error.value = 'No se pudo cargar el catalogo Z8.';
         console.error('[chainConfigStore.fetchZ8Catalog]', e);
      } finally {
         loadingZ8Catalog.value = false;
      }
   }

   async function fetchDiagnostics() {
      loadingDiagnostics.value = true;
      error.value = null;
      try {
         diagnostics.value = await chainConfigApi.getDiagnostics();
      } catch (e) {
         error.value = 'No se pudo cargar el diagnostico operativo.';
         console.error('[chainConfigStore.fetchDiagnostics]', e);
      } finally {
         loadingDiagnostics.value = false;
      }
   }

   async function init() {
      await Promise.all([
         fetchStoreConfigs(),
         fetchSkuUnits(),
         fetchSkuMappings(),
         fetchZ8Catalog(),
         fetchDiagnostics(),
      ]);
   }

   async function saveStoreConfig(idCliente: string, payload: ChainStoreConfigPayload) {
      saving.value = true;
      try {
         await chainConfigApi.updateStoreConfig(idCliente, payload);
         return true;
      } catch (e) {
         console.error('[chainConfigStore.saveStoreConfig]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function saveSkuUnit(sku: string, payload: Partial<ChainSkuUnitPayload>) {
      saving.value = true;
      try {
         await chainConfigApi.updateSkuUnit(sku, payload);
         return true;
      } catch (e) {
         console.error('[chainConfigStore.saveSkuUnit]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function createSkuMapping(payload: ChainSkuMappingPayload) {
      saving.value = true;
      try {
         await chainConfigApi.createSkuMapping(payload);
         await fetchSkuMappings();
         return true;
      } catch (e) {
         console.error('[chainConfigStore.createSkuMapping]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function updateSkuMapping(id: number, payload: ChainSkuMappingPayload) {
      saving.value = true;
      try {
         await chainConfigApi.updateSkuMapping(id, payload);
         await fetchSkuMappings();
         return true;
      } catch (e) {
         console.error('[chainConfigStore.updateSkuMapping]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function deleteSkuMapping(id: number) {
      saving.value = true;
      try {
         await chainConfigApi.deleteSkuMapping(id);
         skuMappings.value = skuMappings.value.filter(item => item.idskuscadenas !== id);
         return true;
      } catch (e) {
         console.error('[chainConfigStore.deleteSkuMapping]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function createZ8CatalogItem(payload: ChainZ8CatalogPayload) {
      saving.value = true;
      try {
         await chainConfigApi.createZ8CatalogItem(payload);
         await fetchZ8Catalog();
         return true;
      } catch (e) {
         console.error('[chainConfigStore.createZ8CatalogItem]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function updateZ8CatalogItem(id: number, payload: ChainZ8CatalogPayload) {
      saving.value = true;
      try {
         await chainConfigApi.updateZ8CatalogItem(id, payload);
         await fetchZ8Catalog();
         return true;
      } catch (e) {
         console.error('[chainConfigStore.updateZ8CatalogItem]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function deleteZ8CatalogItem(id: number) {
      saving.value = true;
      try {
         await chainConfigApi.deleteZ8CatalogItem(id);
         z8Catalog.value = z8Catalog.value.filter(item => item.id !== id);
         return true;
      } catch (e) {
         console.error('[chainConfigStore.deleteZ8CatalogItem]', e);
         return false;
      } finally {
         saving.value = false;
      }
   }

   async function previewBulk(type: ChainConfigBulkType, rows: Record<string, unknown>[]): Promise<ChainConfigBulkSummary | null> {
      loadingBulk.value = true;
      error.value = null;
      try {
         return await chainConfigApi.previewBulk(type, rows);
      } catch (e) {
         error.value = 'No se pudo prevalidar la carga masiva.';
         console.error('[chainConfigStore.previewBulk]', e);
         return null;
      } finally {
         loadingBulk.value = false;
      }
   }

   async function commitBulk(type: ChainConfigBulkType, rows: Record<string, unknown>[]): Promise<ChainConfigBulkSummary | null> {
      saving.value = true;
      error.value = null;
      try {
         const summary = await chainConfigApi.commitBulk(type, rows);
         await Promise.all([
            fetchSkuMappings(),
            fetchZ8Catalog(),
            fetchDiagnostics(),
         ]);
         return summary;
      } catch (e) {
         error.value = 'No se pudo aplicar la carga masiva.';
         console.error('[chainConfigStore.commitBulk]', e);
         return null;
      } finally {
         saving.value = false;
      }
   }

   return {
      storeConfigs,
      skuUnits,
      skuMappings,
      z8Catalog,
      diagnostics,
      loadingStores,
      loadingSkuUnits,
      loadingMappings,
      loadingZ8Catalog,
      loadingDiagnostics,
      loadingBulk,
      saving,
      error,
      skuOptions,
      storeOptions,
      init,
      fetchStoreConfigs,
      fetchSkuUnits,
      fetchSkuMappings,
      fetchZ8Catalog,
      fetchDiagnostics,
      saveStoreConfig,
      saveSkuUnit,
      createSkuMapping,
      updateSkuMapping,
      deleteSkuMapping,
      createZ8CatalogItem,
      updateZ8CatalogItem,
      deleteZ8CatalogItem,
      previewBulk,
      commitBulk,
   };
});

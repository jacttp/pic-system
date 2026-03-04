// src/modules/PVR/stores/pvrStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { pvrApi } from '../services/pvrApi';
import type {
   PvrCanalData,
   PvrFilterOptions,
   PvrActiveFilters,
   PvrCanal,
} from '../types/pvrTypes';

const ALL_MESES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export const usePvrStore = defineStore('pvr', () => {

   // ─────────────────────────────────────────
   // STATE
   // ─────────────────────────────────────────

   const reportData = ref<Record<PvrCanal, PvrCanalData> | null>(null);
   const availableCanales = ref<PvrCanal[]>([]);

   const filterOptions = ref<PvrFilterOptions>({
      años: [],
      canales: [],
      gerencias: [],
      cadenas: [],
      meses: ALL_MESES,
   });

   const activeFilters = ref<PvrActiveFilters>({
      años: [],
      meses: [],
      gerencias: [],
      cadenas: [],
      canal: '',
   });

   const isLoading = ref(false);
   const isLoadingFilters = ref(false);
   const error = ref<string | null>(null);

   // ─────────────────────────────────────────
   // GETTERS
   // ─────────────────────────────────────────

   const hasActiveFilters = computed(() =>
      activeFilters.value.años.length > 0 ||
      activeFilters.value.meses.length > 0 ||
      activeFilters.value.gerencias.length > 0 ||
      activeFilters.value.cadenas.length > 0 ||
      activeFilters.value.canal !== ''
   );

   // ─────────────────────────────────────────
   // ACTIONS
   // ─────────────────────────────────────────

   /**
    * Carga las opciones de filtros en paralelo desde 3 fuentes:
    *  - /api/pvr/filters   → canales + años (exclusivos de InformePVR, cacheado 12h)
    *  - /api/filters/gerencias → gerencias (catálogo, cacheado)
    *  - /api/filters/cadenas   → cadenas  (catálogo, cacheado)
    */
   async function fetchFilters(): Promise<void> {
      isLoadingFilters.value = true;
      error.value = null;

      try {
         const [pvrResult, gerenciasResult, cadenasResult] = await Promise.allSettled([
            pvrApi.getPvrFilters(),
            pvrApi.getGerencias(),
            pvrApi.getCadenas(),
         ]);

         if (pvrResult.status === 'fulfilled') {
            filterOptions.value.canales = pvrResult.value.canales;
            filterOptions.value.años = pvrResult.value.años;
         } else {
            console.error('[pvrStore] Error cargando filtros PVR:', pvrResult.reason);
         }

         if (gerenciasResult.status === 'fulfilled') {
            filterOptions.value.gerencias = gerenciasResult.value;
         } else {
            console.error('[pvrStore] Error cargando gerencias:', gerenciasResult.reason);
         }

         if (cadenasResult.status === 'fulfilled') {
            filterOptions.value.cadenas = cadenasResult.value;
         } else {
            console.error('[pvrStore] Error cargando cadenas:', cadenasResult.reason);
         }

         // Default: año más reciente de InformePVR
         if (filterOptions.value.años.length > 0 && activeFilters.value.años.length === 0) {
            const latestYear = [...filterOptions.value.años].sort().at(-1)!;
            activeFilters.value.años = [latestYear];
         }

      } catch (e: unknown) {
         error.value = 'Error al cargar los filtros del informe PVR.';
         console.error('[pvrStore.fetchFilters]', e);
      } finally {
         isLoadingFilters.value = false;
      }
   }

   /** Carga el informe con los filtros activos actuales. */
   async function fetchReport(): Promise<void> {
      isLoading.value = true;
      error.value = null;

      try {
         const response = await pvrApi.getReport(activeFilters.value);

         if (response.success) {
            reportData.value = response.data;
            availableCanales.value = response.meta.canales;
         }
      } catch (e: unknown) {
         error.value = 'Error al obtener el informe PVR.';
         console.error('[pvrStore.fetchReport]', e);
      } finally {
         isLoading.value = false;
      }
   }

   /** Actualiza filtros activos y recarga el informe. */
   async function applyFilters(filters: PvrActiveFilters): Promise<void> {
      activeFilters.value = { ...filters };
      await fetchReport();
   }

   /** Resetea filtros al estado inicial (año más reciente) y recarga. */
   async function resetFilters(): Promise<void> {
      const latestYear = [...filterOptions.value.años].sort().at(-1) ?? '';
      activeFilters.value = {
         años: latestYear ? [latestYear] : [],
         meses: [],
         gerencias: [],
         cadenas: [],
         canal: '',
      };
      await fetchReport();
   }

   // ─────────────────────────────────────────
   // EXPOSE
   // ─────────────────────────────────────────

   return {
      reportData,
      availableCanales,
      filterOptions,
      activeFilters,
      isLoading,
      isLoadingFilters,
      error,
      hasActiveFilters,
      fetchFilters,
      fetchReport,
      applyFilters,
      resetFilters,
   };
});
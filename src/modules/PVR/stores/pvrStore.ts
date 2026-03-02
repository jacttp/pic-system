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

// Meses fijos 1-12 — no requieren query al backend
const ALL_MESES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export const usePvrStore = defineStore('pvr', () => {

   // ─────────────────────────────────────────
   // STATE
   // ─────────────────────────────────────────

   const reportData = ref<Record<PvrCanal, PvrCanalData> | null>(null);
   const availableCanales = ref<PvrCanal[]>([]);
   const activeCanal = ref<PvrCanal>('Total');

   const filterOptions = ref<PvrFilterOptions>({
      años: [],
      meses: ALL_MESES,   // siempre disponibles
      gerencias: [],
      cadenas: [],
      canales: [],
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

   const currentCanalData = computed<PvrCanalData | null>(() => {
      if (!reportData.value) return null;
      return reportData.value[activeCanal.value] ?? null;
   });

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
    * Carga las opciones de filtros desde 3 fuentes:
    *  - /filters/anios      → años (filterRoutes, cacheado)
    *  - /filters/gerencias  → gerencias (filterRoutes, cacheado)
    *  - /api/pvr/filters    → cadenas + canales (exclusivo de InformePVR)
    *
    * Las tres llamadas van en paralelo con Promise.allSettled para que
    * el fallo de una no bloquee las demás.
    */
   async function fetchFilters(): Promise<void> {
      isLoadingFilters.value = true;
      error.value = null;

      try {
         const [añosResult, gerenciasResult, pvrResult] = await Promise.allSettled([
            pvrApi.getAnios(),
            pvrApi.getGerencias(),
            pvrApi.getPvrExclusiveFilters(),
         ]);

         if (añosResult.status === 'fulfilled') {
            filterOptions.value.años = añosResult.value;
         } else {
            console.error('[pvrStore] Error cargando años:', añosResult.reason);
         }

         if (gerenciasResult.status === 'fulfilled') {
            filterOptions.value.gerencias = gerenciasResult.value;
         } else {
            console.error('[pvrStore] Error cargando gerencias:', gerenciasResult.reason);
         }

         if (pvrResult.status === 'fulfilled') {
            filterOptions.value.cadenas = pvrResult.value.cadenas;
            filterOptions.value.canales = pvrResult.value.canales;
         } else {
            console.error('[pvrStore] Error cargando filtros PVR exclusivos:', pvrResult.reason);
         }

         // Default: año más reciente disponible
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

   /**
    * Carga el informe con los filtros activos actuales.
    */
   async function fetchReport(): Promise<void> {
      isLoading.value = true;
      error.value = null;

      try {
         const response = await pvrApi.getReport(activeFilters.value);

         if (response.success) {
            reportData.value = response.data;
            availableCanales.value = response.meta.canales;

            // Si el canal activo desapareció de la respuesta, caer a 'Total'
            if (!availableCanales.value.includes(activeCanal.value)) {
               activeCanal.value = availableCanales.value.includes('Total')
                  ? 'Total'
                  : (availableCanales.value[0] ?? 'Total');
            }
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

   /** Cambia el canal visible en la tabla sin re-fetchear. */
   function setActiveCanal(canal: PvrCanal): void {
      if (availableCanales.value.includes(canal)) {
         activeCanal.value = canal;
      }
   }

   // ─────────────────────────────────────────
   // EXPOSE
   // ─────────────────────────────────────────

   return {
      reportData,
      availableCanales,
      activeCanal,
      filterOptions,
      activeFilters,
      isLoading,
      isLoadingFilters,
      error,
      currentCanalData,
      hasActiveFilters,
      fetchFilters,
      fetchReport,
      applyFilters,
      resetFilters,
      setActiveCanal,
   };
});
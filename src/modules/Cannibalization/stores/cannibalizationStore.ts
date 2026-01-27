/* src/modules/Cannibalization/stores/cannibalizationStore.ts */
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import cannibalizationApi from '../services/cannibalizationApi';
import { useCannibalizationEngine } from '../composables/useCannibalizationEngine';
import type { ClientNode, DetectionRules, DetectedCannibalization } from '../types/cannibalizationTypes';

export const useCannibalizationStore = defineStore('cannibalization', () => {

   // --- STATE ---
   const isLoading = ref(false);
   const rawData = ref<ClientNode[]>([]);
   const detectedCases = ref<DetectedCannibalization[]>([]);

   // Metadatos Dinámicos
   const availableFamilies = ref<string[]>([]);
   const availableYears = ref<string[]>([]); // <--- NUEVO


   // Configuración Reactiva (Valores por defecto)
   const rules = reactive<DetectionRules>({
      dropThreshold: 0.5,    // 50% caída para ser víctima
      growthThreshold: 0.2,  // 20% subida para ser caníbal
      minVolume: 10,         // Mínimo 10kg promedio para considerar
      splitMonth: 8          // Agosto (según el caso de uso del usuario)
   });

   // --- COMPOSABLES ---
   const engine = useCannibalizationEngine();

   // --- ACTIONS ---

   /**
    * 1. Cargar Datos del Servidor
    */
   async function fetchData(year: string, filters: any = {}) {
      isLoading.value = true;
      try {
         rawData.value = await cannibalizationApi.fetchAnalysisData(year, filters);
         analyze();
      } catch (error) {
         console.error('Error fetching cannibalization data:', error);
         rawData.value = [];
      } finally {
         isLoading.value = false;
      }
   }
   /**
   * NUEVO: Cargar lista de familias al iniciar
   */
   async function loadMetadata() {
      try {
         // Hacemos las dos peticiones al mismo tiempo para no perder tiempo
         const [families, years] = await Promise.all([
            cannibalizationApi.fetchFamilies(),
            cannibalizationApi.fetchYears()
         ]);

         availableFamilies.value = families;
         // Ordenamos los años descendente (2025, 2024...) para que el más reciente salga primero
         availableYears.value = years.sort().reverse();

      } catch (error) {
         console.error('Error cargando metadatos:', error);
      }
   }

   function analyze() {
      if (rawData.value.length === 0) {
         detectedCases.value = [];
         return;
      }
      detectedCases.value = engine.runAnalysis(rawData.value, rules);
   }

   function updateRules(newRules: Partial<DetectionRules>) {
      Object.assign(rules, newRules);
      analyze();
   }

   return {
      // State
      isLoading,
      rawData,
      detectedCases,
      rules,
      availableFamilies,
      availableYears,

      // Actions
      fetchData,
      loadMetadata,
      analyze,
      updateRules
   };
});
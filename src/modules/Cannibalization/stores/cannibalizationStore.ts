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
   const lastFetchParams = ref({ year: '', filters: {} });

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
         lastFetchParams.value = { year, filters };
         // Al cargar nuevos datos, re-ejecutamos el análisis automáticamente
         analyze();
      } catch (error) {
         console.error('Error fetching cannibalization data:', error);

         rawData.value = [];
      } finally {
         isLoading.value = false;
      }
   }

   /**
    * 2. Ejecutar Motor de Análisis (Local)
    * Esto es instantáneo y reactivo a los sliders de configuración
    */
   function analyze() {
      if (rawData.value.length === 0) return;

      console.log('🔄 Ejecutando motor de canibalización con reglas:', rules);
      detectedCases.value = engine.runAnalysis(rawData.value, rules);
   }

   /**
    * 3. Actualizar reglas y re-analizar
    */
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

      // Actions
      fetchData,
      analyze,
      updateRules
   };
});
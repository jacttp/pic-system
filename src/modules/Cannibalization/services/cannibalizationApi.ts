/* src/modules/Cannibalization/services/cannibalizationApi.ts */
import api from '@/api/axios';
import type { ClientNode } from '../types/cannibalizationTypes';

// Payload para los filtros
interface AnalysisFilters {
   grupo?: string;
   ruta?: string;
   gerencia?: string;
}

export default {
   /**
    * Obtiene los datos jerárquicos de ventas (Cliente -> Familia -> SKUs)
    * para el análisis de canibalización.
    */
   async fetchAnalysisData(year: string, filters: AnalysisFilters = {}): Promise<ClientNode[]> {
      // CORRECCIÓN: Sobrescribimos la baseURL para apuntar a '/api' en lugar de '/api/v2'
      // Esto es necesario porque la ruta está en analyticsRoutes.js
      const { data } = await api.post<ClientNode[]>('/cannibalization', {
         year,
         filters
      }, {
         // "Rompe" el default de Axios que agrega /v2
         baseURL: import.meta.env.VITE_API_BASE_URL
      });

      return data;
   }
};
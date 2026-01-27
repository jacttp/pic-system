/* src/modules/Cannibalization/services/cannibalizationApi.ts */
import api from '@/api/axios';
import type { ClientNode } from '../types/cannibalizationTypes';

// Payload para los filtros
interface AnalysisFilters {
   grupo?: string;
   ruta?: string;
   gerencia?: string;
   jefatura?: string;
}

export default {
   /**
    * Obtiene los datos jerárquicos de ventas
    */
   async fetchAnalysisData(year: string, filters: AnalysisFilters = {}): Promise<ClientNode[]> {
      const { data } = await api.post<ClientNode[]>('/cannibalization', {
         year,
         filters
      }, {
         baseURL: import.meta.env.VITE_API_BASE_URL
      });

      return data;
   },

   /**
    * Obtiene la lista de familias (grupos) disponibles.
    */
   async fetchFamilies(): Promise<string[]> {
      const { data } = await api.post<string[]>('/grupos', {}, {
         baseURL: import.meta.env.VITE_API_BASE_URL + '/filters'
      });
      return data;
   },

   /**
    * NUEVO: Obtiene la lista de años disponibles (Fiscal Years).
    */
   async fetchYears(): Promise<string[]> {
      // Usamos GET porque así está definido en filterRoutes.js
      const { data } = await api.get<string[]>('/anios', {
         baseURL: import.meta.env.VITE_API_BASE_URL + '/filters'
      });
      return data;
   }
};
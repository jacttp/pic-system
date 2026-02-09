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
      // Assuming Cannibalization uses V1 or Root. If V2, prepend V2. 
      // Original code used baseURL override to default (V1). 
      // Now default IS V1. So we just use '/cannibalization'.
      const { data } = await api.post<ClientNode[]>('/cannibalization', {
         year,
         filters
      });

      return data;
   },

   /**
    * Obtiene la lista de familias (grupos) disponibles.
    */
   async fetchFamilies(): Promise<string[]> {
      const { data } = await api.post<string[]>('/filters/grupos', {});
      return data;
   },

   /**
    * NUEVO: Obtiene la lista de años disponibles (Fiscal Years).
    */
   async fetchYears(): Promise<string[]> {
      const { data } = await api.get<string[]>('/filters/anios');
      return data;
   }
};

/* src/modules/CommercialStructure/services/commercialStructureApi.ts */
import api from '@/api/axios';
import type { CommercialStructure, CommercialStructureResponse } from '@/types/commercialStructure';

const V2 = import.meta.env.VITE_API_V2_PATH;

export const commercialStructureApi = {
   async getAll(params: URLSearchParams): Promise<CommercialStructureResponse> {
      const { data } = await api.get<CommercialStructureResponse>(
         `${V2}/commercial-structure?${params.toString()}`
      );
      return data;
   },

   async getByRuta(ruta: string): Promise<CommercialStructure | null> {
      const { data } = await api.get<{ success: boolean; data: CommercialStructure }>(
         `${V2}/commercial-structure/${encodeURIComponent(ruta)}`
      );
      return data.success ? data.data : null;
   },

   async create(item: Partial<CommercialStructure>): Promise<void> {
      await api.post(`${V2}/commercial-structure`, item);
   },

   async update(ruta: string, item: Partial<CommercialStructure>): Promise<{ clientesActualizados: number }> {
      const { data } = await api.put<{ success: boolean; clientesActualizados: number }>(
         `${V2}/commercial-structure/${encodeURIComponent(ruta)}`,
         item
      );
      return data;
   },

   async remove(ruta: string): Promise<void> {
      await api.delete(`${V2}/commercial-structure/${encodeURIComponent(ruta)}`);
   },

   async getRutaMOptions(): Promise<string[]> {
      const { data } = await api.get<{ success: boolean; data: string[] }>(
         `${V2}/commercial-structure/rutam-options`
      );
      return data.success ? data.data : [];
   }
};

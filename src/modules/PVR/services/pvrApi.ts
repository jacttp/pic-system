// src/modules/PVR/services/pvrApi.ts
import api from '@/api/axios';
import type { PvrReportResponse, PvrActiveFilters } from '../types/pvrTypes';

// Rutas PVR → montadas en analyticsRoutes bajo /api (sin /v2)
const BASE = '/pvr';

/**
 * Serializa los filtros activos en query params para el GET.
 * Solo incluye params con valor — evita strings vacíos en la URL.
 */
function buildParams(filters: PvrActiveFilters): Record<string, string> {
   const params: Record<string, string> = {};
   if (filters.años.length) params.años = filters.años.join(',');
   if (filters.meses.length) params.meses = filters.meses.join(',');
   if (filters.gerencias.length) params.gerencias = filters.gerencias.join(',');
   if (filters.cadenas.length) params.cadenas = filters.cadenas.join(',');
   if (filters.canal) params.canal = filters.canal;
   return params;
}

export const pvrApi = {

   /**
    * GET /api/pvr/report
    * Informe completo con todos los indicadores derivados, agrupados por canal.
    */
   async getReport(filters: PvrActiveFilters): Promise<PvrReportResponse> {
      const { data } = await api.get<PvrReportResponse>(`${BASE}/report`, {
         params: buildParams(filters),
      });
      return data;
   },

   /**
    * GET /api/pvr/filters
    * Solo devuelve cadenas y canales — valores exclusivos de InformePVR
    * que no están en filterRoutes.
    */
   async getPvrExclusiveFilters(): Promise<{ cadenas: string[]; canales: string[] }> {
      const { data } = await api.get<{ success: boolean; data: { cadenas: string[]; canales: string[] } }>(
         `${BASE}/filters`
      );
      return data.data;
   },

   /**
    * Reutiliza los endpoints existentes de filterRoutes para años y gerencias.
    * Estos ya tienen caché en el backend y son los datos correctos de basevPic.
    */
   async getAnios(): Promise<string[]> {
      const { data } = await api.get<string[]>('/filters/anios');
      return Array.isArray(data) ? data : [];
   },

   async getGerencias(): Promise<string[]> {
      const { data } = await api.get<string[]>('/filters/gerencias');
      return Array.isArray(data) ? data : [];
   },
};
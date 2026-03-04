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
    * GET /api/pvr/stats
    * Totales anuales de cada indicador por canal (sin desglose mensual).
    * Útil para KPI cards.
    */
   async getStats(filters: PvrActiveFilters): Promise<PvrReportResponse> {
      const { data } = await api.get<PvrReportResponse>(`${BASE}/stats`, {
         params: buildParams(filters),
      });
      return data;
   },

   /**
    * GET /api/pvr/filters
    * Devuelve canales y años disponibles en InformePVR.
    * (Ya no incluye cadenas — demasiado volumen en BD)
    */
   async getPvrFilters(): Promise<{ canales: string[]; años: string[] }> {
      const { data } = await api.get<{
         success: boolean;
         data: { canales: string[]; años: string[] };
      }>(`${BASE}/filters`);
      return data.data;
   },

   /**
    * Reutiliza el endpoint existente de filterRoutes para gerencias.
    * Cacheado en el backend vía metadataService.
    */
   async getGerencias(): Promise<string[]> {
      const { data } = await api.get<string[]>('/filters/gerencias');
      return Array.isArray(data) ? data : [];
   },

   /**
    * GET /filters/cadenas
    * Valores de cadena desde la tabla catálogo (basevPic), cacheado.
    */
   async getCadenas(): Promise<string[]> {
      const { data } = await api.get<string[]>('/filters/cadenas');
      return Array.isArray(data) ? data : [];
   },
};
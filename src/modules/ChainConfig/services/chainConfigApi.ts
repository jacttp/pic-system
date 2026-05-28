import api from '@/api/axios';
import type {
   ChainSkuMapping,
   ChainSkuMappingPayload,
   ChainSkuUnit,
   ChainSkuUnitPayload,
   ChainStoreConfig,
   ChainStoreConfigPayload,
   ChainConfigDiagnostics,
   ChainConfigBulkSummary,
   ChainConfigBulkType,
   ChainZ8CatalogItem,
   ChainZ8CatalogPayload,
} from '../types/chainConfigTypes';
import { normalizeChain, normalizeZ8Permission } from '../utils/chainConfigOptions';

const V2 = import.meta.env.VITE_API_V2_PATH;

function mapSkuMapping(item: any): ChainSkuMapping {
   return {
      ...item,
      nom_cadena: normalizeChain(item.nom_cadena),
   };
}

function mapZ8Item(item: any): ChainZ8CatalogItem {
   return {
      ...item,
      permiso_oc: normalizeZ8Permission(item.permiso_oc),
   };
}

export const chainConfigApi = {
   async getStoreConfigs(): Promise<ChainStoreConfig[]> {
      const { data } = await api.get(`${V2}/cpfr/config`);
      return data.data || [];
   },

   async updateStoreConfig(idCliente: string, payload: ChainStoreConfigPayload): Promise<void> {
      await api.put(`${V2}/cpfr/config/${encodeURIComponent(idCliente)}`, payload);
   },

   async getSkuUnits(): Promise<ChainSkuUnit[]> {
      const { data } = await api.get('/cpfr/units');
      return data.data || [];
   },

   async updateSkuUnit(sku: string, payload: Partial<ChainSkuUnitPayload>): Promise<void> {
      await api.patch(`/cpfr/units/${encodeURIComponent(sku)}`, payload);
   },

   async getSkuMappings(): Promise<ChainSkuMapping[]> {
      const { data } = await api.get(`${V2}/skuscadenas`);
      return (data.data || []).map(mapSkuMapping);
   },

   async createSkuMapping(payload: ChainSkuMappingPayload): Promise<void> {
      await api.post(`${V2}/skuscadenas`, {
         ...payload,
         nom_cadena: normalizeChain(payload.nom_cadena),
      });
   },

   async updateSkuMapping(id: number, payload: ChainSkuMappingPayload): Promise<void> {
      await api.put(`${V2}/skuscadenas/${id}`, {
         ...payload,
         nom_cadena: normalizeChain(payload.nom_cadena),
      });
   },

   async deleteSkuMapping(id: number): Promise<void> {
      await api.delete(`${V2}/skuscadenas/${id}`);
   },

   async getZ8Catalog(): Promise<ChainZ8CatalogItem[]> {
      const { data } = await api.get(`${V2}/chain-config/z8`);
      return (data.data || []).map(mapZ8Item);
   },

   async createZ8CatalogItem(payload: ChainZ8CatalogPayload): Promise<void> {
      await api.post(`${V2}/chain-config/z8`, {
         ...payload,
         permiso_oc: normalizeZ8Permission(payload.permiso_oc),
      });
   },

   async updateZ8CatalogItem(id: number, payload: ChainZ8CatalogPayload): Promise<void> {
      await api.put(`${V2}/chain-config/z8/${id}`, {
         ...payload,
         permiso_oc: normalizeZ8Permission(payload.permiso_oc),
      });
   },

   async deleteZ8CatalogItem(id: number): Promise<void> {
      await api.delete(`${V2}/chain-config/z8/${id}`);
   },

   async getDiagnostics(): Promise<ChainConfigDiagnostics> {
      const { data } = await api.get(`${V2}/chain-config/diagnostics`);
      return data.data;
   },

   async previewBulk(type: ChainConfigBulkType, rows: Record<string, unknown>[]): Promise<ChainConfigBulkSummary> {
      const { data } = await api.post(`${V2}/chain-config/bulk/preview`, { type, rows });
      return data.data;
   },

   async commitBulk(type: ChainConfigBulkType, rows: Record<string, unknown>[]): Promise<ChainConfigBulkSummary> {
      const { data } = await api.post(`${V2}/chain-config/bulk/commit`, { type, rows });
      return data.data;
   },
};

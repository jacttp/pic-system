import type { AllowedChain, Z8Permission } from '../utils/chainConfigOptions';

export interface ChainStoreConfig {
   id_cliente: string;
   nombre_tienda?: string;
   Jefatura?: string;
   jefatura?: string;
   dia_cadena: number;
   dia_ventas: number;
   lead_time: number;
   semanas_objetivo: number;
   semanas_sellout: number;
   factor_ajuste?: number;
   fecha_mod?: string;
}

export type ChainStoreConfigPayload = Omit<
   ChainStoreConfig,
   'id_cliente' | 'nombre_tienda' | 'Jefatura' | 'jefatura' | 'factor_ajuste' | 'fecha_mod'
>;

export interface ChainSkuUnit {
   sku_muliix: string;
   sku_nombre: string;
   unidad_inventario: number | null;
   pzas_caja: number | null;
   kg_caja: number | null;
   cajas_pallet: number | null;
   pzas_pallet: number | null;
   pzas_bolsa: number | null;
   unidad_ventau: number | null;
}

export type ChainSkuUnitPayload = Omit<ChainSkuUnit, 'sku_muliix' | 'sku_nombre'>;

export interface ChainSkuMapping {
   idskuscadenas: number;
   sku_muliix: string;
   sku_nombre: string;
   sku_cadena: string | null;
   upc_cadena: string | null;
   nom_cadena: AllowedChain;
}

export interface ChainSkuMappingPayload {
   sku_muliix: string;
   sku_cadena: string | null;
   upc_cadena: string | null;
   nom_cadena: AllowedChain;
}

export interface ChainZ8CatalogItem {
   id: number;
   id_cliente: string;
   nombre_tienda: string | null;
   Jefatura: string | null;
   Cadena: string | null;
   permiso_oc: Z8Permission;
   sku_muliix: string;
   sku_nombre: string;
   par_muliix: string | null;
   par_nombre: string | null;
   mixbase: number | null;
   mixpar: number | null;
}

export interface ChainZ8CatalogPayload {
   id_cliente: string;
   permiso_oc: Z8Permission;
   sku_muliix: string;
   par_muliix: string | null;
   mixbase: number | null;
   mixpar: number | null;
}

export interface ChainConfigDiagnostics {
   skuUnitsMissing: Array<{
      sku_muliix: string;
      sku_nombre: string;
      unidad_inventario: number | null;
      pzas_bolsa: number | null;
      pzas_caja: number | null;
   }>;
   skuMappingsIncomplete: Array<{
      idskuscadenas: number;
      nom_cadena: string;
      sku_muliix: string;
      sku_nombre: string;
      sku_cadena: string | null;
      upc_cadena: string | null;
   }>;
   duplicateUpcs: Array<{
      nom_cadena: string;
      upc_cadena: string;
      sku_count: number;
      sku_muliix_list: string;
   }>;
   storesWithoutConfig: Array<{
      id_cliente: string;
      nombre_tienda: string | null;
      Cadena: string | null;
      Jefatura: string | null;
   }>;
   z8WithoutMapping: Array<{
      id: number;
      id_cliente: string;
      nombre_tienda: string | null;
      permiso_oc: string;
      sku_muliix: string;
      sku_nombre: string;
   }>;
   z8WithMissingPair: Array<{
      id: number;
      id_cliente: string;
      nombre_tienda: string | null;
      sku_muliix: string;
      sku_nombre: string;
      par_muliix: string;
   }>;
   summary: {
      skuUnitsMissing: number;
      skuMappingsIncomplete: number;
      duplicateUpcs: number;
      storesWithoutConfig: number;
      z8WithoutMapping: number;
      z8WithMissingPair: number;
   };
}

export type ChainConfigBulkType = 'skuMappings' | 'z8Catalog';

export type ChainConfigBulkAction = 'create' | 'update' | 'error';

export interface ChainConfigBulkItem {
   rowNumber: number;
   action: ChainConfigBulkAction;
   errors: string[];
   [key: string]: string | number | null | string[];
}

export interface ChainConfigBulkSummary {
   total: number;
   valid: number;
   creates: number;
   updates: number;
   errors: number;
   items: ChainConfigBulkItem[];
}

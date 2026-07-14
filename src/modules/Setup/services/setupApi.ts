/* src/modules/Setup/services/setupApi.ts */
import api from '@/api/axios';
import type { HubConfigResponse, HubFeatureKey, ModuleColorOverrides, SystemFeatureFlag, SystemModule } from '../types/setupTypes';
import type { UiThemeCatalog } from '@/modules/Shared/design/uiTheme';

const V2 = import.meta.env.VITE_API_V2_PATH;

export default {

   /**
    * Obtiene todos los módulos del sistema (activos e inactivos)
    * Backend: SELECT * FROM SysModulesIC ORDER BY DisplayOrder ASC
    */
   async getModules(): Promise<SystemModule[]> {
      const { data } = await api.get(`${V2}/setup/modules`);
      // Ajusta según la estructura de tu respuesta (data.data, data.result, etc.)
      return data.data || data;
   },

   /**
    * Crea un nuevo módulo
    */
   async createModule(payload: Omit<SystemModule, 'ModuleId'>): Promise<SystemModule> {
      const { data } = await api.post(`${V2}/setup/modules`, payload);
      return data.data || data;
   },

   /**
    * Activa/Desactiva un módulo
    */
   async toggleModuleStatus(moduleId: number, isActive: boolean): Promise<void> {
      await api.patch(`${V2}/setup/modules/${moduleId}`, { IsActive: isActive });
   },

   /**
    * Actualiza la configuración de un módulo
    */
   async updateModule(moduleId: number, payload: Partial<SystemModule>): Promise<void> {
      await api.patch(`${V2}/setup/modules/${moduleId}`, payload);
   },

   async getModuleColorOverrides(): Promise<ModuleColorOverrides> {
      const { data } = await api.get<{ success: boolean; data: ModuleColorOverrides }>(`${V2}/setup/module-color-overrides`);
      return data.data;
   },

   async updateModuleColorOverrides(payload: ModuleColorOverrides): Promise<ModuleColorOverrides> {
      const { data } = await api.put<{ success: boolean; data: ModuleColorOverrides }>(`${V2}/setup/module-color-overrides`, payload);
      return data.data;
   },

   async getHubConfig(): Promise<HubConfigResponse> {
      const { data } = await api.get<{ success: boolean; data: HubConfigResponse }>(`${V2}/setup/hub-config`);
      return data.data;
   },

   async getFeatureFlags(): Promise<SystemFeatureFlag[]> {
      const { data } = await api.get<{ success: boolean; data: SystemFeatureFlag[] }>(`${V2}/setup/feature-flags`);
      return data.data;
   },

   async getUiThemeCatalog(): Promise<{ catalog: UiThemeCatalog; fallback: boolean }> {
      const { data } = await api.get<{ success: boolean; data: UiThemeCatalog; fallback?: boolean }>(`${V2}/setup/ui-theme-catalog`);
      return { catalog: data.data, fallback: Boolean(data.fallback) };
   },

   async updateUiThemeCatalog(payload: UiThemeCatalog): Promise<UiThemeCatalog> {
      const { data } = await api.put<{ success: boolean; data: UiThemeCatalog }>(`${V2}/setup/ui-theme-catalog`, payload);
      return data.data;
   },

   async updateFeatureFlag(featureKey: HubFeatureKey, payload: Partial<SystemFeatureFlag>): Promise<void> {
      await api.patch(`${V2}/setup/feature-flags/${encodeURIComponent(featureKey)}`, payload);
   }
};

/* src/modules/Setup/services/setupApi.ts */
import api from '@/api/axios';
import type { SystemModule } from '../types/setupTypes';

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
   }
};

import api from '@/api/axios';
import type { SystemModule } from '../types/setupTypes';

export default {

   /**
    * Obtiene todos los módulos del sistema (activos e inactivos)
    * Backend: SELECT * FROM SysModulesIC ORDER BY DisplayOrder ASC
    */
   async getModules(): Promise<SystemModule[]> {
      const { data } = await api.get('/setup/modules');
      // Ajusta según la estructura de tu respuesta (data.data, data.result, etc.)
      return data.data || data;
   },

   /**
    * Activa/Desactiva un módulo
    */
   async toggleModuleStatus(moduleId: number, isActive: boolean): Promise<void> {
      await api.patch(`/setup/modules/${moduleId}`, { IsActive: isActive });
   },

   /**
    * Actualiza la configuración de un módulo
    */
   async updateModule(moduleId: number, payload: Partial<SystemModule>): Promise<void> {
      await api.patch(`/setup/modules/${moduleId}`, payload);
   }
};

import api from '@/api/axios';
import type { SystemModule } from '../types/setupTypes';

export default {

   /**
    * Obtiene todos los módulos del sistema (activos e inactivos)
    * Backend: SELECT * FROM SysModulesIC ORDER BY DisplayOrder ASC
    */
   async getModules(): Promise<SystemModule[]> {
      const { data } = await api.get('/system/modules');
      // Ajusta según la estructura de tu respuesta (data.data, data.result, etc.)
      // Si tu API devuelve directamente el array, usa 'data'.
      // Si devuelve { success: true, data: [...] }, usa 'data.data'.
      return data.data || data;
   },

   /**
    * Activa/Desactiva un módulo
    */
   async toggleModuleStatus(moduleId: number, isActive: boolean): Promise<void> {
      await api.patch(`/system/modules/${moduleId}`, { IsActive: isActive });
   }
};

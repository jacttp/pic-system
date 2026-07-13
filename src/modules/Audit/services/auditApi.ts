/* src/modules/Audit/services/auditApi.ts */
import api from '@/api/axios';
import type { AuditResponse, CpfrExcelExportAuditDetail } from '@/types/audit';

const V2 = import.meta.env.VITE_API_V2_PATH;

export const auditApi = {
   async getLogs(limit: number = 50): Promise<AuditResponse> {
      const { data } = await api.get<AuditResponse>(`${V2}/logs?limit=${limit}`);
      return data;
   },
   async createCpfrExcelExportLog(detalles: CpfrExcelExportAuditDetail): Promise<void> {
      await api.post(`${V2}/logs`, {
         accion: 'CPFR - Descarga Excel',
         detalles: JSON.stringify(detalles)
      });
   }
};

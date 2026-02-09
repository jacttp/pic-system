/* src/modules/Audit/stores/auditStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auditApi } from '../services/auditApi';
import type { AuditLog } from '@/types/audit';

export const useAuditStore = defineStore('audit', () => {
   const logs = ref<AuditLog[]>([]);
   const isLoading = ref(false);

   async function fetchLogs(limit = 50) {
      isLoading.value = true;
      try {
         const data = await auditApi.getLogs(limit);
         if (data.success) {
            logs.value = data.data;
         }
      } catch (e) {
         console.error('Error fetching logs', e);
      } finally {
         isLoading.value = false;
      }
   }

   return { logs, isLoading, fetchLogs };
});

/* src/modules/Audit/stores/auditStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';
import type { AuditLog, AuditResponse } from '@/types/audit';

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<AuditLog[]>([]);
    const isLoading = ref(false);

    async function fetchLogs(limit = 50) {
        isLoading.value = true;
        try {
            const { data } = await api.get<AuditResponse>(`/logs?limit=${limit}`);
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
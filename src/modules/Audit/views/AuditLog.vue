<!-- src/modules/Audit/views/AuditLog.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuditStore } from '../stores/auditStore';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';

const store = useAuditStore();
const showDetailModal = ref(false);
const selectedDetail = ref('');

const columns = [
    { key: 'Nombre_Reporte', label: 'Acción / Evento', class: 'font-medium text-slate-700' },
    { key: 'Numero_empleado', label: 'Usuario' },
    { key: 'Fecha_Registro', label: 'Fecha', class: 'font-mono text-xs text-slate-500' },
    { key: 'Detalles', label: 'Detalle', class: 'text-right' }
];

onMounted(() => store.fetchLogs());

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-MX');
};

const openDetail = (detail: string) => {
    selectedDetail.value = detail || 'Sin detalles adicionales.';
    showDetailModal.value = true;
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-shield-cat text-brand-500"></i> Registro de Auditoría
                </h1>
                <p class="text-slate-500 text-sm mt-1">Historial de seguridad y movimientos del sistema.</p>
            </div>
            <button @click="store.fetchLogs()" class="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-2">
                <i class="fa-solid fa-rotate-right" :class="{'fa-spin': store.isLoading}"></i> Actualizar
            </button>
        </div>

        <BaseTable :columns="columns" :data="store.logs" :loading="store.isLoading">
            <!-- Usuario con Icono -->
            <template #cell-Numero_empleado="{ value }">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <span class="text-slate-600 text-sm">{{ value }}</span>
                </div>
            </template>

            <!-- Fecha Formateada -->
            <template #cell-Fecha_Registro="{ value }">
                {{ formatDate(String(value)) }}
            </template>

            <!-- Botón Ver Detalle -->
            <template #cell-Detalles="{ value }">
                <button 
                    v-if="value"
                    @click="openDetail(String(value))" 
                    class="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-100 hover:bg-brand-100 transition-colors"
                >
                    Ver JSON
                </button>
                <span v-else class="text-xs text-slate-300 italic">N/A</span>
            </template>
        </BaseTable>

        <!-- Modal de Detalle Técnico -->
        <ModalDialog v-model="showDetailModal" title="Detalle Técnico del Evento" size="lg">
            <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">{{ selectedDetail }}</pre>
            </div>
            <p class="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <i class="fa-solid fa-lock"></i> Registro inmutable almacenado en servidor.
            </p>
        </ModalDialog>
    </div>
</template>
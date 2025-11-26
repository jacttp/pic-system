<!-- src/modules/Shared/components/BaseTable.vue -->
<script setup lang="ts">
export interface Column {
    key: string;
    label: string;
    class?: string; // Clases extra para la celda (ej: text-right)
}

defineProps<{
    columns: Column[];
    data: any[];
    loading?: boolean;
    // Props de paginación
    currentPage?: number;
    totalPages?: number;
    totalRecords?: number;
    showActions?: boolean; // Mostrar columna de botones editar/borrar
}>();

const emit = defineEmits(['edit', 'delete', 'page-change']);
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        <!-- Estado de Carga -->
        <div v-if="loading" class="p-12 text-center">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-500 mb-4"></i>
            <p class="text-slate-500">Cargando datos...</p>
        </div>

        <!-- Estado Vacío -->
        <div v-else-if="!loading && data.length === 0" class="p-12 text-center">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-3xl">
                <i class="fa-regular fa-folder-open"></i>
            </div>
            <h3 class="text-lg font-medium text-slate-900">No hay registros</h3>
            <p class="text-slate-500 text-sm">No se encontraron datos para mostrar.</p>
        </div>

        <!-- Tabla -->
        <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wide">
                        <th 
                            v-for="col in columns" 
                            :key="col.key" 
                            class="px-6 py-3 whitespace-nowrap"
                            :class="col.class"
                        >
                            {{ col.label }}
                        </th>
                        <th v-if="showActions" class="px-6 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    <tr 
                        v-for="(item, index) in data" 
                        :key="index" 
                        class="hover:bg-slate-50/80 transition-colors group"
                    >
                        <td 
                            v-for="col in columns" 
                            :key="col.key" 
                            class="px-6 py-4 whitespace-nowrap"
                            :class="col.class"
                        >
                            <!-- Slot dinámico: permite personalizar el contenido de cada celda -->
                            <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                                {{ item[col.key] }}
                            </slot>
                        </td>
                        
                        <!-- Botones de Acción -->
                        <td v-if="showActions" class="px-6 py-4 text-right whitespace-nowrap">
                            <div class="flex justify-end gap-2">
                                <button 
                                    @click="$emit('edit', item)" 
                                    class="text-slate-400 hover:text-brand-600 p-1 transition-colors" 
                                    title="Editar"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button 
                                    @click="$emit('delete', item)" 
                                    class="text-slate-400 hover:text-red-500 p-1 transition-colors" 
                                    title="Eliminar"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Paginación (Footer) -->
        <div v-if="!loading && totalPages && totalPages > 1" class="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span class="text-xs text-slate-500">
                Total: <span class="font-medium text-slate-700">{{ totalRecords }}</span> registros
            </span>
            
            <div class="flex gap-1">
                <button 
                    :disabled="currentPage === 1"
                    @click="$emit('page-change', (currentPage || 1) - 1)"
                    class="px-3 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Anterior
                </button>
                
                <span class="px-3 py-1 text-xs font-medium text-slate-600 flex items-center">
                    Pág {{ currentPage }} de {{ totalPages }}
                </span>

                <button 
                    :disabled="currentPage === totalPages"
                    @click="$emit('page-change', (currentPage || 1) + 1)"
                    class="px-3 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
        </div>
    </div>
</template>
<!-- src/modules/Shared/components/BaseTable.vue -->
<script setup lang="ts">
export interface Column {
    key: string;
    label: string;
    class?: string;
}

defineProps<{
    columns: Column[];
    data: any[];
    loading?: boolean;
    currentPage?: number;
    totalPages?: number;
    totalRecords?: number;
    showActions?: boolean;
}>();

const emit = defineEmits(['edit', 'delete', 'page-change']);
</script>

<template>
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden flex flex-col">

        <!-- Loading skeleton -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-3">
            <div class="w-9 h-9 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin"></div>
            <p class="text-sm text-slate-400 font-medium">Cargando datos…</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading && data.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <div class="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
                <i class="fa-regular fa-folder-open text-2xl"></i>
            </div>
            <div class="text-center">
                <p class="text-sm font-semibold text-slate-600">Sin resultados</p>
                <p class="text-xs text-slate-400 mt-0.5">No se encontraron registros con los filtros actuales.</p>
            </div>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-800">
                        <th
                            v-for="col in columns"
                            :key="col.key"
                            class="px-5 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap first:rounded-none last:rounded-none"
                            :class="col.class"
                        >
                            {{ col.label }}
                        </th>
                        <th v-if="showActions" class="px-5 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(item, index) in data"
                        :key="index"
                        class="group border-b border-slate-100 last:border-0 hover:bg-emerald-50/40 transition-colors duration-100 cursor-default"
                    >
                        <td
                            v-for="col in columns"
                            :key="col.key"
                            class="px-5 py-3.5 text-sm text-slate-700 whitespace-nowrap"
                            :class="col.class"
                        >
                            <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                                {{ item[col.key] }}
                            </slot>
                        </td>

                        <!-- Action buttons -->
                        <td v-if="showActions" class="px-5 py-3.5 text-right whitespace-nowrap">
                            <div class="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                    @click="$emit('edit', item)"
                                    title="Ver / Editar"
                                    class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 px-2.5 py-1.5 rounded-lg transition-all"
                                >
                                    <i class="fa-solid fa-pen-to-square text-[11px]"></i>
                                    Editar
                                </button>
                                <button
                                    @click="$emit('delete', item)"
                                    title="Eliminar"
                                    class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-all"
                                >
                                    <i class="fa-solid fa-trash-can text-[11px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination Footer -->
        <div
            v-if="!loading && totalPages && totalPages > 1"
            class="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60"
        >
            <span class="text-xs text-slate-500">
                <span class="font-semibold text-slate-700 tabular-nums">{{ totalRecords?.toLocaleString() }}</span> registros totales
            </span>

            <div class="flex items-center gap-1.5">
                <button
                    :disabled="currentPage === 1"
                    @click="$emit('page-change', (currentPage || 1) - 1)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    Anterior
                </button>

                <span class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg tabular-nums">
                    {{ currentPage }} / {{ totalPages }}
                </span>

                <button
                    :disabled="currentPage === totalPages"
                    @click="$emit('page-change', (currentPage || 1) + 1)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    Siguiente
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </div>
    </div>
</template>
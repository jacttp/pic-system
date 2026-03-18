<!-- src/modules/StockAnalytics/components/StockFilterBar.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';
import FilterDropdown from '../../PIC/components/FilterDropdown.vue';

const store = useStockAnalyticsStore();

// ── Panel collapse ─────────────────────────────────────────────────────────
const isCollapsed    = ref(true);
const overflowVisible = ref(false);

watch(isCollapsed, (newVal) => {
    if (newVal) {
        overflowVisible.value = false;
    } else {
        setTimeout(() => { overflowVisible.value = true; }, 350);
    }
});

// ── Filtros locales (se confirman al hacer Aplicar) ───────────────────────
const localYear      = ref(store.activeFilters.year);
const localStartWeek = ref(store.activeFilters.startWeek);
const localEndWeek   = ref(store.activeFilters.endWeek);
const localGerencias = ref<string[]>([...(store.activeFilters.filters?.Gerencia as string[] ?? [])]);
const localMarcas    = ref<string[]>([...(store.activeFilters.filters?.Marca    as string[] ?? [])]);
const localSKUs      = ref<string[]>([...(store.activeFilters.filters?.SKU_NOMBRE as string[] ?? [])]);

// ── SKU search: se llama al abrir el dropdown de SKU ──────────────────────
async function onSKUOpen() {
    if (!store.filterOptions.skus.length) {
        await store.searchSKUs('');
    }
}

// ── Toast ─────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | null;
const toast = ref<{ type: ToastType; message: string; detail?: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(type: ToastType, message: string, detail?: string) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = { type, message, detail };
    toastTimer = setTimeout(() => { toast.value = null; }, 4500);
}

// ── Aplicar filtros ────────────────────────────────────────────────────────
async function applyFilters() {
    isCollapsed.value = true;
    store.applyFilters({
        year:      localYear.value,
        startWeek: localStartWeek.value,
        endWeek:   localEndWeek.value,
        filters: {
            Gerencia:   localGerencias.value,
            Marca:      localMarcas.value,
            SKU_NOMBRE: localSKUs.value,
        },
    });
    showToast('success', 'Filtros aplicados', 'El dashboard se ha actualizado con los parámetros seleccionados.');
}

// ── Resetear filtros ──────────────────────────────────────────────────────
function reset() {
    store.resetFilters();
    localYear.value      = store.activeFilters.year;
    localStartWeek.value = store.activeFilters.startWeek;
    localEndWeek.value   = store.activeFilters.endWeek;
    localGerencias.value = [];
    localMarcas.value    = [];
    localSKUs.value      = [];
}

const hasActive = () =>
    localGerencias.value.length > 0 ||
    localMarcas.value.length > 0 ||
    localSKUs.value.length > 0;
</script>

<template>
    <div class="relative z-40 bg-white border-b border-slate-200 shadow-sm transition-all duration-300 ease-in-out">

        <!-- TOAST NOTIFICATION -->
        <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-95"
        >
            <div
                v-if="toast"
                class="fixed bottom-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-xl border max-w-sm w-full"
                :class="toast.type === 'success'
                    ? 'bg-white border-brand-200 shadow-brand-100'
                    : 'bg-white border-rose-200 shadow-rose-100'"
            >
                <div
                    class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                    :class="toast.type === 'success' ? 'bg-brand-50' : 'bg-rose-50'"
                >
                    <i
                        class="fa-solid text-sm"
                        :class="toast.type === 'success' ? 'fa-circle-check text-brand-600' : 'fa-circle-xmark text-rose-500'"
                    ></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold" :class="toast.type === 'success' ? 'text-brand-700' : 'text-rose-700'">
                        {{ toast.message }}
                    </p>
                    <p v-if="toast.detail" class="text-xs text-slate-500 mt-0.5 leading-snug">{{ toast.detail }}</p>
                </div>
                <button @click="toast = null" class="shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>
        </Transition>

        <!-- PANEL COLAPSABLE -->
        <div
            class="transition-all duration-300 ease-in-out"
            :class="[
                isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[600px] opacity-100',
                overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden'
            ]"
        >
            <div class="p-6">

                <!-- Header del panel -->
                <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                    <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <div class="p-1.5 bg-brand-50 rounded text-brand-600">
                            <i class="fa-solid fa-sliders"></i>
                        </div>
                        Parámetros de Análisis
                    </h2>
                    <div class="flex gap-3">
                        <button
                            v-if="hasActive()"
                            @click="reset"
                            class="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                            <i class="fa-solid fa-rotate-left"></i> Limpiar Filtros
                        </button>
                        <button
                            @click="applyFilters"
                            :disabled="store.isLoadingData"
                            class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        >
                            <i v-if="store.isLoadingData" class="fa-solid fa-circle-notch fa-spin"></i>
                            <span v-else class="flex items-center gap-2">
                                <i class="fa-solid fa-bolt"></i> APLICAR
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Grid de filtros -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">

                    <!-- Columna 1: Periodo -->
                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-regular fa-calendar mr-1"></i> Periodo
                        </h3>

                        <!-- Año -->
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                Año
                            </label>
                            <input
                                v-model.number="localYear"
                                type="number"
                                min="2020"
                                :max="new Date().getFullYear()"
                                class="w-full h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700
                                       hover:border-brand-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none transition shadow-sm"
                            />
                        </div>

                        <!-- Semanas -->
                        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                            <label class="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Rango de Semanas</label>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Semana Ini</label>
                                    <input
                                        v-model.number="localStartWeek"
                                        type="number" min="1" max="52"
                                        class="w-full h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700
                                               hover:border-brand-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Semana Fin</label>
                                    <input
                                        v-model.number="localEndWeek"
                                        type="number" min="1" max="52"
                                        class="w-full h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700
                                               hover:border-brand-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Columna 2: Comercial -->
                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-briefcase mr-1"></i> Comercial
                        </h3>
                        <FilterDropdown
                            label="Gerencia"
                            :options="store.filterOptions.gerencias"
                            v-model="localGerencias"
                        />
                    </div>

                    <!-- Columna 3: Producto -->
                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-box-open mr-1"></i> Producto
                        </h3>
                        <FilterDropdown
                            label="Marca"
                            :options="store.filterOptions.marcas"
                            v-model="localMarcas"
                        />
                        <FilterDropdown
                            label="SKU"
                            :options="store.filterOptions.skus"
                            v-model="localSKUs"
                            placeholder="Buscar SKU..."
                            @update:modelValue="() => {}"
                        />
                        <p
                            v-if="!store.filterOptions.skus.length"
                            class="text-[10px] text-slate-400 italic ml-1 -mt-2"
                        >
                            <button
                                type="button"
                                class="underline hover:text-brand-600 transition-colors"
                                @click="onSKUOpen"
                            >Cargar SKUs disponibles</button>
                        </p>
                    </div>

                </div>
            </div>
        </div>

        <!-- Botón toggle (pill en la parte inferior) -->
        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50">
            <button
                @click="isCollapsed = !isCollapsed"
                class="flex items-center gap-2 px-6 py-1.5 rounded-b-xl shadow-md border-x border-b border-t-0 transition-all duration-300 group"
                :class="[
                    isCollapsed
                        ? 'bg-brand-600 border-brand-700 text-white hover:bg-brand-700 hover:pt-3'
                        : 'bg-white border-slate-200 text-slate-300 hover:text-brand-600 hover:bg-slate-50'
                ]"
                :title="isCollapsed ? 'Mostrar Filtros' : 'Ocultar Filtros'"
            >
                <i
                    class="fa-solid transition-transform duration-300"
                    :class="isCollapsed ? 'fa-filter' : 'fa-chevron-up group-hover:-translate-y-0.5'"
                ></i>
                <span v-if="isCollapsed" class="text-xs font-bold tracking-wide uppercase">Filtros</span>
            </button>
        </div>

    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import FilterDropdown from './FilterDropdown.vue';
// 1. IMPORTAMOS EL MODAL
import PicClientModal from './modals/PicClientModal.vue'; 

const store = usePicFilterStore();
const isCollapsed = ref(false); 
const overflowVisible = ref(true); 

// 2. ESTADO DEL MODAL
const showClientModal = ref(false); 

// 3. TEXTO DINÁMICO DEL BOTÓN DE CLIENTES
const clientButtonText = computed(() => {
    const count = store.selectedClients.size;
    if (count === 0) return 'Buscar Cliente...';
    if (count === 1) {
        // Obtenemos el nombre del primer valor del Map
        return store.selectedClients.values().next().value; 
    }
    return `${count} Clientes Seleccionados`;
});

onMounted(() => {
    store.initFilters();
});

const handleUpdate = async () => {
    await store.generateReport();
};

watch(isCollapsed, (newVal) => {
    if (newVal) {
        overflowVisible.value = false; 
    } else {
        setTimeout(() => {
            overflowVisible.value = true; 
        }, 350); 
    }
});
</script>

<template>
    <div class="relative z-40 bg-white border-b border-slate-200 shadow-sm transition-all duration-300 ease-in-out">
        
        <PicClientModal v-model="showClientModal" />

        <div 
            class="transition-all duration-300 ease-in-out"
            :class="[
                isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[800px] opacity-100',
                overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden'
            ]"
        >
            <div class="p-6">
                <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                    <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <div class="p-1.5 bg-brand-50 rounded text-brand-600">
                            <i class="fa-solid fa-sliders"></i>
                        </div>
                        Parámetros de Reporte
                    </h2>
                    <div class="flex gap-3">
                        <button class="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                            <i class="fa-solid fa-rotate-left"></i> Limpiar Filtros
                        </button>
                        
                        <button 
                            @click="handleUpdate" 
                            :disabled="store.isGenerating"
                            class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <span v-else class="flex items-center gap-2">
                                <i class="fa-solid fa-bolt"></i> GENERAR AHORA
                            </span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    
                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-briefcase mr-1"></i> Comercial
                        </h3>
                        <FilterDropdown label="Canal" :options="store.options.canales" v-model="store.selected.canal" />
                        <FilterDropdown label="Gerencia" :options="store.options.gerencias" v-model="store.selected.Gerencia" @change="store.handleGerenciaChange" />
                        <FilterDropdown label="Jefatura" :options="store.depOptions.jefaturas" v-model="store.selected.Jefatura" :disabled="store.depOptions.jefaturas.length === 0" @change="store.handleJefaturaChange" />
                        <FilterDropdown label="Ruta" :options="store.depOptions.rutas" v-model="store.selected.Ruta" :disabled="store.depOptions.rutas.length === 0" />
                    </div>

                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-users mr-1"></i> Clientes
                        </h3>
                        
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                Selección Individual
                            </label>
                            <button 
                                @click="showClientModal = true"
                                class="w-full text-left bg-white border border-slate-200 rounded-lg px-3 h-[38px] flex justify-between items-center text-xs hover:border-brand-400 hover:shadow-md group transition-all"
                                :class="{'border-brand-500 ring-1 ring-brand-100': store.selectedClients.size > 0}"
                            >
                                <span 
                                    class="font-medium truncate mr-2" 
                                    :class="store.selectedClients.size > 0 ? 'text-brand-700' : 'text-slate-600 group-hover:text-brand-700'"
                                >
                                    <i class="fa-solid fa-magnifying-glass mr-1.5 opacity-50"></i>
                                    {{ clientButtonText }}
                                </span>
                                <i 
                                    class="fa-solid text-[10px]"
                                    :class="store.selectedClients.size > 0 ? 'fa-check text-brand-600' : 'fa-arrow-up-right-from-square text-slate-300 group-hover:text-brand-500'"
                                ></i>
                            </button>
                        </div>
                        <FilterDropdown label="Formato Cliente" :options="store.options.formatosCliente" v-model="store.selected.FormatoCliente" />
                    </div>

                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-box-open mr-1"></i> Producto
                        </h3>
                        <FilterDropdown label="Marca" :options="store.options.marcas" v-model="store.selected.Marca" @change="store.handleMarcaChange" />
                        <FilterDropdown label="Grupo" :options="store.depOptions.grupos" v-model="store.selected.grupo" :disabled="store.depOptions.grupos.length === 0" @change="store.handleGrupoChange" />
                        <FilterDropdown label="Categoría" :options="store.depOptions.categorias" v-model="store.selected.Categorias" :disabled="store.depOptions.categorias.length === 0" />
                        <FilterDropdown label="SKU" :options="store.depOptions.skus" v-model="store.selected.SKU" :disabled="store.depOptions.skus.length === 0" placeholder="Buscar SKU..." />
                    </div>

                    <div class="space-y-6">
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-gears mr-1"></i> Configuración
                            </h3>
                            <FilterDropdown label="Transacción" :options="store.options.transacciones" v-model="store.selected.Transaccion" />
                        </div>

                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-regular fa-calendar mr-1"></i> Periodo
                            </h3>
                            <FilterDropdown label="Año(s)" :options="store.options.anios" v-model="store.selected.Anio" />
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mes Ini</label>
                                    <div class="relative">
                                        <select v-model="store.selected.MesInicial" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                            <option v-for="i in 12" :key="i" :value="String(i)">{{ i }}</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mes Fin</label>
                                    <div class="relative">
                                        <select v-model="store.selected.MesFinal" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                            <option v-for="i in 12" :key="i" :value="String(i)">{{ i }}</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

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
                <span v-if="isCollapsed" class="text-xs font-bold tracking-wide uppercase">
                    Filtros
                </span>
            </button>
        </div>

    </div>
</template>
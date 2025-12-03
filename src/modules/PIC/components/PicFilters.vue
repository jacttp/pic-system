<script setup lang="ts">
import { onMounted } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import FilterDropdown from './FilterDropdown.vue';

const store = usePicFilterStore();

onMounted(() => {
    store.initFilters();
});

// Acción para recargar los datos del reporte
const handleUpdate = async () => {
    await store.generateReport();
};
</script>

<template>
    <div class="bg-white border-b border-slate-200 p-4 shadow-sm z-20 relative">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <i class="fa-solid fa-filter text-brand-500"></i> Configuración del Reporte
            </h2>
            <div class="flex gap-2">
                <button class="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                    <i class="fa-solid fa-rotate-left"></i> Limpiar
                </button>
                
                <button 
                    @click="handleUpdate" 
                    :disabled="store.isGenerating"
                    class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                    <span v-else class="flex items-center gap-2">
                        <i class="fa-solid fa-play"></i> Actualizar
                    </span>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div class="space-y-3">
                <FilterDropdown label="Canal" :options="store.options.canales" v-model="store.selected.canal" />
                <FilterDropdown 
                    label="Gerencia" 
                    :options="store.options.gerencias" 
                    v-model="store.selected.Gerencia" 
                    @change="store.handleGerenciaChange"
                />
                <FilterDropdown 
                    label="Jefatura" 
                    :options="store.depOptions.jefaturas" 
                    v-model="store.selected.Jefatura" 
                    :disabled="store.depOptions.jefaturas.length === 0"
                    @change="store.handleJefaturaChange"
                />
                <FilterDropdown 
                    label="Ruta" 
                    :options="store.depOptions.rutas" 
                    v-model="store.selected.Ruta" 
                    :disabled="store.depOptions.rutas.length === 0"
                />
            </div>

            <div class="space-y-3">
                <FilterDropdown 
                    label="Marca" 
                    :options="store.options.marcas" 
                    v-model="store.selected.Marca" 
                    @change="store.handleMarcaChange"
                />
                <FilterDropdown 
                    label="Grupo" 
                    :options="store.depOptions.grupos" 
                    v-model="store.selected.grupo" 
                    :disabled="store.depOptions.grupos.length === 0"
                    @change="store.handleGrupoChange"
                />
                <FilterDropdown 
                    label="Categoría" 
                    :options="store.depOptions.categorias" 
                    v-model="store.selected.Categorias" 
                    :disabled="store.depOptions.categorias.length === 0"
                />
                <FilterDropdown 
                    label="SKU" 
                    :options="store.depOptions.skus" 
                    v-model="store.selected.SKU" 
                    :disabled="store.depOptions.skus.length === 0"
                />
            </div>

            <div class="space-y-3">
                <FilterDropdown label="Año" :options="store.options.anios" v-model="store.selected.Anio" />
                
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mes Ini</label>
                        <select v-model="store.selected.MesInicial" class="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                            <option v-for="i in 12" :key="i" :value="String(i)">{{ i }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mes Fin</label>
                        <select v-model="store.selected.MesFinal" class="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                            <option v-for="i in 12" :key="i" :value="String(i)">{{ i }}</option>
                        </select>
                    </div>
                </div>

                <FilterDropdown label="Transacción" :options="store.options.transacciones" v-model="store.selected.Transaccion" />
                <FilterDropdown label="Formato Cliente" :options="store.options.formatosCliente" v-model="store.selected.FormatoCliente" />
            </div>

        </div>
    </div>
</template>
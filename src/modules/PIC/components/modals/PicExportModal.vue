<script setup lang="ts">
import { ref } from 'vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'; 

const props = defineProps<{ 
    modelValue: boolean; 
}>();

const emit = defineEmits(['update:modelValue', 'export']);

const config = ref({
    title: 'Reporte de Desempeño y Proyecciones - PIC',
    format: 'a4',
    margin: 'estandar', // estandar = 12, reducido = 6, ninguno = 0
    orientation: 'landscape',
    showDate: true,
    showPageNumbers: true
});

const close = () => {
    emit('update:modelValue', false);
};

const handleExport = () => {
    emit('export', { ...config.value });
    close();
};
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        title="Opciones de Exportación PDF" 
        size="md"
        @close="close"
    >
        <div class="space-y-5 p-2 text-sm text-slate-700">
            <!-- Título Principal -->
            <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                    Título del Reporte
                </label>
                <div class="relative">
                    <i class="fa-solid fa-heading absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input 
                        v-model="config.title" 
                        type="text" 
                        placeholder="Ej: Reporte Operativo Mensual"
                        class="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <!-- Tamaño -->
                <div>
                    <label class="block font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                        Tamaño de Hoja
                    </label>
                    <div class="relative">
                        <select v-model="config.format" class="w-full border border-slate-300 rounded-xl pl-3 pr-8 py-2.5 text-sm bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none appearance-none cursor-pointer shadow-sm">
                            <option value="a4">A4 (Estándar)</option>
                            <option value="letter">Carta (Letter)</option>
                            <option value="legal">Oficio (Legal)</option>
                        </select>
                        <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                    </div>
                </div>

                <!-- Orientación -->
                <div>
                    <label class="block font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                        Orientación
                    </label>
                    <div class="relative">
                        <select v-model="config.orientation" class="w-full border border-slate-300 rounded-xl pl-3 pr-8 py-2.5 text-sm bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none appearance-none cursor-pointer shadow-sm">
                            <option value="landscape">Horizontal (Ideal)</option>
                            <option value="portrait">Vertical</option>
                        </select>
                        <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                    </div>
                </div>
            </div>

            <!-- Márgenes -->
            <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                    Márgenes Laterales
                </label>
                <div class="relative">
                    <select v-model="config.margin" class="w-full border border-slate-300 rounded-xl pl-3 pr-8 py-2.5 text-sm bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none appearance-none cursor-pointer shadow-sm">
                        <option value="estandar">Amplios (12mm) - Más elegante</option>
                        <option value="reducido">Reducidos (6mm) - Más contenido</option>
                        <option value="ninguno">Sin Márgenes (0mm) - Borde a borde</option>
                    </select>
                    <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                </div>
            </div>

            <!-- Ajustes visuales -->
            <div class="space-y-3 mt-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 shadow-inner">
                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Insignias del Documento</h4>
                
                <label class="flex items-center gap-3 cursor-pointer group">
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" v-model="config.showDate" class="peer sr-only">
                        <div class="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-brand-500 peer-checked:border-brand-500 transition-colors"></div>
                        <i class="fa-solid fa-check absolute text-white text-xs opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                    </div>
                    <span class="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                        Sellar con fecha de generación
                    </span>
                </label>

                <label class="flex items-center gap-3 cursor-pointer group">
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" v-model="config.showPageNumbers" class="peer sr-only">
                        <div class="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-brand-500 peer-checked:border-brand-500 transition-colors"></div>
                        <i class="fa-solid fa-check absolute text-white text-xs opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                    </div>
                    <span class="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                        Incluir números de página en el pie
                    </span>
                </label>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3 w-full pr-2">
                <button 
                    @click="close" 
                    class="px-5 py-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wide transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    @click="handleExport" 
                    class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <i class="fa-solid fa-file-pdf"></i> Imprimir Reporte
                </button>
            </div>
        </template>
    </ModalDialog>
</template>

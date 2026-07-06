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
        <div class="space-y-5 p-2 text-sm text-pic-text-main">
            <!-- Título Principal -->
            <div>
                <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                    Título del Reporte
                </label>
                <div class="relative">
                    <i class="fa-solid fa-heading absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
                    <input 
                        v-model="config.title" 
                        type="text" 
                        placeholder="Ej: Reporte Operativo Mensual"
                        class="w-full rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-9 pr-3 text-sm text-pic-text-main shadow-sm outline-none transition-all focus:border-pic-brand focus:ring-1 focus:ring-pic-brand"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <!-- Tamaño -->
                <div>
                    <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                        Tamaño de Hoja
                    </label>
                    <div class="relative">
                        <select v-model="config.format" class="w-full cursor-pointer appearance-none rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-3 pr-8 text-sm text-pic-text-main shadow-sm outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand">
                            <option value="a4">A4 (Estándar)</option>
                            <option value="letter">Carta (Letter)</option>
                            <option value="legal">Oficio (Legal)</option>
                        </select>
                        <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                    </div>
                </div>

                <!-- Orientación -->
                <div>
                    <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                        Orientación
                    </label>
                    <div class="relative">
                        <select v-model="config.orientation" class="w-full cursor-pointer appearance-none rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-3 pr-8 text-sm text-pic-text-main shadow-sm outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand">
                            <option value="landscape">Horizontal (Ideal)</option>
                            <option value="portrait">Vertical</option>
                        </select>
                        <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                    </div>
                </div>
            </div>

            <!-- Márgenes -->
            <div>
                <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                    Márgenes Laterales
                </label>
                <div class="relative">
                    <select v-model="config.margin" class="w-full cursor-pointer appearance-none rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-3 pr-8 text-sm text-pic-text-main shadow-sm outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand">
                        <option value="estandar">Amplios (12mm) - Más elegante</option>
                        <option value="reducido">Reducidos (6mm) - Más contenido</option>
                        <option value="ninguno">Sin Márgenes (0mm) - Borde a borde</option>
                    </select>
                    <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                </div>
            </div>

            <!-- Ajustes visuales -->
            <div class="mt-4 space-y-3 rounded-xl border border-pic-border bg-pic-muted-surface/80 p-4 shadow-inner">
                <h4 class="mb-1 text-[10px] font-bold uppercase tracking-widest text-pic-text-muted">Insignias del Documento</h4>
                
                <label class="group flex cursor-pointer items-center gap-3">
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" v-model="config.showDate" class="peer sr-only">
                        <div class="h-5 w-5 rounded border-2 border-pic-border transition-colors peer-checked:border-pic-brand peer-checked:bg-pic-brand"></div>
                        <i class="fa-solid fa-check absolute text-white text-xs opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                    </div>
                    <span class="text-sm font-medium text-pic-text-muted transition-colors group-hover:text-pic-text-main">
                        Sellar con fecha de generación
                    </span>
                </label>

                <label class="group flex cursor-pointer items-center gap-3">
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" v-model="config.showPageNumbers" class="peer sr-only">
                        <div class="h-5 w-5 rounded border-2 border-pic-border transition-colors peer-checked:border-pic-brand peer-checked:bg-pic-brand"></div>
                        <i class="fa-solid fa-check absolute text-white text-xs opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                    </div>
                    <span class="text-sm font-medium text-pic-text-muted transition-colors group-hover:text-pic-text-main">
                        Incluir números de página en el pie
                    </span>
                </label>
            </div>
        </div>

        <template #footer>
            <div class="flex w-full justify-end gap-3 pr-2">
                <button 
                    @click="close" 
                    class="rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-pic-text-muted transition-colors hover:bg-pic-muted-surface hover:text-pic-text-main"
                >
                    Cancelar
                </button>
                <button 
                    @click="handleExport" 
                    class="flex items-center gap-2 rounded-xl bg-pic-brand px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-pic-brand/20 transition-all hover:bg-pic-brand/90 active:scale-95"
                >
                    <i class="fa-solid fa-file-pdf"></i> Imprimir Reporte
                </button>
            </div>
        </template>
    </ModalDialog>
</template>

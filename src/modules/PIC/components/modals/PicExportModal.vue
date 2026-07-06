<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PicPdfExportConfig, PicPrintSectionKey } from '../../types/picTypes';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'export', value: PicPdfExportConfig): void;
    (e: 'preview-change', value: PicPdfExportConfig | null): void;
}>();

type PanelTab = 'document' | 'content' | 'presentation';

const sectionGroups: Array<{
    title: string;
    description: string;
    items: Array<{ key: PicPrintSectionKey; label: string; icon: string }>;
}> = [
    {
        title: 'Resumen',
        description: 'Elementos ejecutivos del inicio del reporte.',
        items: [
            { key: 'executiveSummary', label: 'Resumen ejecutivo IA', icon: 'fa-wand-magic-sparkles' },
            { key: 'kpis', label: 'KPIs principales', icon: 'fa-gauge-high' },
            { key: 'aiInsights', label: 'Insights generados por IA', icon: 'fa-lightbulb' }
        ]
    },
    {
        title: 'Indicadores base',
        description: 'Graficas y tablas de venta, volumen y precio.',
        items: [
            { key: 'kgCharts', label: 'Graficas de volumen KG', icon: 'fa-chart-column' },
            { key: 'kgTable', label: 'Tabla detalle KG', icon: 'fa-table' },
            { key: 'salesCharts', label: 'Graficas de facturacion', icon: 'fa-chart-line' },
            { key: 'salesTable', label: 'Tabla detalle facturacion', icon: 'fa-table-list' },
            { key: 'averageCharts', label: 'Graficas precio promedio', icon: 'fa-chart-simple' },
            { key: 'averageTable', label: 'Tabla precio promedio', icon: 'fa-table-cells' }
        ]
    },
    {
        title: 'Anexo operativo',
        description: 'Desglose bajo demanda, solo con tablas ya cargadas.',
        items: [
            { key: 'operationalBreakdown', label: 'Desglose operativo', icon: 'fa-layer-group' }
        ]
    }
];

const allSectionKeys = sectionGroups.flatMap(group => group.items.map(item => item.key));

const createDefaultConfig = (): PicPdfExportConfig => ({
    title: 'Reporte de Venta - PIC',
    format: 'letter',
    margin: 'reducido',
    orientation: 'portrait',
    showTitle: true,
    showDate: true,
    showPageNumbers: false,
    grayscale: false,
    fontScale: 'normal',
    spacing: 'normal',
    spacingPercent: 0,
    blockSpacing: {},
    pageBreakBefore: {},
    avoidPageBreaks: true,
    cleanControls: true,
    sections: {
        executiveSummary: true,
        kpis: true,
        kgCharts: true,
        kgTable: true,
        salesCharts: true,
        salesTable: true,
        averageCharts: true,
        averageTable: true,
        operationalBreakdown: true,
        aiInsights: true
    }
});

const activeTab = ref<PanelTab>('document');
const config = ref<PicPdfExportConfig>(createDefaultConfig());

const selectedSectionCount = computed(() => allSectionKeys.filter(key => config.value.sections[key]).length);
const hasPrintableContent = computed(() => selectedSectionCount.value > 0);

const fontScaleLabel = computed(() => {
    if (config.value.fontScale === 'large') return 'Grande';
    if (config.value.fontScale === 'xlarge') return 'Extra grande';
    return 'Normal';
});

const spacingLabel = computed(() => {
    if (config.value.spacingPercent > 0) return `+${config.value.spacingPercent}%`;
    if (config.value.spacingPercent < 0) return `${config.value.spacingPercent}%`;
    return 'Base';
});

const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'document', label: 'Documento', icon: 'fa-file-lines' },
    { key: 'content', label: 'Contenido', icon: 'fa-list-check' },
    { key: 'presentation', label: 'Presentacion', icon: 'fa-eye' }
];

const emitPreview = () => {
    emit('preview-change', props.modelValue ? cloneConfig(config.value) : null);
};

const cloneConfig = (value: PicPdfExportConfig): PicPdfExportConfig => ({
    ...value,
    sections: { ...value.sections },
    blockSpacing: { ...value.blockSpacing },
    pageBreakBefore: { ...value.pageBreakBefore }
});

watch(
    () => props.modelValue,
    isOpen => {
        if (isOpen) {
            activeTab.value = 'document';
            emitPreview();
            return;
        }

        emit('preview-change', null);
    }
);

watch(config, emitPreview, { deep: true });

const close = () => {
    emit('update:modelValue', false);
    emit('preview-change', null);
};

const setAllSections = (value: boolean) => {
    allSectionKeys.forEach(key => {
        config.value.sections[key] = value;
    });
};

const handleExport = () => {
    if (!hasPrintableContent.value) return;
    emit('export', cloneConfig(config.value));
    close();
};

const replaceConfig = (value: PicPdfExportConfig) => {
    config.value = cloneConfig(value);
};

defineExpose({
    replaceConfig
});
</script>

<template>
    <aside
        v-if="modelValue"
        class="pic-print-panel flex max-h-[calc(100vh-140px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-pic-border bg-pic-surface text-sm text-pic-text-main shadow-xl shadow-slate-900/10"
    >
        <header class="shrink-0 border-b border-pic-border bg-pic-muted-surface/70 px-4 py-3">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-pic-text-muted">Vista de impresion</p>
                    <h3 class="mt-1 truncate text-base font-black text-pic-text-main">Configurar PDF</h3>
                </div>
                <button
                    type="button"
                    class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-pic-text-muted transition hover:bg-pic-surface hover:text-pic-text-main"
                    title="Cerrar panel de impresion"
                    @click="close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-pic-surface p-1">
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    type="button"
                    class="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-black transition"
                    :class="activeTab === tab.key ? 'bg-pic-brand text-white shadow-sm' : 'text-pic-text-muted hover:bg-pic-muted-surface hover:text-pic-text-main'"
                    @click="activeTab = tab.key"
                >
                    <i class="fa-solid text-[10px]" :class="tab.icon"></i>
                    <span class="hidden 2xl:inline">{{ tab.label }}</span>
                </button>
            </div>
        </header>

        <section class="min-h-0 flex-1 overflow-y-auto p-4">
                <div v-if="activeTab === 'document'" class="space-y-5">
                    <div>
                        <div class="mb-1.5 ml-1 flex items-center justify-between gap-3">
                            <label class="block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                                Titulo del Reporte
                            </label>
                            <label class="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-pic-text-muted">
                                <input type="checkbox" v-model="config.showTitle" class="h-3.5 w-3.5 accent-pic-brand" />
                                Mostrar
                            </label>
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-heading absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
                            <input
                                v-model="config.title"
                                :disabled="!config.showTitle"
                                type="text"
                                placeholder="Ej: Reporte Operativo Mensual"
                                class="w-full rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-9 pr-3 text-sm text-pic-text-main shadow-sm outline-none transition-all focus:border-pic-brand focus:ring-1 focus:ring-pic-brand disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div class="grid gap-4">
                        <div>
                            <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                                Tamano de Hoja
                            </label>
                            <div class="relative">
                                <select v-model="config.format" class="w-full cursor-pointer appearance-none rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-3 pr-8 text-sm text-pic-text-main shadow-sm outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand">
                                    <option value="a4">A4 (Estandar)</option>
                                    <option value="letter">Carta (Letter)</option>
                                    <option value="legal">Oficio (Legal)</option>
                                </select>
                                <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                            </div>
                        </div>

                        <div>
                            <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                                Orientacion
                            </label>
                            <div class="relative">
                                <select v-model="config.orientation" class="w-full cursor-pointer appearance-none rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-3 pr-8 text-sm text-pic-text-main shadow-sm outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand">
                                    <option value="landscape">Horizontal</option>
                                    <option value="portrait">Vertical</option>
                                </select>
                                <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-wider text-pic-text-muted">
                            Margenes Laterales
                        </label>
                        <div class="relative">
                            <select v-model="config.margin" class="w-full cursor-pointer appearance-none rounded-xl border border-pic-border bg-pic-surface py-2.5 pl-3 pr-8 text-sm text-pic-text-main shadow-sm outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand">
                                <option value="estandar">Amplios (12mm)</option>
                                <option value="reducido">Reducidos (6mm)</option>
                                <option value="ninguno">Sin margenes (0mm)</option>
                            </select>
                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                        </div>
                    </div>

                    <div class="grid gap-3 rounded-xl border border-pic-border bg-pic-muted-surface/70 p-4">
                        <label class="flex cursor-pointer items-center gap-3">
                            <input type="checkbox" v-model="config.showDate" class="h-4 w-4 accent-pic-brand" />
                            <span class="font-medium text-pic-text-muted">Sellar fecha de generacion</span>
                        </label>
                        <label class="flex cursor-pointer items-center gap-3">
                            <input type="checkbox" v-model="config.showPageNumbers" class="h-4 w-4 accent-pic-brand" />
                            <span class="font-medium text-pic-text-muted">Incluir numeros de pagina</span>
                        </label>
                    </div>
                </div>

                <div v-else-if="activeTab === 'content'" class="space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h4 class="text-base font-black text-pic-text-main">Elementos del documento</h4>
                            <p class="text-xs font-medium text-pic-text-muted">{{ selectedSectionCount }} secciones seleccionadas</p>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" class="rounded-lg border border-pic-border px-3 py-2 text-xs font-bold text-pic-text-muted hover:bg-pic-muted-surface" @click="setAllSections(true)">Seleccionar todo</button>
                            <button type="button" class="rounded-lg border border-pic-border px-3 py-2 text-xs font-bold text-pic-text-muted hover:bg-pic-muted-surface" @click="setAllSections(false)">Limpiar</button>
                        </div>
                    </div>

                    <div class="grid gap-4">
                        <div
                            v-for="group in sectionGroups"
                            :key="group.title"
                            class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm"
                        >
                            <h5 class="font-bold text-pic-text-main">{{ group.title }}</h5>
                            <p class="mb-3 text-xs text-pic-text-muted">{{ group.description }}</p>
                            <div class="space-y-2">
                                <label
                                    v-for="item in group.items"
                                    :key="item.key"
                                    class="flex cursor-pointer items-center gap-3 rounded-lg border border-pic-border/80 px-3 py-2 transition hover:bg-pic-muted-surface"
                                >
                                    <input type="checkbox" v-model="config.sections[item.key]" class="h-4 w-4 accent-pic-brand" />
                                    <i class="fa-solid w-4 text-center text-pic-text-muted" :class="item.icon"></i>
                                    <span class="text-xs font-bold text-pic-text-main">{{ item.label }}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <p v-if="!hasPrintableContent" class="rounded-lg border border-pic-danger/20 bg-pic-danger/10 px-3 py-2 text-xs font-bold text-pic-danger">
                        Selecciona al menos una seccion para generar el PDF.
                    </p>
                </div>

                <div v-else-if="activeTab === 'presentation'" class="space-y-4">
                    <div class="grid gap-4">
                        <label
                            class="cursor-pointer rounded-xl border p-4 transition"
                            :class="config.grayscale ? 'border-pic-brand bg-pic-brand-soft text-pic-brand' : 'border-pic-border bg-pic-surface text-pic-text-main'"
                        >
                            <input v-model="config.grayscale" type="checkbox" class="sr-only" />
                            <i class="fa-solid fa-circle-half-stroke mb-3 text-xl"></i>
                            <p class="font-black">Escala de grises</p>
                            <p class="text-xs text-pic-text-muted">Optimiza el documento para impresion sobria.</p>
                        </label>

                        <label
                            class="cursor-pointer rounded-xl border p-4 transition"
                            :class="config.cleanControls ? 'border-pic-brand bg-pic-brand-soft text-pic-brand' : 'border-pic-border bg-pic-surface text-pic-text-main'"
                        >
                            <input v-model="config.cleanControls" type="checkbox" class="sr-only" />
                            <i class="fa-solid fa-broom mb-3 text-xl"></i>
                            <p class="font-black">Limpiar controles</p>
                            <p class="text-xs text-pic-text-muted">Oculta buscadores, badges y acciones de analisis.</p>
                        </label>

                        <div class="rounded-xl border border-pic-border bg-pic-surface p-4">
                            <i class="fa-solid fa-text-height mb-3 text-xl text-pic-brand"></i>
                            <p class="font-black text-pic-text-main">Tamano de letra</p>
                            <p class="mb-3 text-xs text-pic-text-muted">Actual: {{ fontScaleLabel }}</p>
                            <select v-model="config.fontScale" class="w-full rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2 text-xs font-bold outline-none focus:border-pic-brand">
                                <option value="normal">Normal</option>
                                <option value="large">Grande</option>
                                <option value="xlarge">Extra grande</option>
                            </select>
                        </div>

                        <div class="rounded-xl border border-pic-border bg-pic-surface p-4">
                            <i class="fa-solid fa-arrows-up-down mb-3 text-xl text-pic-brand"></i>
                            <p class="font-black text-pic-text-main">Espaciado entre elementos</p>
                            <p class="mb-3 text-xs text-pic-text-muted">Global: {{ spacingLabel }}</p>
                            <input
                                v-model.number="config.spacingPercent"
                                type="range"
                                min="-40"
                                max="120"
                                step="5"
                                class="w-full accent-pic-brand"
                            />
                            <div class="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">
                                <span>-40%</span>
                                <button type="button" class="rounded-md border border-pic-border bg-pic-muted-surface px-2 py-1 hover:text-pic-brand" @click="config.spacingPercent = 0">Reset</button>
                                <span>+120%</span>
                            </div>
                            <p class="mt-3 text-xs leading-relaxed text-pic-text-muted">
                                En vista de impresion puedes ajustar espacios individuales y forzar saltos de pagina entre bloques.
                            </p>
                        </div>

                        <label
                            class="cursor-pointer rounded-xl border p-4 transition"
                            :class="config.avoidPageBreaks ? 'border-pic-brand bg-pic-brand-soft text-pic-brand' : 'border-pic-border bg-pic-surface text-pic-text-main'"
                        >
                            <input v-model="config.avoidPageBreaks" type="checkbox" class="sr-only" />
                            <i class="fa-solid fa-scissors mb-3 text-xl"></i>
                            <p class="font-black">Evitar cortes</p>
                            <p class="text-xs text-pic-text-muted">Agrupa graficas y tablas para reducir cortes entre paginas.</p>
                        </label>
                    </div>
                </div>

            <div class="mt-5 rounded-xl border border-pic-border bg-pic-muted-surface/55 p-3">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-[11px] font-black uppercase tracking-wide text-pic-text-muted">Preview vivo</p>
                    <span class="rounded-full bg-pic-surface px-2 py-1 text-[10px] font-black text-pic-text-muted">{{ selectedSectionCount }} secciones</span>
                </div>
                <p class="mt-2 text-xs leading-relaxed text-pic-text-muted">
                    El reporte a la izquierda refleja estos cambios en tiempo real. Las lineas y cortes reales del PDF dependen del alto final de cada bloque.
                </p>
            </div>
        </section>

        <footer class="shrink-0 border-t border-pic-border bg-pic-muted-surface/70 p-4">
            <div class="flex w-full flex-col gap-3">
                <p class="text-xs font-medium text-pic-text-muted">
                    {{ selectedSectionCount }} secciones listas para impresion
                </p>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        @click="close"
                        class="rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-pic-text-muted transition-colors hover:bg-pic-muted-surface hover:text-pic-text-main"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        @click="handleExport"
                        :disabled="!hasPrintableContent"
                        class="flex items-center gap-2 rounded-xl bg-pic-brand px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-pic-brand/20 transition-all hover:bg-pic-brand/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <i class="fa-solid fa-file-pdf"></i> Imprimir Reporte
                    </button>
                </div>
            </div>
        </footer>
    </aside>
</template>

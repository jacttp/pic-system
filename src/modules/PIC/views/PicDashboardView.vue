<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import PicChat from '../components/PicChat.vue';
import PicFilters from '../components/PicFilters.vue';
import PicGrid from '../components/PicGrid.vue'; 
import ExecutiveSummaryCard from '../components/ExecutiveSummaryCard.vue';
import PicExportModal from '../components/modals/PicExportModal.vue';
// import html2canvas from 'html2canvas'; // Quitamos de aquí para evitar dependencias circulares en build
// import jsPDF from 'jspdf';
import CacheProgress from '@/modules/Shared/components/CacheProgress.vue';

const store = usePicFilterStore();
const isReportActive = ref(false);
const reportIsActive = computed(() => isReportActive.value || store.hasGeneratedReport || store.reportData.length > 0);

const selectedYears = computed(() => [...store.selected.Anio].sort());
const currentYear = computed(() => selectedYears.value[selectedYears.value.length - 1] || String(new Date().getFullYear()));
const previousYear = computed(() => selectedYears.value.length > 1 ? selectedYears.value[selectedYears.value.length - 2] : null);

const reportUpdatedAt = computed(() => {
    return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date());
});

const compactCurrency = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
};

const compactKg = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M KG`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K KG`;
    return `${sign}${abs.toFixed(0)} KG`;
};

const mobileKpis = computed(() => {
    const current = currentYear.value;
    const previous = previousYear.value;
    const totals = store.reportData.reduce((acc, item) => {
        const year = String(item.Año ?? item['Año'] ?? item['AÃ±o'] ?? item.Anio ?? item.anio ?? '');
        if (!acc[year]) acc[year] = { sales: 0, metaKg: 0, kg: 0 };
        acc[year].sales += Number(item.TotalVentaPesos || 0);
        acc[year].metaKg += Number(item.TotalMetasKG || 0);
        acc[year].kg += Number(item.TotalVentaKG || 0);
        return acc;
    }, {} as Record<string, { sales: number; metaKg: number; kg: number }>);

    const currentSales = totals[current]?.sales || 0;
    const previousSales = previous ? totals[previous]?.sales || 0 : 0;
    const diff = currentSales - previousSales;
    const growth = previousSales ? (diff / previousSales) * 100 : 0;
    const currentKg = totals[current]?.kg || 0;
    const currentMeta = totals[current]?.metaKg || 0;
    const compliance = currentMeta ? (currentKg / currentMeta) * 100 : 0;
    const previousKg = previous ? totals[previous]?.kg || 0 : 0;
    const kgDiff = currentKg - previousKg;
    const kgGrowth = previousKg ? (kgDiff / previousKg) * 100 : 0;
    const currentAverage = currentKg ? currentSales / currentKg : 0;
    const previousAverage = previous && previousKg ? previousSales / previousKg : 0;
    const averageDiff = currentAverage - previousAverage;
    const averageGrowth = previousAverage ? (averageDiff / previousAverage) * 100 : 0;

    return [
        {
            label: `Detalle Volumen ${current}`,
            value: compactKg(currentKg),
            icon: 'fa-weight-scale',
            tone: 'blue',
            detail: previous ? `${kgGrowth >= 0 ? '+' : '-'} ${Math.abs(kgGrowth).toFixed(1)}% vs ${previous}` : 'Sin comparativo',
            positive: kgGrowth >= 0
        },
        {
            label: `Facturacion Total ${current}`,
            value: compactCurrency(currentSales),
            icon: 'fa-chart-simple',
            tone: 'purple',
            detail: previous ? `${growth >= 0 ? '↑' : '↓'} ${Math.abs(growth).toFixed(1)}% vs ${previous}` : 'Sin comparativo',
            positive: growth >= 0
        },
        {
            label: `Meta ${current}`,
            value: `${(currentMeta / 1000).toFixed(1)}K KG`,
            icon: 'fa-bullseye',
            tone: 'blue',
            detail: `${compliance.toFixed(1)}% cumplimiento`,
            positive: compliance >= 100
        },
        {
            label: 'Diferencia vs periodo',
            value: compactCurrency(diff),
            icon: 'fa-arrow-trend-up',
            tone: 'teal',
            detail: previous ? `${Math.abs(growth).toFixed(1)}% vs ${previous}` : 'Sin comparativo',
            positive: diff >= 0
        },
        {
            label: 'Precio Promedio Mensual ($/KG)',
            value: `$${currentAverage.toFixed(2)}`,
            icon: 'fa-chart-line',
            tone: 'teal',
            detail: previous ? `${averageGrowth >= 0 ? '+' : '-'} ${Math.abs(averageGrowth).toFixed(1)}% vs ${previous}` : 'Sin comparativo',
            positive: averageGrowth >= 0
        }
    ];
});

const handleGenerate = async () => {
    // Secuenciación: Asegurar que los filtros están cargados ANTES de consultar datos
    // Esto evita que initFilters() y generateReport() compitan simultáneamente por el pool de BD
    if (!store.filtersReady) {
        await store.initFilters();
    }

    const success = await store.generateReport();
    if (success) {
        isReportActive.value = true;
    }
};

const reportContent = ref<HTMLElement | null>(null);
const isExporting = ref(false);
const showExportModal = ref(false);
const PDF_EXPORT_WIDTH = 1120;

const waitForPdfLayout = async () => {
    await nextTick();
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => window.setTimeout(resolve, 250));
};

const openExportModal = () => {
    showExportModal.value = true;
};

const getPicCssColor = (token: string, fallback: string) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return value ? `hsl(${value})` : fallback;
};

const handleExportConfirm = async (config: any) => {
    if (!reportContent.value) return;
    
    try {
        isExporting.value = true;
        await waitForPdfLayout();
        
        // Importación dinámica de librerías visuales pesadas (Evita errores de inicialización en build)
        const [html2canvas, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ]);

        const element = reportContent.value;
        const canvas = await html2canvas.default(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: PDF_EXPORT_WIDTH,
            windowWidth: PDF_EXPORT_WIDTH,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: getPicCssColor('--pic-background', '#f1f5f9'),
            onclone: (clonedDocument: Document) => {
                const clonedReport = clonedDocument.querySelector('[data-pic-report-content="true"]') as HTMLElement | null;
                if (!clonedReport) return;

                clonedReport.style.width = `${PDF_EXPORT_WIDTH}px`;
                clonedReport.style.maxWidth = `${PDF_EXPORT_WIDTH}px`;
                clonedReport.style.minWidth = `${PDF_EXPORT_WIDTH}px`;
                clonedReport.style.overflow = 'hidden';
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF({
            orientation: config.orientation as any,
            unit: 'mm',
            format: config.format
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        let marginX = 12;
        if (config.margin === 'reducido') marginX = 6;
        if (config.margin === 'ninguno') marginX = 0;
        
        const marginTop = 20; 
        const marginBottom = config.showPageNumbers ? 15 : 10;
        
        const usableWidth = pageWidth - (marginX * 2);
        const usableHeight = pageHeight - marginTop - marginBottom;

        const imgWidth = usableWidth;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;
        
        const drawHeaderFooter = (pageNum: number) => {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, marginTop, 'F');
            pdf.rect(0, pageHeight - marginBottom, pageWidth, marginBottom, 'F');

            pdf.setFontSize(14);
            pdf.setTextColor(15, 23, 42); 
            // Titulo configurado
            const safeTitle = config.title.trim() || 'Reporte Operativo PIC';
            pdf.text(safeTitle, marginX === 0 ? 5 : marginX, 12);
            
            if (config.showDate) {
                pdf.setFontSize(10);
                pdf.setTextColor(100, 116, 139); 
                pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - (marginX === 0 ? 5 : marginX), 12, { align: 'right' });
            }
            
            if (config.showPageNumbers) {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9);
                pdf.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
            }
        };

        let heightLeft = imgHeight;
        let positionY = 0; 
        let pageNum = 1;

        pdf.addImage(imgData, 'JPEG', marginX, marginTop, imgWidth, imgHeight);
        drawHeaderFooter(pageNum);
        heightLeft -= usableHeight;

        while (heightLeft > 0) {
            positionY -= usableHeight; 
            pdf.addPage();
            pageNum++;
            
            pdf.addImage(imgData, 'JPEG', marginX, marginTop + positionY, imgWidth, imgHeight);
            drawHeaderFooter(pageNum);
            
            heightLeft -= usableHeight;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        pdf.save(`Reporte_${dateStr}.pdf`);
    } catch (error) {
        console.error('Error al exportar a PDF:', error);
        alert('Hubo un error al generar el PDF.');
    } finally {
        isExporting.value = false;
    }
};
</script>

<template>
    <div class="flex h-full min-h-0 overflow-hidden bg-pic-background text-pic-text-main">
        
        <PicExportModal 
            v-model="showExportModal" 
            @export="handleExportConfirm"
        />

        <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            
            <!-- Overlay de carga -->
            <div 
                v-if="store.isGenerating" 
                class="absolute inset-0 z-50 bg-pic-nav/45 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300"
            >
                <div class="bg-pic-surface border border-pic-border p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
                    <i class="fa-solid fa-circle-notch fa-spin text-5xl text-pic-brand mb-4"></i>
                    <h3 class="text-xl font-bold text-pic-text-main mb-2">Generando Análisis...</h3>
                    <p class="text-sm text-pic-text-muted">Procesando los datos, esto puede tomar unos segundos dependiendo de la carga.</p>
                </div>
            </div>

            <header v-if="!reportIsActive" class="h-16 bg-pic-surface border-b border-pic-border flex items-center px-8 justify-between shrink-0">
                <h1 class="text-xl font-bold text-pic-text-main">Reporte PIC <span class="text-xs font-normal text-pic-text-muted ml-2">v2.1</span></h1>
                <CacheProgress />
            </header>

            <main class="relative min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-24 md:p-8">
                
                <div v-if="!reportIsActive" class="flex h-full items-center justify-center">
                    <div class="text-center max-w-lg">
                        <div class="w-20 h-20 bg-pic-surface rounded-3xl shadow-sm border border-pic-border flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-chart-pie text-4xl text-pic-brand"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-pic-text-main mb-2">Generador de Reportes</h2>
                        <p class="text-pic-text-muted mb-8">
                            Utiliza el panel de filtros o consulta a la IA para visualizar el rendimiento de ventas y metas.
                        </p>
                        
                        <button 
                            @click="handleGenerate"
                            :disabled="store.isGenerating"
                            class="bg-pic-brand hover:brightness-95 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-pic-brand/20 transition-transform active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <i v-else class="fa-solid fa-bolt"></i>
                            <span>{{ store.isGenerating ? 'Generando...' : 'Generar Reporte' }}</span>
                        </button>
                    </div>
                </div>

                <div v-else class="pb-20">
                    <div class="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 md:mb-6 md:flex md:flex-wrap md:items-center md:justify-between md:gap-3">
                        <div class="min-w-0">
                            <h2 class="flex items-center gap-2 whitespace-nowrap text-[27px] font-black leading-none tracking-tight text-pic-text-main md:text-lg">
                                <i class="fa-solid fa-chart-pie hidden text-pic-brand md:inline-block"></i>
                                <span class="hidden md:inline">Resultados del Reporte</span>
                                <span class="md:hidden">Reporte PIC</span>
                            </h2>
                            <p class="mt-1 whitespace-nowrap text-xs font-medium leading-tight text-pic-text-muted md:hidden">Actualizado: {{ reportUpdatedAt }}</p>
                        </div>
                        <div class="pic-report-actions hidden flex-col items-end gap-1.5 md:flex">
                            <CacheProgress />
                            <button
                                @click="openExportModal"
                                :disabled="isExporting"
                                class="inline-flex h-9 items-center gap-2 rounded-xl border border-pic-border bg-pic-surface px-4 text-sm font-bold text-pic-text-main shadow-sm transition-all hover:-translate-y-0.5 hover:bg-pic-muted-surface disabled:cursor-not-allowed disabled:opacity-50"
                                title="Configurar y Exportar PDF"
                            >
                                <i v-if="isExporting" class="fa-solid fa-spinner fa-spin text-pic-text-muted"></i>
                                <i v-else class="fa-solid fa-file-pdf text-pic-brand"></i>
                                {{ isExporting ? 'Generando PDF...' : 'Exportar a PDF' }}
                            </button>
                        </div>

                        <PicFilters class="md:basis-full" />
                    </div>

                    <div 
                        ref="reportContent" 
                        data-pic-report-content="true"
                        class="-mx-1 bg-pic-background px-1 pb-4 md:-mx-4 md:px-4"
                        :class="{ 'pic-pdf-export-mode': isExporting }"
                    >
                        <ExecutiveSummaryCard />

                        <div class="mb-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:mb-6 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible">
                            <article
                                v-for="kpi in mobileKpis"
                                :key="kpi.label"
                                class="min-w-[154px] rounded-xl border border-pic-border bg-pic-surface p-3 shadow-sm md:min-w-0 md:p-4"
                            >
                                <div class="mb-3 flex items-start gap-2.5 md:mb-4">
                                    <span
                                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10"
                                        :class="{
                                            'bg-pic-accent-purple-soft text-pic-accent-purple': kpi.tone === 'purple',
                                            'bg-pic-accent-blue-soft text-pic-accent-blue': kpi.tone === 'blue',
                                            'bg-pic-accent-teal-soft text-pic-accent-teal': kpi.tone === 'teal'
                                        }"
                                    >
                                        <i class="fa-solid text-sm md:text-base" :class="kpi.icon"></i>
                                    </span>
                                    <p class="min-w-0 text-[11px] font-semibold leading-tight text-pic-text-muted md:text-xs">{{ kpi.label }}</p>
                                </div>
                                <p class="text-[20px] font-black leading-none tracking-tight text-pic-text-main md:text-2xl">{{ kpi.value }}</p>
                                <p class="mt-1.5 text-[11px] font-bold leading-tight md:text-xs" :class="kpi.positive ? 'text-pic-success' : 'text-pic-danger'">{{ kpi.detail }}</p>
                            </article>
                        </div>
                        
                        <PicGrid />
                    </div>
                </div>

            </main>
        </div>

        <div v-if="reportIsActive" class="2xl:hidden">
            <PicChat mode="mobile" />
        </div>
        <div class="hidden h-full 2xl:block">
            <PicChat />
        </div>

    </div>
</template>

<style scoped>
.pic-pdf-export-mode {
    width: 1120px;
    min-width: 1120px;
    max-width: 1120px;
    margin-left: 0;
    margin-right: 0;
    padding: 16px;
    overflow: hidden;
    box-sizing: border-box;
}

.pic-pdf-export-mode :deep(.pic-chart-row) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 24px !important;
    width: 100% !important;
}

.pic-pdf-export-mode :deep(.pic-chart-cell),
.pic-pdf-export-mode :deep(.pic-chart-card),
.pic-pdf-export-mode :deep(.pic-chart-surface) {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box;
}

.pic-pdf-export-mode :deep(.pic-report-table),
.pic-pdf-export-mode :deep(.pic-report-table-scroll) {
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden !important;
}

.pic-pdf-export-mode :deep(.pic-report-table table) {
    width: 100% !important;
    table-layout: fixed;
}

.pic-pdf-export-mode :deep(.pic-report-table th),
.pic-pdf-export-mode :deep(.pic-report-table td) {
    padding-left: 8px !important;
    padding-right: 8px !important;
    font-size: 10px !important;
    white-space: normal !important;
    word-break: break-word;
}

.pic-pdf-export-mode :deep(button) {
    display: none !important;
}

.pic-report-actions :deep(.cache-progress-card) {
    min-height: 0;
    max-width: 240px;
    justify-content: flex-end;
    gap: 8px;
    padding: 4px 8px;
    border-color: hsl(var(--pic-border));
    background: transparent;
    box-shadow: none;
}

.pic-report-actions :deep(.cache-progress-card > div:first-child i) {
    font-size: 11px;
}

.pic-report-actions :deep(.cache-progress-card span) {
    font-size: 10px;
    letter-spacing: 0;
}

.pic-report-actions :deep(.cache-progress-card .text-\[11px\]) {
    display: none;
}

.pic-report-actions :deep(.cache-progress-card .w-20) {
    display: none;
}
</style>

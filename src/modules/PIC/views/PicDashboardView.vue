<script setup lang="ts">
import { nextTick, ref } from 'vue';
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
            backgroundColor: '#f1f5f9',
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
    <div class="flex h-full min-h-0 overflow-hidden bg-slate-100">
        
        <PicExportModal 
            v-model="showExportModal" 
            @export="handleExportConfirm"
        />

        <div class="flex-1 flex min-h-0 flex-col relative overflow-hidden">
            
            <!-- Overlay de carga -->
            <div 
                v-if="store.isGenerating" 
                class="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300"
            >
                <div class="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
                    <i class="fa-solid fa-circle-notch fa-spin text-5xl text-brand-500 mb-4"></i>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">Generando Análisis...</h3>
                    <p class="text-sm text-slate-500">Procesando los datos, esto puede tomar unos segundos dependiendo de la carga.</p>
                </div>
            </div>

            <PicFilters v-if="isReportActive" />
            
            <header v-else class="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0">
                <h1 class="text-xl font-bold text-slate-800">Reporte PIC <span class="text-xs font-normal text-slate-400 ml-2">v2.1</span></h1>
                <CacheProgress />
            </header>

            <main class="min-h-0 flex-1 overflow-y-auto p-8 relative">
                
                <div v-if="!isReportActive" class="flex h-full items-center justify-center">
                    <div class="text-center max-w-lg">
                        <div class="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-chart-pie text-4xl text-brand-500"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-2">Generador de Reportes</h2>
                        <p class="text-slate-500 mb-8">
                            Utiliza el panel de filtros o consulta a la IA para visualizar el rendimiento de ventas y metas.
                        </p>
                        
                        <button 
                            @click="handleGenerate"
                            :disabled="store.isGenerating"
                            class="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-transform active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <i v-else class="fa-solid fa-bolt"></i>
                            <span>{{ store.isGenerating ? 'Generando...' : 'Generar Reporte' }}</span>
                        </button>
                    </div>
                </div>

                <div v-else class="pb-20">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-chart-pie text-brand-500"></i>
                            Resultados del Reporte
                        </h2>
                        <CacheProgress />
                        <button 
                            @click="openExportModal"
                            :disabled="isExporting"
                            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                            title="Configurar y Exportar PDF"
                        >
                            <i v-if="isExporting" class="fa-solid fa-spinner fa-spin text-slate-400"></i>
                            <i v-else class="fa-solid fa-file-pdf text-brand-500"></i>
                            {{ isExporting ? 'Generando PDF...' : 'Exportar a PDF' }}
                        </button>
                    </div>

                    <div 
                        ref="reportContent" 
                        data-pic-report-content="true"
                        class="bg-slate-100 -mx-4 px-4 pb-4"
                        :class="{ 'pic-pdf-export-mode': isExporting }"
                    >
                        <ExecutiveSummaryCard />
                        
                        <PicGrid />
                    </div>
                </div>

            </main>
        </div>

        <PicChat />

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
</style>

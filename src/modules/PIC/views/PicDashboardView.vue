<script setup lang="ts">
import { ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import PicChat from '../components/PicChat.vue';
import PicFilters from '../components/PicFilters.vue';
import PicGrid from '../components/PicGrid.vue'; 
import ExecutiveSummaryCard from '../components/ExecutiveSummaryCard.vue';
import PicExportModal from '../components/modals/PicExportModal.vue';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const store = usePicFilterStore();
const isReportActive = ref(false);

const handleGenerate = async () => {
    const success = await store.generateReport();
    if (success) {
        isReportActive.value = true;
    }
};

const reportContent = ref<HTMLElement | null>(null);
const isExporting = ref(false);
const showExportModal = ref(false);

const openExportModal = () => {
    showExportModal.value = true;
};

const handleExportConfirm = async (config: any) => {
    if (!reportContent.value) return;
    
    try {
        isExporting.value = true;
        // Pequeña espera para asegurar animaciones
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(reportContent.value, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff' 
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
    <div class="flex h-screen overflow-hidden bg-slate-100">
        
        <PicExportModal 
            v-model="showExportModal" 
            @export="handleExportConfirm"
        />

        <div class="flex-1 flex flex-col relative overflow-hidden">
            
            <PicFilters v-if="isReportActive" />
            
            <header v-else class="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0">
                <h1 class="text-xl font-bold text-slate-800">Reporte PIC <span class="text-xs font-normal text-slate-400 ml-2">v2.1</span></h1>
            </header>

            <main class="flex-1 overflow-y-auto p-8 relative">
                
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
                            <span v-else>
                                <i class="fa-solid fa-bolt"></i> Generar Reporte 
                            </span>
                        </button>
                    </div>
                </div>

                <div v-else class="pb-20">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-chart-pie text-brand-500"></i>
                            Resultados del Reporte
                        </h2>
                        <button 
                            @click="openExportModal"
                            :disabled="isExporting"
                            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                            title="Configurar y Exportar PDF"
                        >
                            <i v-if="isExporting" class="fa-solid fa-spinner fa-spin text-slate-400"></i>
                            <i v-else class="fa-solid fa-file-pdf text-rose-500"></i>
                            {{ isExporting ? 'Generando PDF...' : 'Exportar a PDF' }}
                        </button>
                    </div>

                    <div ref="reportContent" class="bg-slate-100 -mx-4 px-4 pb-4">
                        <ExecutiveSummaryCard />
                        
                        <PicGrid />
                    </div>
                </div>

            </main>
        </div>

        <PicChat />

    </div>
</template>
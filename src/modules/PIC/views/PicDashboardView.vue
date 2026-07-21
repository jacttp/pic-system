<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import PicChat from '../components/PicChat.vue';
import PicFilters from '../components/PicFilters.vue';
import PicGrid from '../components/PicGrid.vue'; 
import ExecutiveSummaryCard from '../components/ExecutiveSummaryCard.vue';
import PicExportModal from '../components/modals/PicExportModal.vue';
import type { PicPdfExportConfig, PicPrintBlockKey, PicPrintSectionKey } from '../types/picTypes';
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
const activePrintConfig = ref<PicPdfExportConfig | null>(null);
const pendingPrintPreviewConfig = ref<PicPdfExportConfig | null>(null);
const isPrintPreviewAvailable = ref(false);
const exportPanelRef = ref<InstanceType<typeof PicExportModal> | null>(null);
const PDF_EXPORT_WIDTH = 1120;
const PRINT_PREVIEW_PAGE_PADDING = 16;
const PDF_FORMAT_MM: Record<PicPdfExportConfig['format'], { width: number; height: number }> = {
    a4: { width: 210, height: 297 },
    letter: { width: 216, height: 279 },
    legal: { width: 216, height: 356 }
};

const printModeClasses = computed(() => {
    const config = activePrintConfig.value;
    if (!config) return {};

    const classes: Record<string, boolean> = {
        'pic-pdf-export-mode': true,
        'pic-pdf-grayscale': config.grayscale,
        'pic-pdf-clean-controls': config.cleanControls,
        'pic-pdf-avoid-breaks': config.avoidPageBreaks,
        'pic-pdf-font-normal': config.fontScale === 'normal',
        'pic-pdf-font-large': config.fontScale === 'large',
        'pic-pdf-font-xlarge': config.fontScale === 'xlarge',
        'pic-pdf-spacing-compact': config.spacing === 'compact',
        'pic-pdf-spacing-normal': config.spacing === 'normal',
        'pic-pdf-spacing-spacious': config.spacing === 'spacious',
        [`pic-pdf-format-${config.format}`]: true,
        [`pic-pdf-orientation-${config.orientation}`]: true
    };

    Object.entries(config.sections).forEach(([section, isVisible]) => {
        classes[`pic-hide-${section}`] = !isVisible;
    });

    return classes;
});

const printPreviewStyle = computed(() => {
    const config = activePrintConfig.value;
    if (!config) return {};

    return {
        '--pic-preview-page-height': `${getPreviewPagePixelHeight(config)}px`,
        '--pic-print-block-gap': `${getGlobalBlockGap(config)}px`
    };
});

const getPrintClassList = (config: PicPdfExportConfig) => {
    const classes = [
        'pic-pdf-export-mode',
        config.grayscale ? 'pic-pdf-grayscale' : '',
        config.cleanControls ? 'pic-pdf-clean-controls' : '',
        config.avoidPageBreaks ? 'pic-pdf-avoid-breaks' : '',
        `pic-pdf-font-${config.fontScale}`,
        `pic-pdf-spacing-${config.spacing}`,
        `pic-pdf-format-${config.format}`,
        `pic-pdf-orientation-${config.orientation}`
    ];

    Object.entries(config.sections).forEach(([section, isVisible]) => {
        if (!isVisible) classes.push(`pic-hide-${section}`);
    });

    return classes.filter(Boolean);
};

const clonePrintConfig = (config: PicPdfExportConfig): PicPdfExportConfig => ({
    ...config,
    sections: { ...config.sections },
    blockSpacing: { ...(config.blockSpacing || {}) },
    pageBreakBefore: { ...(config.pageBreakBefore || {}) }
});

const getGlobalBlockGap = (config: PicPdfExportConfig) => {
    const baseGap = 24;
    return Math.max(0, Math.round(baseGap * (1 + (config.spacingPercent || 0) / 100)));
};

const getPreviewPagePixelHeight = (config: PicPdfExportConfig) => {
    const format = PDF_FORMAT_MM[config.format];
    const pageWidth = config.orientation === 'landscape' ? format.height : format.width;
    const pageHeight = config.orientation === 'landscape' ? format.width : format.height;
    const marginX = getPdfMarginX(config.margin);
    const marginTop = config.showTitle || config.showDate ? 18 : 10;
    const marginBottom = config.showPageNumbers ? 15 : 10;
    const usableWidth = pageWidth - (marginX * 2);
    const usableHeight = pageHeight - marginTop - marginBottom;

    return Math.floor((PDF_EXPORT_WIDTH * usableHeight) / usableWidth);
};

const getBlockSpacingValue = (config: PicPdfExportConfig | null, blockId: PicPrintBlockKey) => {
    return Number(config?.blockSpacing?.[blockId] || 0);
};

const getBlockPreviewStyle = (blockId: PicPrintBlockKey) => {
    const config = activePrintConfig.value;
    if (!config) return {};
    const spacing = getBlockSpacingValue(config, blockId);

    return {
        '--pic-print-block-spacing': `${spacing}px`,
        marginTop: `calc(${spacing}px + var(--pic-print-page-break-offset, 0px))`
    };
};

const commitPrintConfig = (config: PicPdfExportConfig) => {
    const nextConfig = clonePrintConfig(config);
    activePrintConfig.value = nextConfig;
    exportPanelRef.value?.replaceConfig(nextConfig);
};

const updatePrintBlockSpacing = (blockId: PicPrintBlockKey, delta: number) => {
    const config = activePrintConfig.value;
    if (!config) return;

    const nextConfig = clonePrintConfig(config);
    const current = getBlockSpacingValue(nextConfig, blockId);
    nextConfig.blockSpacing[blockId] = Math.max(-24, Math.min(220, current + delta));
    commitPrintConfig(nextConfig);
};

const resetPrintBlockSpacing = (blockId: PicPrintBlockKey) => {
    const config = activePrintConfig.value;
    if (!config) return;

    const nextConfig = clonePrintConfig(config);
    delete nextConfig.blockSpacing[blockId];
    delete nextConfig.pageBreakBefore[blockId];
    commitPrintConfig(nextConfig);
};

const togglePrintBlockPageBreak = (blockId: PicPrintBlockKey) => {
    const config = activePrintConfig.value;
    if (!config) return;

    const nextConfig = clonePrintConfig(config);
    nextConfig.pageBreakBefore[blockId] = !nextConfig.pageBreakBefore[blockId];
    commitPrintConfig(nextConfig);
};

const refreshPrintPageBreakOffsets = async () => {
    const config = activePrintConfig.value;
    const report = reportContent.value;
    if (!config || !report) return;

    await nextTick();

    const pageHeight = getPreviewPagePixelHeight(config);
    const blocks = Array.from(report.querySelectorAll('[data-pic-print-block="true"]')) as HTMLElement[];
    const visibleBlocks = blocks.filter(block => block.offsetParent !== null && block.offsetHeight > 0);
    blocks.forEach(block => {
        const blockId = block.dataset.picPrintBlockId as PicPrintBlockKey | undefined;
        block.style.setProperty('--pic-print-block-spacing', `${blockId ? getBlockSpacingValue(config, blockId) : 0}px`);
        block.style.setProperty('--pic-print-page-break-offset', '0px');
    });

    const getOffsetToNextPageContent = (currentPageRemainder: number) => {
        if (currentPageRemainder <= PRINT_PREVIEW_PAGE_PADDING) {
            return Math.max(0, PRINT_PREVIEW_PAGE_PADDING - currentPageRemainder);
        }

        return Math.ceil(pageHeight - currentPageRemainder + PRINT_PREVIEW_PAGE_PADDING);
    };

    const reportTop = report.getBoundingClientRect().top;
    blocks.forEach(block => {
        const blockId = block.dataset.picPrintBlockId as PicPrintBlockKey | undefined;
        if (!blockId || block.offsetParent === null || block.offsetHeight <= 0) return;

        const blockTop = block.getBoundingClientRect().top - reportTop;
        const currentPageRemainder = ((blockTop % pageHeight) + pageHeight) % pageHeight;

        if (config.pageBreakBefore?.[blockId]) {
            const isFirstVisibleBlock = visibleBlocks[0] === block;
            const offset = isFirstVisibleBlock ? 0 : getOffsetToNextPageContent(currentPageRemainder);
            block.style.setProperty('--pic-print-page-break-offset', `${offset}px`);
            return;
        }

        const blockHeight = block.offsetHeight;
        const fitsCurrentPage = currentPageRemainder + blockHeight <= pageHeight;
        const shouldAutoMove = currentPageRemainder > 24 && !fitsCurrentPage && blockHeight < pageHeight;

        if (shouldAutoMove) {
            block.style.setProperty('--pic-print-page-break-offset', `${getOffsetToNextPageContent(currentPageRemainder)}px`);
        }
    });
};

const waitForPdfLayout = async () => {
    await nextTick();
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => window.setTimeout(resolve, 250));
};

const openExportModal = () => {
    showExportModal.value = !showExportModal.value;
};

const syncPrintPreviewState = () => {
    activePrintConfig.value = isPrintPreviewAvailable.value ? pendingPrintPreviewConfig.value : null;
};

const handlePrintPreviewChange = (config: PicPdfExportConfig | null) => {
    if (isExporting.value && !config) return;
    pendingPrintPreviewConfig.value = config;
    syncPrintPreviewState();
};

const updatePrintPreviewAvailability = () => {
    isPrintPreviewAvailable.value = window.matchMedia('(min-width: 1280px)').matches;
    syncPrintPreviewState();
};

watch(activePrintConfig, () => {
    void refreshPrintPageBreakOffsets();
}, { deep: true, flush: 'post' });

const handlePrintPreviewResize = () => {
    updatePrintPreviewAvailability();
    void refreshPrintPageBreakOffsets();
};

onMounted(() => {
    updatePrintPreviewAvailability();
    window.addEventListener('resize', handlePrintPreviewResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handlePrintPreviewResize);
});

const getPicCssColor = (token: string, fallback: string) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return value ? `hsl(${value})` : fallback;
};

const getPdfMarginX = (margin: PicPdfExportConfig['margin']) => {
    if (margin === 'reducido') return 6;
    if (margin === 'ninguno') return 0;
    return 12;
};

const getPdfContentMetrics = (pdf: any, config: PicPdfExportConfig) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = getPdfMarginX(config.margin);
    const marginTop = config.showTitle || config.showDate ? 18 : 10;
    const marginBottom = config.showPageNumbers ? 15 : 10;
    const usableWidth = pageWidth - (marginX * 2);
    const usableHeight = pageHeight - marginTop - marginBottom;
    const pagePixelHeight = Math.floor((PDF_EXPORT_WIDTH * usableHeight) / usableWidth);

    return { pageWidth, pageHeight, marginX, marginTop, marginBottom, usableWidth, usableHeight, pagePixelHeight };
};

const applyPrintConfigToReport = (report: HTMLElement, config: PicPdfExportConfig) => {
    report.style.width = `${PDF_EXPORT_WIDTH}px`;
    report.style.maxWidth = `${PDF_EXPORT_WIDTH}px`;
    report.style.minWidth = `${PDF_EXPORT_WIDTH}px`;
    report.style.overflow = 'visible';
    report.style.filter = config.grayscale ? 'grayscale(1)' : '';
    report.style.setProperty('--pic-print-block-gap', `${getGlobalBlockGap(config)}px`);

    Object.entries(config.sections).forEach(([section, isVisible]) => {
        if (isVisible) return;
        report.querySelectorAll(`[data-pic-print-section="${section as PicPrintSectionKey}"]`).forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
    });

    if (config.cleanControls) {
        report.querySelectorAll('[data-pic-print-control="true"]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
    }

    report.querySelectorAll('.pic-print-block-controls').forEach(element => {
        (element as HTMLElement).style.display = 'none';
    });

    report.querySelectorAll('[data-pic-print-block="true"]').forEach(element => {
        const blockElement = element as HTMLElement;
        blockElement.style.setProperty('--pic-print-page-break-offset', '0px');
        blockElement.style.setProperty('--pic-print-block-spacing', '0px');
    });

    report.querySelectorAll('.pic-report-table, .pic-report-table-scroll').forEach(element => {
        const tableElement = element as HTMLElement;
        tableElement.style.height = 'auto';
        tableElement.style.maxHeight = 'none';
        tableElement.style.overflow = 'visible';
    });

    report.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(element => {
        (element as HTMLElement).style.display = 'none';
    });

    disablePrintTransientStyles(report);
};

const copyCanvasBitmaps = (source: HTMLElement, target: HTMLElement) => {
    const sourceCanvases = Array.from(source.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const targetCanvases = Array.from(target.querySelectorAll('canvas')) as HTMLCanvasElement[];

    sourceCanvases.forEach((sourceCanvas, index) => {
        const targetCanvas = targetCanvases[index];
        if (!targetCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) return;

        targetCanvas.width = sourceCanvas.width;
        targetCanvas.height = sourceCanvas.height;
        targetCanvas.style.width = sourceCanvas.style.width || `${sourceCanvas.clientWidth}px`;
        targetCanvas.style.height = sourceCanvas.style.height || `${sourceCanvas.clientHeight}px`;
        targetCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0);
    });
};

const getVueScopeAttributeNames = (element: HTMLElement) => {
    return Array.from(element.attributes)
        .map(attribute => attribute.name)
        .filter(name => name.startsWith('data-v-'));
};

const applyVueScopeAttributes = (element: HTMLElement, scopeAttributeNames: string[]) => {
    scopeAttributeNames.forEach(attributeName => {
        element.setAttribute(attributeName, '');
    });
};

const disablePrintTransientStyles = (root: HTMLElement) => {
    root.querySelectorAll('.animate-fade-in, [data-pic-print-projection-table="true"]').forEach(element => {
        const animatedElement = element as HTMLElement;
        animatedElement.style.animation = 'none';
        animatedElement.style.transition = 'none';
        animatedElement.style.opacity = '1';
    });
};

const createPrintPage = (pagePixelHeight: number, config: PicPdfExportConfig, scopeAttributeNames: string[]) => {
    const page = document.createElement('section');
    page.className = ['pic-pdf-render-page', ...getPrintClassList(config)].join(' ');
    applyVueScopeAttributes(page, scopeAttributeNames);
    page.style.width = `${PDF_EXPORT_WIDTH}px`;
    page.style.minHeight = `${pagePixelHeight}px`;
    page.style.background = getPicCssColor('--pic-background', '#f1f5f9');
    page.style.overflow = 'hidden';
    page.style.boxSizing = 'border-box';
    page.style.padding = '16px';
    page.style.setProperty('--pic-print-block-gap', `${getGlobalBlockGap(config)}px`);
    return page;
};

const cloneTableShellWithRows = (tableBlock: HTMLElement, rows: HTMLTableRowElement[]) => {
    const clone = tableBlock.cloneNode(true) as HTMLElement;
    const tbody = clone.querySelector('.pic-report-table-scroll table tbody') || clone.querySelector('table:not([data-pic-print-control="true"]):not([hidden]) tbody') || clone.querySelector('tbody');
    if (!tbody) return clone;

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row.cloneNode(true)));
    return clone;
};

const getProjectionPrintTable = (tableBlock: HTMLElement) => {
    return tableBlock.querySelector('.pic-report-table-scroll table') as HTMLTableElement | null;
};

const prepareProjectionPrintChunk = (chunk: HTMLElement, isLastChunk: boolean) => {
    chunk.classList.add('pic-pdf-projection-table-chunk');
    disablePrintTransientStyles(chunk);
    chunk.querySelectorAll('[data-pic-print-control="true"], .pic-print-block-controls').forEach(element => {
        (element as HTMLElement).style.display = 'none';
    });

    if (!isLastChunk) {
        getProjectionPrintTable(chunk)?.querySelector('tfoot')?.remove();
    }

    chunk.querySelectorAll('.sticky').forEach(element => {
        const stickyElement = element as HTMLElement;
        stickyElement.style.position = 'static';
        stickyElement.style.left = 'auto';
        stickyElement.style.top = 'auto';
        stickyElement.style.boxShadow = 'none';
    });
};

const cloneProjectionTableChunk = (tableBlock: HTMLElement, rows: HTMLTableRowElement[], isLastChunk: boolean) => {
    const clone = tableBlock.cloneNode(true) as HTMLElement;
    const table = getProjectionPrintTable(clone);
    const tbody = table?.querySelector('tbody');
    if (!tbody) return clone;

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row.cloneNode(true)));
    prepareProjectionPrintChunk(clone, isLastChunk);
    return clone;
};

const splitProjectionTableBlockByRows = (tableBlock: HTMLElement, pagePixelHeight: number, config: PicPdfExportConfig, scopeAttributeNames: string[]) => {
    const table = getProjectionPrintTable(tableBlock);
    const rows = Array.from(table?.querySelectorAll('tbody tr') || []) as HTMLTableRowElement[];
    if (!rows.length) return [tableBlock];

    const measuringPage = createPrintPage(pagePixelHeight, config, scopeAttributeNames);
    measuringPage.style.position = 'absolute';
    measuringPage.style.left = '-10000px';
    measuringPage.style.top = '0';
    document.body.appendChild(measuringPage);

    const maxChunkHeight = pagePixelHeight - 40;
    const rowChunks: HTMLTableRowElement[][] = [];
    let currentRows: HTMLTableRowElement[] = [];

    rows.forEach(row => {
        const candidateRows = [...currentRows, row];
        const candidate = cloneProjectionTableChunk(tableBlock, candidateRows, false);
        measuringPage.innerHTML = '';
        measuringPage.appendChild(candidate);

        if (candidate.offsetHeight > maxChunkHeight && currentRows.length > 0) {
            rowChunks.push(currentRows);
            currentRows = [row];
            return;
        }

        currentRows = candidateRows;
    });

    if (currentRows.length > 0) {
        rowChunks.push(currentRows);
    }

    measuringPage.remove();
    return rowChunks.map((rowsInChunk, index) => cloneProjectionTableChunk(tableBlock, rowsInChunk, index === rowChunks.length - 1));
};

const splitTableBlockByRows = (tableBlock: HTMLElement, pagePixelHeight: number, config: PicPdfExportConfig, scopeAttributeNames: string[]) => {
    const table = tableBlock.querySelector('.pic-report-table-scroll table') || tableBlock.querySelector('table:not([data-pic-print-control="true"]):not([hidden])') || tableBlock.querySelector('table');
    const rows = Array.from(table?.querySelectorAll('tbody tr') || []) as HTMLTableRowElement[];
    if (!rows.length) return [tableBlock];

    const measuringPage = createPrintPage(pagePixelHeight, config, scopeAttributeNames);
    measuringPage.style.position = 'absolute';
    measuringPage.style.left = '-10000px';
    measuringPage.style.top = '0';
    document.body.appendChild(measuringPage);

    const chunks: HTMLElement[] = [];
    let currentRows: HTMLTableRowElement[] = [];

    rows.forEach(row => {
        const candidateRows = [...currentRows, row];
        const candidate = cloneTableShellWithRows(tableBlock, candidateRows);
        measuringPage.innerHTML = '';
        measuringPage.appendChild(candidate);

        if (candidate.offsetHeight > pagePixelHeight && currentRows.length > 0) {
            chunks.push(cloneTableShellWithRows(tableBlock, currentRows));
            currentRows = [row];
            return;
        }

        currentRows = candidateRows;
    });

    if (currentRows.length > 0) {
        chunks.push(cloneTableShellWithRows(tableBlock, currentRows));
    }

    measuringPage.remove();
    return chunks.length ? chunks : [tableBlock];
};

const buildPaginatedPrintPages = (sourceReport: HTMLElement, config: PicPdfExportConfig, pagePixelHeight: number) => {
    const scopeAttributeNames = getVueScopeAttributeNames(sourceReport);
    const staging = document.createElement('div');
    staging.className = 'pic-pdf-render-stage';
    applyVueScopeAttributes(staging, scopeAttributeNames);
    staging.style.position = 'absolute';
    staging.style.left = '-10000px';
    staging.style.top = '0';
    staging.style.width = `${PDF_EXPORT_WIDTH}px`;
    staging.style.background = getPicCssColor('--pic-background', '#f1f5f9');
    document.body.appendChild(staging);

    const clonedReport = sourceReport.cloneNode(true) as HTMLElement;
    copyCanvasBitmaps(sourceReport, clonedReport);
    applyPrintConfigToReport(clonedReport, config);
    staging.appendChild(clonedReport);

    const blocks = Array.from(clonedReport.querySelectorAll('[data-pic-print-block="true"]')) as HTMLElement[];
    const visibleBlocks = blocks.filter(block => block.offsetParent !== null && block.offsetHeight > 0);
    const pageNodes: HTMLElement[] = [];

    staging.innerHTML = '';

    let currentPage = createPrintPage(pagePixelHeight, config, scopeAttributeNames);
    staging.appendChild(currentPage);
    pageNodes.push(currentPage);
    const appliedManualBreaks = new Set<string>();

    const appendPage = () => {
        currentPage = createPrintPage(pagePixelHeight, config, scopeAttributeNames);
        staging.appendChild(currentPage);
        pageNodes.push(currentPage);
    };

    const appendBlock = (block: HTMLElement) => {
        const blockId = block.dataset.picPrintBlockId as PicPrintBlockKey | undefined;
        if (blockId) {
            const customSpacing = getBlockSpacingValue(config, blockId);
            block.style.setProperty('--pic-print-block-spacing', `${customSpacing}px`);
            if (customSpacing !== 0) {
                block.style.marginTop = `${customSpacing}px`;
            }

            if (config.pageBreakBefore?.[blockId] && currentPage.children.length > 0 && !appliedManualBreaks.has(blockId)) {
                appliedManualBreaks.add(blockId);
                appendPage();
            }
        }

        currentPage.appendChild(block);
        if (currentPage.scrollHeight <= pagePixelHeight || currentPage.children.length === 1) return;

        currentPage.removeChild(block);
        appendPage();
        currentPage.appendChild(block);
    };

    visibleBlocks.forEach(block => {
        const isProjectionTable = block.matches('[data-pic-print-projection-table="true"]');
        const shouldSplitTable = block.matches('[data-pic-print-table="true"]') && block.offsetHeight > pagePixelHeight;
        const shouldSplitProjectionTable = isProjectionTable && block.offsetHeight > pagePixelHeight;
        const printableBlocks = shouldSplitProjectionTable
            ? splitProjectionTableBlockByRows(block, pagePixelHeight, config, scopeAttributeNames)
            : shouldSplitTable
                ? splitTableBlockByRows(block, pagePixelHeight, config, scopeAttributeNames)
                : [block];
        printableBlocks.forEach(printableBlock => appendBlock(printableBlock));
    });

    pageNodes.filter(page => page.children.length === 0).forEach(page => page.remove());

    return {
        staging,
        pages: pageNodes.filter(page => page.isConnected && page.children.length > 0)
    };
};

const handleExportConfirm = async (config: PicPdfExportConfig) => {
    if (!reportContent.value) return;
    let staging: HTMLElement | null = null;
    
    try {
        isExporting.value = true;
        activePrintConfig.value = config;
        await waitForPdfLayout();
        
        // Importación dinámica de librerías visuales pesadas (Evita errores de inicialización en build)
        const [html2canvas, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ]);

        const element = reportContent.value;
        const pdf = new jsPDF({
            orientation: config.orientation as any,
            unit: 'mm',
            format: config.format
        });

        const {
            pageWidth,
            pageHeight,
            marginX,
            marginTop,
            marginBottom,
            usableWidth,
            usableHeight,
            pagePixelHeight
        } = getPdfContentMetrics(pdf, config);
        
        const drawHeaderFooter = (pageNum: number) => {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, marginTop, 'F');
            pdf.rect(0, pageHeight - marginBottom, pageWidth, marginBottom, 'F');

            const headerX = marginX === 0 ? 5 : marginX;
            const headerY = 10;

            if (config.showTitle) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9.5);
                pdf.setTextColor(15, 23, 42);
                const safeTitle = config.title.trim() || 'Reporte de Venta - PIC';
                pdf.text(safeTitle, headerX, headerY, { baseline: 'middle' });
            }
            
            if (config.showDate) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139); 
                pdf.text(`Generado ${new Date().toLocaleDateString()}`, pageWidth - headerX, headerY, { align: 'right', baseline: 'middle' });
            }

            if (config.showTitle || config.showDate) {
                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.15);
                pdf.line(headerX, marginTop - 3, pageWidth - headerX, marginTop - 3);
            }
            
            if (config.showPageNumbers) {
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(8);
                pdf.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
            }
        };

        const paginatedReport = buildPaginatedPrintPages(element, config, pagePixelHeight);
        staging = paginatedReport.staging;
        const { pages } = paginatedReport;

        for (let index = 0; index < pages.length; index++) {
            if (index > 0) pdf.addPage();

            const canvas = await html2canvas.default(pages[index], {
                scale: 2,
                useCORS: true,
                logging: false,
                width: PDF_EXPORT_WIDTH,
                height: pagePixelHeight,
                windowWidth: PDF_EXPORT_WIDTH,
                windowHeight: pagePixelHeight,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: getPicCssColor('--pic-background', '#f1f5f9')
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            pdf.addImage(imgData, 'JPEG', marginX, marginTop, usableWidth, usableHeight);
            drawHeaderFooter(index + 1);
        }

        staging.remove();
        staging = null;
        const dateStr = new Date().toISOString().split('T')[0];
        pdf.save(`Reporte_${dateStr}.pdf`);
    } catch (error) {
        console.error('Error al exportar a PDF:', error);
        alert('Hubo un error al generar el PDF.');
    } finally {
        staging?.remove();
        isExporting.value = false;
        activePrintConfig.value = showExportModal.value ? activePrintConfig.value : null;
    }
};
</script>

<template>
    <div class="flex h-full min-h-0 overflow-hidden bg-pic-background text-pic-text-main">
        
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
                                <i v-else class="fa-solid text-pic-brand" :class="showExportModal ? 'fa-eye' : 'fa-file-pdf'"></i>
                                {{ isExporting ? 'Generando PDF...' : (showExportModal ? 'Cerrar panel PDF' : 'Exportar a PDF') }}
                            </button>
                        </div>

                        <PicFilters class="md:basis-full">
                            <template #mobile-actions>
                                <button
                                    @click="openExportModal"
                                    :disabled="isExporting"
                                    class="inline-flex h-9 items-center gap-2 rounded-full border border-pic-border bg-pic-surface px-3 text-sm font-bold text-pic-text-main shadow-sm shadow-pic-brand/10 transition-all hover:-translate-y-0.5 hover:bg-pic-muted-surface disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Configurar y Exportar PDF"
                                >
                                    <i v-if="isExporting" class="fa-solid fa-spinner fa-spin text-pic-text-muted"></i>
                                    <i v-else class="fa-solid text-pic-brand" :class="showExportModal ? 'fa-eye' : 'fa-file-pdf'"></i>
                                    <span class="sr-only">
                                        {{ isExporting ? 'Generando PDF...' : (showExportModal ? 'Cerrar panel PDF' : 'Configurar PDF') }}
                                    </span>
                                    <span aria-hidden="true">PDF</span>
                                </button>
                            </template>
                        </PicFilters>
                    </div>

                    <div
                        class="grid min-h-0 gap-5"
                        :class="showExportModal ? 'xl:grid-cols-[minmax(0,1fr)_390px]' : 'xl:grid-cols-1'"
                    >
                        <div
                            class="min-w-0"
                            :class="{ 'pic-print-preview-stage': activePrintConfig }"
                        >
                            <div 
                                ref="reportContent" 
                                data-pic-report-content="true"
                                class="-mx-1 bg-pic-background px-1 pb-4 md:-mx-4 md:px-4"
                                :class="printModeClasses"
                                :style="printPreviewStyle"
                            >
                                <div
                                    data-pic-print-section="executiveSummary"
                                    data-pic-print-block="true"
                                    data-pic-print-block-id="executiveSummary"
                                    class="pic-print-adjustable-block"
                                    :class="{ 'pic-print-page-break-before': activePrintConfig?.pageBreakBefore?.executiveSummary }"
                                    :style="getBlockPreviewStyle('executiveSummary')"
                                >
                                    <div v-if="activePrintConfig" class="pic-print-block-controls">
                                        <span>Resumen</span>
                                        <button type="button" title="Reducir espacio antes" @click="updatePrintBlockSpacing('executiveSummary', -8)"><i class="fa-solid fa-minus"></i></button>
                                        <strong>{{ getBlockSpacingValue(activePrintConfig, 'executiveSummary') }}px</strong>
                                        <button type="button" title="Aumentar espacio antes" @click="updatePrintBlockSpacing('executiveSummary', 8)"><i class="fa-solid fa-plus"></i></button>
                                        <button type="button" title="Forzar salto de pagina antes" :class="{ 'is-active': activePrintConfig.pageBreakBefore?.executiveSummary }" @click="togglePrintBlockPageBreak('executiveSummary')"><i class="fa-solid fa-file-arrow-down"></i></button>
                                        <button type="button" title="Resetear este bloque" @click="resetPrintBlockSpacing('executiveSummary')"><i class="fa-solid fa-rotate-left"></i></button>
                                    </div>
                                    <ExecutiveSummaryCard />
                                </div>

                                <div
                                    data-pic-print-section="kpis"
                                    data-pic-print-block="true"
                                    data-pic-print-block-id="kpis"
                                    class="pic-print-adjustable-block mb-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:mb-6 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible"
                                    :class="{ 'pic-print-page-break-before': activePrintConfig?.pageBreakBefore?.kpis }"
                                    :style="getBlockPreviewStyle('kpis')"
                                >
                                    <div v-if="activePrintConfig" class="pic-print-block-controls">
                                        <span>KPIs</span>
                                        <button type="button" title="Reducir espacio antes" @click="updatePrintBlockSpacing('kpis', -8)"><i class="fa-solid fa-minus"></i></button>
                                        <strong>{{ getBlockSpacingValue(activePrintConfig, 'kpis') }}px</strong>
                                        <button type="button" title="Aumentar espacio antes" @click="updatePrintBlockSpacing('kpis', 8)"><i class="fa-solid fa-plus"></i></button>
                                        <button type="button" title="Forzar salto de pagina antes" :class="{ 'is-active': activePrintConfig.pageBreakBefore?.kpis }" @click="togglePrintBlockPageBreak('kpis')"><i class="fa-solid fa-file-arrow-down"></i></button>
                                        <button type="button" title="Resetear este bloque" @click="resetPrintBlockSpacing('kpis')"><i class="fa-solid fa-rotate-left"></i></button>
                                    </div>
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
                                
                                <PicGrid
                                    :is-print-mode="Boolean(activePrintConfig)"
                                    :print-config="activePrintConfig"
                                    @update-block-spacing="updatePrintBlockSpacing"
                                    @toggle-page-break="togglePrintBlockPageBreak"
                                    @reset-block-spacing="resetPrintBlockSpacing"
                                />
                            </div>
                        </div>

                        <PicExportModal 
                            ref="exportPanelRef"
                            v-model="showExportModal" 
                            :preview-enabled="isPrintPreviewAvailable"
                            @export="handleExportConfirm"
                            @preview-change="handlePrintPreviewChange"
                        />
                    </div>
                </div>

            </main>
        </div>

        <div v-if="reportIsActive" class="2xl:hidden">
            <PicChat mode="mobile" :hide-launcher="showExportModal" />
        </div>
        <div class="hidden h-full 2xl:block">
            <PicChat />
        </div>

    </div>
</template>

<style scoped>
.pic-print-preview-stage {
    margin: -16px;
    max-width: 100%;
    overflow: auto;
    border-radius: 18px;
    border: 1px solid hsl(var(--pic-border));
    background:
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(180deg, rgba(255,255,255,0.05) 1px, transparent 1px),
        #5f666c;
    background-size: 24px 24px;
    padding: 24px;
}

.pic-print-preview-stage > [data-pic-report-content="true"] {
    margin: 0 auto;
    position: relative;
    background-color: white;
    isolation: isolate;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.32);
}

.pic-print-preview-stage > [data-pic-report-content="true"]::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 70;
    pointer-events: none;
    background-image:
        repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--pic-preview-page-height, 1450px) - 2px),
            rgba(37, 99, 235, 0.95) calc(var(--pic-preview-page-height, 1450px) - 2px),
            rgba(37, 99, 235, 0.95) var(--pic-preview-page-height, 1450px)
        );
}

.pic-print-preview-stage > [data-pic-report-content="true"]::after {
    content: none;
}

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

.pic-pdf-render-stage {
    pointer-events: none;
}

.pic-pdf-render-page {
    display: block;
}

.pic-pdf-render-page > [data-pic-print-block="true"] + [data-pic-print-block="true"] {
    margin-top: calc(var(--pic-print-block-gap, 24px) + var(--pic-print-block-spacing, 0px) + var(--pic-print-page-break-offset, 0px)) !important;
}

.pic-pdf-render-page.pic-pdf-spacing-compact > [data-pic-print-block="true"] + [data-pic-print-block="true"] {
    margin-top: calc(var(--pic-print-block-gap, 12px) + var(--pic-print-block-spacing, 0px) + var(--pic-print-page-break-offset, 0px)) !important;
}

.pic-pdf-render-page.pic-pdf-spacing-spacious > [data-pic-print-block="true"] + [data-pic-print-block="true"] {
    margin-top: calc(var(--pic-print-block-gap, 34px) + var(--pic-print-block-spacing, 0px) + var(--pic-print-page-break-offset, 0px)) !important;
}

.pic-pdf-export-mode :deep([data-pic-print-block="true"] + [data-pic-print-block="true"]) {
    margin-top: calc(var(--pic-print-block-gap, 24px) + var(--pic-print-block-spacing, 0px) + var(--pic-print-page-break-offset, 0px)) !important;
}

.pic-print-adjustable-block {
    position: relative;
}

.pic-print-block-controls,
:deep(.pic-print-block-controls) {
    position: relative;
    z-index: 90;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    grid-column: 1 / -1;
    justify-self: end;
    gap: 4px;
    width: max-content;
    max-width: 100%;
    margin: 0 0 10px auto;
    border: 1px solid hsl(var(--pic-border));
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    padding: 4px 6px;
    color: hsl(var(--pic-text-muted));
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
}

.pic-print-block-controls span,
:deep(.pic-print-block-controls span) {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 5px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.pic-print-block-controls strong,
:deep(.pic-print-block-controls strong) {
    min-width: 34px;
    text-align: center;
    font-size: 10px;
    color: hsl(var(--pic-text-main));
}

.pic-print-block-controls button,
:deep(.pic-print-block-controls button) {
    display: grid;
    width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 999px;
    color: hsl(var(--pic-text-muted));
    transition: all 0.15s ease;
}

.pic-print-block-controls button:hover,
:deep(.pic-print-block-controls button:hover),
.pic-print-block-controls button.is-active,
:deep(.pic-print-block-controls button.is-active) {
    background: hsl(var(--pic-brand));
    color: white;
}

.pic-print-page-break-before::before,
:deep(.pic-print-page-break-before::before) {
    content: "Salto de pagina";
    position: relative;
    z-index: 80;
    display: inline-flex;
    grid-column: 1 / -1;
    width: max-content;
    margin: 0 0 8px 0;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.12);
    padding: 3px 8px;
    color: hsl(var(--pic-brand));
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.pic-pdf-render-page .pic-print-page-break-before::before,
:deep(.pic-pdf-render-page .pic-print-page-break-before::before) {
    display: none !important;
}

.pic-pdf-format-letter.pic-pdf-orientation-portrait {
    min-height: 1450px;
}

.pic-pdf-format-letter.pic-pdf-orientation-landscape {
    min-height: 865px;
}

.pic-pdf-format-a4.pic-pdf-orientation-portrait {
    min-height: 1584px;
}

.pic-pdf-format-a4.pic-pdf-orientation-landscape {
    min-height: 793px;
}

.pic-pdf-format-legal.pic-pdf-orientation-portrait {
    min-height: 1845px;
}

.pic-pdf-format-legal.pic-pdf-orientation-landscape {
    min-height: 680px;
}

.pic-hide-executiveSummary :deep([data-pic-print-section="executiveSummary"]),
.pic-hide-kpis :deep([data-pic-print-section="kpis"]),
.pic-hide-kgCharts :deep([data-pic-print-section="kgCharts"]),
.pic-hide-kgTable :deep([data-pic-print-section="kgTable"]),
.pic-hide-salesCharts :deep([data-pic-print-section="salesCharts"]),
.pic-hide-salesTable :deep([data-pic-print-section="salesTable"]),
.pic-hide-averageCharts :deep([data-pic-print-section="averageCharts"]),
.pic-hide-averageTable :deep([data-pic-print-section="averageTable"]),
.pic-hide-operationalBreakdown :deep([data-pic-print-section="operationalBreakdown"]),
.pic-hide-aiInsights :deep([data-pic-print-section="aiInsights"]) {
    display: none !important;
}

.pic-pdf-grayscale {
    filter: grayscale(1);
}

.pic-pdf-clean-controls :deep([data-pic-print-control="true"]) {
    display: none !important;
}

.pic-pdf-clean-controls :deep(.fa-chevron-right),
.pic-pdf-clean-controls :deep(.fa-chevron-down),
.pic-pdf-clean-controls :deep(.fa-chevron-up) {
    display: none !important;
}

.pic-pdf-avoid-breaks :deep([data-pic-print-section]),
.pic-pdf-avoid-breaks :deep(.pic-chart-cell),
.pic-pdf-avoid-breaks :deep(.pic-chart-card),
.pic-pdf-avoid-breaks :deep(.pic-report-table) {
    break-inside: avoid;
    page-break-inside: avoid;
}

.pic-pdf-spacing-compact :deep(.space-y-5 > :not([hidden]) ~ :not([hidden])),
.pic-pdf-spacing-compact :deep(.space-y-6 > :not([hidden]) ~ :not([hidden])),
.pic-pdf-spacing-compact :deep(.space-y-7 > :not([hidden]) ~ :not([hidden])) {
    margin-top: 12px !important;
}

.pic-pdf-spacing-spacious :deep(.space-y-5 > :not([hidden]) ~ :not([hidden])),
.pic-pdf-spacing-spacious :deep(.space-y-6 > :not([hidden]) ~ :not([hidden])),
.pic-pdf-spacing-spacious :deep(.space-y-7 > :not([hidden]) ~ :not([hidden])) {
    margin-top: 34px !important;
}

.pic-pdf-spacing-compact :deep([data-pic-print-section="kpis"]) {
    margin-bottom: 16px !important;
}

.pic-pdf-spacing-spacious :deep([data-pic-print-section="kpis"]) {
    margin-bottom: 36px !important;
}

.pic-pdf-export-mode :deep(.pic-report-table) {
    break-inside: avoid;
}

.pic-pdf-export-mode :deep(.pic-chart-row) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 24px !important;
    width: 100% !important;
}

.pic-pdf-export-mode.pic-pdf-spacing-compact :deep(.pic-chart-row) {
    gap: 16px !important;
}

.pic-pdf-export-mode.pic-pdf-spacing-spacious :deep(.pic-chart-row) {
    gap: 34px !important;
}

.pic-pdf-export-mode :deep(.pic-chart-cell),
.pic-pdf-export-mode :deep(.pic-chart-card),
.pic-pdf-export-mode :deep(.pic-chart-surface) {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box;
}

.pic-pdf-export-mode :deep(.pic-chart-card) {
    overflow: visible !important;
    min-height: 420px !important;
    padding: 22px !important;
}

.pic-pdf-export-mode :deep(.pic-chart-card > div:first-child) {
    align-items: flex-start !important;
    min-height: 44px !important;
    margin-bottom: 14px !important;
}

.pic-pdf-export-mode :deep(.pic-chart-card h3) {
    min-width: 0 !important;
    max-width: 100% !important;
    align-items: flex-start !important;
    line-height: 1.18 !important;
    font-size: 17px !important;
    white-space: normal !important;
}

.pic-pdf-export-mode :deep(.pic-chart-card h3 span) {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    word-break: normal !important;
}

.pic-pdf-export-mode :deep(.pic-chart-surface) {
    overflow: hidden !important;
}

.pic-pdf-export-mode :deep(.pic-report-table),
.pic-pdf-export-mode :deep(.pic-report-table-scroll) {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
}

.pic-pdf-export-mode :deep(.pic-report-table table) {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: auto;
}

.pic-pdf-export-mode :deep(.pic-report-table th),
.pic-pdf-export-mode :deep(.pic-report-table td) {
    padding-left: 8px !important;
    padding-right: 8px !important;
    font-size: 10px !important;
    white-space: normal !important;
    word-break: break-word;
}

.pic-pdf-export-mode :deep([data-pic-print-projection-table="true"] .sticky),
.pic-pdf-render-page :deep([data-pic-print-projection-table="true"] .sticky) {
    position: static !important;
    left: auto !important;
    top: auto !important;
    box-shadow: none !important;
}

.pic-pdf-render-page :deep(.pic-pdf-projection-table-chunk) {
    break-inside: avoid;
    overflow: visible !important;
}

.pic-pdf-font-large :deep(.pic-report-table th),
.pic-pdf-font-large :deep(.pic-report-table td) {
    font-size: 12px !important;
}

.pic-pdf-font-xlarge :deep(.pic-report-table th),
.pic-pdf-font-xlarge :deep(.pic-report-table td) {
    font-size: 14px !important;
}

.pic-pdf-font-large :deep(.pic-chart-card h3) {
    font-size: 20px !important;
}

.pic-pdf-font-xlarge :deep(.pic-chart-card h3) {
    font-size: 23px !important;
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

import { ref } from 'vue';
import { selloutAnalyticsApi } from '../services/selloutAnalyticsApi';
import { buildSelloutExportSheets } from '../utils/selloutExport';
import type { SelloutSummaryRequest } from '../types/selloutAnalytics';

export const useSelloutExport = () => {
  const isExporting = ref(false);
  const exportError = ref('');

  const exportWorkbook = async (payload: SelloutSummaryRequest) => {
    if (isExporting.value) return;
    isExporting.value = true;
    exportError.value = '';
    try {
      const [{ rows }, XLSX] = await Promise.all([
        selloutAnalyticsApi.exportMatrix(payload),
        import('xlsx'),
      ]);
      const sheets = buildSelloutExportSheets(rows, payload.periods, payload.filters, new Date());
      const workbook = XLSX.utils.book_new();
      const detailSheet = XLSX.utils.aoa_to_sheet(sheets.detail);
      const subtotalSheet = XLSX.utils.aoa_to_sheet(sheets.subtotals);
      const parameterSheet = XLSX.utils.aoa_to_sheet(sheets.parameters);
      detailSheet['!cols'] = [
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
        ...payload.periods.map(() => ({ wch: 13 })),
        { wch: 15 },
      ];
      subtotalSheet['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 18 },
        ...payload.periods.map(() => ({ wch: 13 })),
        { wch: 15 },
      ];
      parameterSheet['!cols'] = [{ wch: 20 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle');
      XLSX.utils.book_append_sheet(workbook, subtotalSheet, 'Subtotales');
      XLSX.utils.book_append_sheet(workbook, parameterSheet, 'Parametros');
      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `sellout-semanal-${dateStamp}.xlsx`);
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'No fue posible generar la exportación.';
    } finally {
      isExporting.value = false;
    }
  };

  return { isExporting, exportError, exportWorkbook };
};

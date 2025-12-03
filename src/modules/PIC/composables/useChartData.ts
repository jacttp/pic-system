/* src/modules/PIC/composables/useChartData.ts */
import { computed } from 'vue';
import type { PicDataRecord } from '../types/pic';
import { CHART_COLORS, CHART_COLORS_GREEN, MESES } from '@/utils/constants'; // Asegúrate de tener estas constantes migradas o defínelas aquí

export function useChartData() {
    
    // Función pura para procesar datos según el tipo (Pesos, Kilos, Promedio)
    const processData = (
        rawData: PicDataRecord[], 
        years: string[], 
        metricType: 'pesos' | 'kilos' | 'promedio',
        monthRange: { start: string, end: string }
    ) => {
        const startMonth = parseInt(monthRange.start, 10);
        const endMonth = parseInt(monthRange.end, 10);
        
        // 1. Estructura base (Filas por Mes)
        const rows = [];
        const chartLabels: string[] = [];
        
        // Colores según métrica
        const colors = metricType === 'promedio' ? CHART_COLORS_GREEN : CHART_COLORS;

        for (let i = startMonth; i <= endMonth; i++) {
            const mesIndex = i - 1;
            const mesNombre = MESES[mesIndex];
            chartLabels.push(mesNombre);

            // Objeto fila base
            const row: any = { 
                mes: i, 
                nombre: mesNombre 
            };

            // Llenar datos por año
            years.forEach(year => {
                // Buscar el registro exacto en los datos crudos
                const record = rawData.find(d => d.Año == year && d.Mes == i);
                
                let value = 0;
                let meta = 0;

                if (record) {
                    if (metricType === 'pesos') value = record.TotalVentaPesos;
                    else if (metricType === 'kilos') {
                        value = record.TotalVentaKG;
                        meta = record.TotalMetasKG;
                    }
                    else if (metricType === 'promedio') {
                        // Cálculo seguro del promedio
                        value = record.TotalVentaKG ? (record.TotalVentaPesos / record.TotalVentaKG) : 0;
                    }
                }

                row[year] = value;
                if (metricType === 'kilos') row[`meta_${year}`] = meta;
            });

            rows.push(row);
        }

        // 2. Estructura para Chart.js (Datasets)
        const chartDatasets = years.map((year, index) => ({
            label: metricType === 'promedio' ? `Promedio ${year}` : (metricType === 'kilos' ? `Venta KG ${year}` : `Venta $ ${year}`),
            data: rows.map(r => r[year]),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderRadius: 4,
            tension: 0.1
        }));

        // Caso especial: Metas en Kilos (Línea)
        if (metricType === 'kilos') {
            const lastYear = years[years.length - 1]; // Año más reciente para la meta
            chartDatasets.push({
                label: `Meta KG ${lastYear}`,
                data: rows.map(r => r[`meta_${lastYear}`]),
                type: 'line' as any, // Forzamos tipo línea
                borderColor: '#a855f7', // Morado
                backgroundColor: '#a855f7',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 3
            } as any);
        }

        return {
            tableRows: rows,
            chartData: {
                labels: chartLabels,
                datasets: chartDatasets
            }
        };
    };

    return {
        processData
    };
}
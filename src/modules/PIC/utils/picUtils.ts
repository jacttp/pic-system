/* src/modules/PIC/utils/picUtils.ts */
import { formatCurrency, formatNumber } from './formatters';

// Constantes visuales
export const CHART_COLORS = ['#2563eb', '#9333ea', '#db2777', '#f97316', '#16a34a', '#0891b2', '#facc15'];
export const CHART_COLORS_GREEN = ['#22c55e', '#16a34a', '#15803d', '#14532d'];
export const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Re-exportamos para que los componentes puedan usarlos desde aquí si quieren
export { formatCurrency, formatNumber };

/**
 * Pivotea los datos planos de la API para organizarlos por Mes y Año.
 */
export function processChartData(rawData: any[], years: string[], metricType: 'pesos' | 'kilos' | 'promedio') {
    const processed = new Array(12).fill(null).map((_, i) => ({   
        nombre: MONTH_NAMES[i],
        mesIndex: i + 1,
        // Inicializamos cada año en 0
        ...years.reduce((acc, year) => ({ ...acc, [year]: 0, [`meta_${year}`]: 0 }), {})
    }));

    // Llenado de datos
    rawData.forEach(item => {
        const mesIdx = parseInt(item.Mes) - 1;
        const anio = String(item.Año);
        
        if (processed[mesIdx] && years.includes(anio)) {
            const row = processed[mesIdx] as any;
            
            if (metricType === 'pesos') {
                row[anio] = item.TotalVentaPesos || 0;
            } else if (metricType === 'kilos') {
                row[anio] = item.TotalVentaKG || 0;
                row[`meta_${anio}`] = item.TotalMetasKG || 0;
            } else if (metricType === 'promedio') {
                // Cálculo seguro del promedio
                const venta = item.TotalVentaPesos || 0;
                const kilos = item.TotalVentaKG || 0;
                row[anio] = kilos !== 0 ? venta / kilos : 0;
            }
        }
    });

    return processed;
}

/**
 * Genera la configuración para Chart.js con escalas inteligentes y seguras.
 */
export function getChartConfig(labels: string[], datasets: any[], type: 'bar' | 'line' = 'bar') {
    
    // 1. APLANAR DATOS: Obtenemos todos los valores numéricos de todos los datasets para analizarlos
    const allValues = datasets.flatMap(ds => ds.data).filter(v => v !== null && v !== undefined);
    
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal;
    
    // 2. CÁLCULO DE GRACE (MARGEN): 25% del rango
    const graceVal = range * 0.25;

    // 3. DECISIÓN DE PISO (La lógica "Que no floten")
    // Si al restar el margen (grace) al valor más bajo, cruzamos el cero...
    // ...entonces FORZAMOS el inicio en 0 para evitar el eje negativo (-500k).
    // Si no cruzamos el cero (ej: ventas de 2M a 2.5M), dejamos que el zoom actúe.
    let forcedMin = undefined;
    
    if (minVal >= 0 && (minVal - graceVal) < 0) {
        forcedMin = 0; // Anclar al piso si el margen nos llevaría a negativos
    }

    return {
        type,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                tooltip: { 
                    mode: 'index' as const,
                    intersect: false,
                    callbacks: {
                        label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label.includes('KG') || context.dataset.label.includes('Meta')) {
                                    label += formatNumber(context.parsed.y) + ' KG';
                                } else {
                                    label += formatCurrency(context.parsed.y);
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false, // Siempre intentamos hacer zoom...
                    min: forcedMin,     // ...pero respetamos el piso 0 si es necesario.
                    grace: '25%',       // Mantenemos el aire visual arriba/abajo.
                    
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        callback: function(value: any) {
                            if (value >= 1000000) return (value/1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value/1000).toFixed(0) + 'k';
                            return value;
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    };
}
/* Calcula la estructura completa para una tabla de datos (Filas + Totales + Comparativas)*/

export function calculateTableData(
    processedData: any[], 
    years: string[], 
    metricType: 'pesos' | 'kilos' | 'promedio',
    isFrozen: boolean
) {
    // Ordenar años ascendente
    const sortedYears = [...years].sort();
    const currentYear = sortedYears[sortedYears.length - 1]; // Año más reciente
    const prevYear = sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : null;
    
    // Fecha actual para lógica de candado
    const today = new Date();
    const currentMonthIdx = today.getMonth() + 1; // 1-12
    const currentRealYear = today.getFullYear();

    // 1. Acumuladores para el Footer
    const totals: Record<string, number> = {};
    sortedYears.forEach(y => totals[y] = 0);
    if (metricType === 'kilos') totals[`meta_${currentYear}`] = 0;

    // 2. Procesar Filas
    const rows = processedData.map(row => {
        const rowData: any = { ...row };
        const isCurrentMonth = String(currentYear) === String(currentRealYear) && row.mesIndex === currentMonthIdx;
        const isFutureMonth = String(currentYear) === String(currentRealYear) && row.mesIndex > currentMonthIdx;

        // Sumar totales
        sortedYears.forEach(y => {
            const val = row[y] || 0;
            // Para promedio, no sumamos tal cual, pero por ahora sumaremos para sacar avg al final si es necesario
            // Ojo: El footer de promedio se calcula distinto (Promedio de promedios o Global).
            // Para simplificar, sumamos valores y luego ajustamos en el footer.
            totals[y] += val; 
            
            if (metricType === 'kilos' && String(y) === String(currentYear)) {
                totals[`meta_${y}`] += (row[`meta_${y}`] || 0);
            }
        });

        // Lógica de Comparativa (Solo si hay año anterior)
        if (prevYear) {
            // Si es mes futuro o (es mes actual Y está congelado), no mostramos diff
            const shouldHideDiff = isFutureMonth || (isCurrentMonth && isFrozen);

            if (shouldHideDiff) {
                rowData.diff = null;
                rowData.growth = null;
                rowData.diffMeta = null;
                rowData.varMeta = null;
            } else {
                const valCurr = row[currentYear] || 0;
                const valPrev = row[prevYear] || 0;
                
                rowData.diff = valCurr - valPrev;
                rowData.growth = valPrev !== 0 ? (rowData.diff / valPrev) * 100 : 0;

                if (metricType === 'kilos') {
                    const meta = row[`meta_${currentYear}`] || 0;
                    rowData.diffMeta = valCurr - meta;
                    rowData.varMeta = meta !== 0 ? (valCurr / meta) * 100 : 0;
                }
            }
        }
        return rowData;
    });

    // 3. Calcular Footer Comparativo
    const footer: any = { ...totals };
    if (prevYear) {
        const totalCurr = totals[currentYear];
        const totalPrev = totals[prevYear];
        
        // Ajuste para Promedio: El total no es la suma, es el promedio global (recalculado idealmente)
        // Nota: Si metricType es promedio, el total aquí es la suma de promedios (incorrecto). 
        // Para v2.1 simplificado, dividiremos por 12 o meses activos, o lo dejaremos como suma si la API no da el dato.
        // *Mejor estrategia:* Si es promedio, recalculamos el footer dividiendo por el conteo de meses con datos.
        
        if (metricType === 'promedio') {
            let countCurr = 0, countPrev = 0;
            rows.forEach(r => { if(r[currentYear] > 0) countCurr++; if(r[prevYear] > 0) countPrev++; });
            footer[currentYear] = countCurr > 0 ? footer[currentYear] / countCurr : 0;
            footer[prevYear] = countPrev > 0 ? footer[prevYear] / countPrev : 0;
        }

        const finalCurr = footer[currentYear];
        const finalPrev = footer[prevYear];

        footer.diff = finalCurr - finalPrev;
        footer.growth = finalPrev !== 0 ? (footer.diff / finalPrev) * 100 : 0;

        if (metricType === 'kilos') {
            const totalMeta = totals[`meta_${currentYear}`];
            footer.diffMeta = totalCurr - totalMeta;
            footer.varMeta = totalMeta !== 0 ? (totalCurr / totalMeta) * 100 : 0;
        }
    }

    return { rows, footer, sortedYears, currentYear, prevYear };
}

/* Calcula los totales anuales para gráficos simples.*/

export function processAnnualData(rawData: any[], years: string[], metricType: 'pesos' | 'kilos' | 'promedio') {
    // Inicializar acumuladores por año
    const totals: Record<string, number> = {};
    years.forEach(y => totals[y] = 0);

    // Sumarizar
    rawData.forEach(item => {
        const anio = String(item.Año);
        if (years.includes(anio)) {
            if (metricType === 'pesos') {
                totals[anio] += (item.TotalVentaPesos || 0);
            } else if (metricType === 'kilos') {
                totals[anio] += (item.TotalVentaKG || 0);
            } else if (metricType === 'promedio') {
                // Para promedio anual necesitamos acumuladores auxiliares, no se pueden sumar promedios
                // Pero como rawData ya viene desagregado, necesitamos lógica extra. 
                // TRUCO: Usaremos acumuladores de ventas y kilos temporales
                if (!totals[`_ventas_${anio}`]) totals[`_ventas_${anio}`] = 0;
                if (!totals[`_kilos_${anio}`]) totals[`_kilos_${anio}`] = 0;
                
                totals[`_ventas_${anio}`] += (item.TotalVentaPesos || 0);
                totals[`_kilos_${anio}`] += (item.TotalVentaKG || 0);
            }
        }
    });

    // Calcular valores finales para el array de datos
    return years.map(year => {
        if (metricType === 'promedio') {
            const v = totals[`_ventas_${year}`] || 0;
            const k = totals[`_kilos_${year}`] || 0;
            return k !== 0 ? v / k : 0;
        }
        return totals[year];
    });
}
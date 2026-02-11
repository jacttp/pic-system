/* src/modules/CustomerSegmentation/composables/useExport.ts */

import type { ClientSegment, SegmentationResponse } from '../types/segmentation.types'
import { useFormatters } from './useFormatters'

/**
 * Composable para exportación de datos de segmentación.
 * Soporta CSV (nativo) y generación de descarga de archivos.
 */
export function useExport() {
   const { formatNumber, formatPercent } = useFormatters()

   // ─────────────────────────────────────────────
   // UTILIDADES INTERNAS
   // ─────────────────────────────────────────────

   const escapeCSVCell = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
         return `"${str.replace(/"/g, '""')}"`
      }
      return str
   }

   const downloadFile = (content: string, filename: string, mimeType: string) => {
      const BOM = mimeType.includes('csv') ? '\uFEFF' : ''
      const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8;` })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
   }

   const buildFilename = (prefix: string, ext: string): string => {
      const date = new Date().toISOString().split('T')[0]
      return `${prefix}_${date}.${ext}`
   }

   // ─────────────────────────────────────────────
   // EXPORTAR RESUMEN DE SEGMENTOS (CSV)
   // ─────────────────────────────────────────────

   const exportSegmentsSummaryCSV = (data: SegmentationResponse) => {
      const unit = data.statistics.unit

      const headers = [
         'Segmento',
         'Descripción',
         'Clientes',
         '% Clientes',
         '% Clientes Acum.',
         `Volumen (${unit})`,
         '% Volumen',
         '% Volumen Acum.',
         `Ticket Promedio (${unit})`,
         `Rango Mín (${unit})`,
         `Rango Máx (${unit})`,
         'Estrategia'
      ]

      const rows = data.segments.map(s => [
         s.id,
         s.label,
         s.clientCount,
         formatPercent(s.clientPercent),
         formatPercent(s.clientPercentAccum),
         formatNumber(s.volume, 0),
         formatPercent(s.volumePercent),
         formatPercent(s.volumePercentAccum),
         formatNumber(s.avgTicket, 0),
         formatNumber(s.range.min, 0),
         formatNumber(s.range.max, 0),
         s.recommendation?.strategy ?? ''
      ])

      // Agregar fila de totales
      rows.push([
         'TOTAL',
         '',
         data.totalClients,
         '100.00%',
         '',
         formatNumber(data.totalVolume, 0),
         '100.00%',
         '',
         formatNumber(data.totalVolume / data.totalClients, 0),
         '',
         '',
         ''
      ])

      const csv = [
         headers.map(escapeCSVCell).join(','),
         ...rows.map(row => row.map(escapeCSVCell).join(','))
      ].join('\n')

      downloadFile(csv, buildFilename('segmentacion_resumen', 'csv'), 'text/csv')
   }

   // ─────────────────────────────────────────────
   // EXPORTAR ESTADÍSTICAS (CSV)
   // ─────────────────────────────────────────────

   const exportStatisticsCSV = (data: SegmentationResponse) => {
      const { statistics, pareto } = data
      const unit = statistics.unit

      const rows = [
         ['ESTADÍSTICAS DESCRIPTIVAS', ''],
         ['Total Clientes', statistics.count],
         [`Volumen Total (${unit})`, formatNumber(statistics.sum, 2)],
         [`Media (${unit})`, formatNumber(statistics.mean, 2)],
         [`Mediana (${unit})`, formatNumber(statistics.median, 2)],
         [`Desviación Estándar (${unit})`, formatNumber(statistics.stdDev, 2)],
         [`Varianza`, formatNumber(statistics.variance, 2)],
         [`Mínimo (${unit})`, formatNumber(statistics.min, 2)],
         [`Máximo (${unit})`, formatNumber(statistics.max, 2)],
         [`Q1 (${unit})`, formatNumber(statistics.quartiles[0], 2)],
         [`Q2 / Mediana (${unit})`, formatNumber(statistics.quartiles[1], 2)],
         [`Q3 (${unit})`, formatNumber(statistics.quartiles[2], 2)],
         ['', ''],
         ['ANÁLISIS PARETO', ''],
         ['% Clientes Top', formatPercent(pareto.topClientsPercent)],
         ['N° Clientes Top', pareto.topClientsCount],
         ['% Volumen de Clientes Top', formatPercent(pareto.topVolumePercent)],
         [`Valor de Corte (${unit})`, formatNumber(pareto.cutoffValue, 2)],
         ['Índice Gini', pareto.giniIndex],
         ['', ''],
         ['OUTLIERS (Valores Atípicos)', ''],
         ['Cliente', `Volumen (${unit})`],
         ...statistics.outliers.map(o => [o.clientName, formatNumber(o.value, 2)])
      ]

      const csv = rows
         .map(row => row.map(escapeCSVCell).join(','))
         .join('\n')

      downloadFile(csv, buildFilename('segmentacion_estadisticas', 'csv'), 'text/csv')
   }

   // ─────────────────────────────────────────────
   // EXPORTAR LISTA DE CLIENTES (CSV)
   // Recibe los clientes ya obtenidos del store (todos los segmentos)
   // ─────────────────────────────────────────────

   const exportClientsCSV = (
      segments: ClientSegment[],
      clientsPerSegment: Map<string, Array<{
         clientId: string
         clientName: string
         gerencia: string
         jefatura: string
         ruta: string
         canal: string
         volume: number
         volumeRank: number
         activeMonths: number
         topProduct?: string
      }>>,
      unit: string
   ) => {
      const headers = [
         'Segmento',
         'Descripción Segmento',
         'Ranking Segmento',
         'ID Cliente (Matriz)',
         'Nombre Cliente',
         'Canal',
         'Gerencia',
         'Jefatura',
         'Ruta',
         `Volumen (${unit})`,
         'Meses Activos',
         'Producto Principal'
      ]

      const rows: (string | number)[][] = []

      segments.forEach(segment => {
         const clients = clientsPerSegment.get(segment.id) ?? []
         clients.forEach((client, idx) => {
            rows.push([
               segment.id,
               segment.label,
               idx + 1,
               client.clientId,
               client.clientName,
               client.canal,
               client.gerencia,
               client.jefatura,
               client.ruta,
               formatNumber(client.volume, 0),
               client.activeMonths,
               client.topProduct ?? ''
            ])
         })
      })

      const csv = [
         headers.map(escapeCSVCell).join(','),
         ...rows.map(row => row.map(escapeCSVCell).join(','))
      ].join('\n')

      downloadFile(csv, buildFilename('segmentacion_clientes', 'csv'), 'text/csv')
   }

   // ─────────────────────────────────────────────
   // EXPORTAR REPORTE COMPLETO (CSV multi-sección)
   // ─────────────────────────────────────────────

   const exportFullReportCSV = (data: SegmentationResponse) => {
      const unit = data.statistics.unit
      const { statistics, pareto, segments } = data

      const lines: string[] = []

      // Encabezado del reporte
      lines.push(`REPORTE DE SEGMENTACIÓN DE CLIENTES`)
      lines.push(`Generado: ${new Date(data.generatedAt).toLocaleString('es-MX')}`)
      lines.push(`Tipo de agrupación: ${data.groupType}`)
      lines.push(`Métrica: ${unit}`)
      lines.push(`Total Clientes: ${statistics.count}`)
      lines.push(`Volumen Total: ${formatNumber(statistics.sum, 0)} ${unit}`)
      lines.push('')

      // Resumen de segmentos
      lines.push('RESUMEN DE SEGMENTOS')
      lines.push(['ID', 'Descripción', 'Clientes', '% Clientes', '% Vol.', '% Vol. Acum.', `Ticket Prom. (${unit})`].map(escapeCSVCell).join(','))
      segments.forEach(s => {
         lines.push([
            s.id,
            s.label,
            s.clientCount,
            formatPercent(s.clientPercent),
            formatPercent(s.volumePercent),
            formatPercent(s.volumePercentAccum),
            formatNumber(s.avgTicket, 0)
         ].map(escapeCSVCell).join(','))
      })
      lines.push('')

      // Pareto
      lines.push('ANÁLISIS PARETO')
      lines.push(`El ${formatPercent(pareto.topClientsPercent)} de clientes (${pareto.topClientsCount}) generan el ${formatPercent(pareto.topVolumePercent)} del volumen`)
      lines.push(`Índice Gini: ${pareto.giniIndex}`)
      lines.push('')

      // Top productos por segmento
      lines.push('TOP PRODUCTOS POR SEGMENTO')
      lines.push(['Segmento', 'Producto', '% en Segmento'].map(escapeCSVCell).join(','))
      segments.forEach(s => {
         s.topProducts.forEach(p => {
            lines.push([s.id, p.sku, formatPercent(p.percent)].map(escapeCSVCell).join(','))
         })
      })

      downloadFile(lines.join('\n'), buildFilename('segmentacion_completa', 'csv'), 'text/csv')
   }

   return {
      exportSegmentsSummaryCSV,
      exportStatisticsCSV,
      exportClientsCSV,
      exportFullReportCSV
   }
}
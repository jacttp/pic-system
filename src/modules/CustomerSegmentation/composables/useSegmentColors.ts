/* src/modules/CustomerSegmentation/composables/useSegmentColors.ts */

import type { GroupType } from '../types/segmentation.types'

/**
 * Composable para gestión de paleta de colores de segmentos
 * Gradiente tipo semáforo: Verde (alto valor) → Rojo (bajo valor)
 */
export function useSegmentColors() {

   // Paleta principal de colores (de mejor a peor segmento)
   const colorPalette = {
      quintiles: [
         { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', hex: '#10b981' },
         { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', hex: '#34d399' },
         { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', hex: '#fbbf24' },
         { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', hex: '#fb923c' },
         { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', hex: '#f87171' }
      ],
      quartiles: [
         { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', hex: '#10b981' },
         { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', hex: '#34d399' },
         { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', hex: '#fb923c' },
         { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', hex: '#f87171' }
      ],
      deciles: [
         { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', hex: '#10b981' },
         { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', hex: '#22c55e' },
         { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', hex: '#34d399' },
         { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', hex: '#10b981' },
         { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', hex: '#fbbf24' },
         { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', hex: '#fde047' },
         { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', hex: '#fb923c' },
         { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', hex: '#fdba74' },
         { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', hex: '#f87171' },
         { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', hex: '#fca5a5' }
      ]
   }

   /**
    * Obtiene el color para un segmento específico
    */
   const getSegmentColor = (segmentIndex: number, groupType: GroupType) => {
      const palette = colorPalette[groupType] || colorPalette.quintiles

      // Para percentiles, interpolar
      if (groupType === 'percentiles') {
         return interpolatePercentileColor(segmentIndex)
      }

      // Asegurar que el índice esté dentro del rango
      const index = Math.min(segmentIndex, palette.length - 1)
      return palette[index]
   }

   /**
    * Interpola color para percentiles (0-99)
    */
   const interpolatePercentileColor = (percentileIndex: number) => {
      // Mapear percentiles a escala 0-4 (5 colores base)
      const normalized = (percentileIndex / 100) * 4
      const baseIndex = Math.floor(normalized)

      const baseColors = colorPalette.quintiles
      const color = baseColors[Math.min(baseIndex, baseColors.length - 1)]

      return color
   }

   /**
    * Genera array de colores hex para ECharts
    */
   const getChartColors = (groupType: GroupType) => {
      const palette = colorPalette[groupType] || colorPalette.quintiles
      return palette.map(c => c.hex)
   }

   /**
    * Obtiene color de progreso según porcentaje acumulado
    */
   const getProgressColor = (accumulatedPercent: number): string => {
      if (accumulatedPercent >= 80) return 'bg-green-500'
      if (accumulatedPercent >= 60) return 'bg-emerald-500'
      if (accumulatedPercent >= 40) return 'bg-yellow-500'
      if (accumulatedPercent >= 20) return 'bg-orange-500'
      return 'bg-red-500'
   }

   /**
    * Obtiene estilo completo para badge de segmento
    */
   const getSegmentBadgeClasses = (segmentIndex: number, groupType: GroupType): string => {
      const color = getSegmentColor(segmentIndex, groupType)
      return `${color.bg} ${color.border} ${color.text} border px-3 py-1 rounded-lg font-semibold text-sm`
   }

   return {
      getSegmentColor,
      getChartColors,
      getProgressColor,
      getSegmentBadgeClasses
   }
}
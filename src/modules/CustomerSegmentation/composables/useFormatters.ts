/* src/modules/CustomerSegmentation/composables/useFormatters.ts */

/**
 * Composable para formateo de valores numéricos en el módulo de segmentación
 */
export function useFormatters() {
   /**
    * Formatea un número con separadores de miles
    * Ej: 12500.5 -> 12,500.50
    */
   const formatNumber = (value: number, decimals: number = 2): string => {
      return new Intl.NumberFormat('es-MX', {
         minimumFractionDigits: decimals,
         maximumFractionDigits: decimals
      }).format(value)
   }

   /**
    * Formatea un valor en KG con unidad
    * Ej: 12500 -> 12,500 KG
    */
   const formatVolume = (value: number): string => {
      return `${formatNumber(value, 0)} KG`
   }

   /**
    * Formatea un valor monetario en pesos MXN
    * Ej: 12500.50 -> $12,500.50
    */
   const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('es-MX', {
         style: 'currency',
         currency: 'MXN',
         minimumFractionDigits: 2,
         maximumFractionDigits: 2
      }).format(value)
   }

   /**
    * Formatea un porcentaje
    * Ej: 0.6525 -> 65.25%
    * Ej: 65.25 -> 65.25%
    */
   const formatPercent = (value: number, decimals: number = 2): string => {
      const normalized = value > 1 ? value : value * 100
      return `${formatNumber(normalized, decimals)}%`
   }

   /**
    * Formatea un número de manera compacta para KPIs
    * Ej: 1500 -> 1.5K
    * Ej: 1500000 -> 1.5M
    */
   const formatCompact = (value: number): string => {
      if (value >= 1_000_000) {
         return `${(value / 1_000_000).toFixed(1)}M`
      }
      if (value >= 1_000) {
         return `${(value / 1_000).toFixed(1)}K`
      }
      return formatNumber(value, 0)
   }

   /**
    * Formatea un rango de valores
    * Ej: (1000, 5000, 'KG') -> "1,000 - 5,000 KG"
    */
   const formatRange = (min: number, max: number, unit: string): string => {
      return `${formatNumber(min, 0)} - ${formatNumber(max, 0)} ${unit}`
   }

   /**
    * Formatea índice Gini como porcentaje legible
    * Ej: 0.6284 -> "62.84% de desigualdad"
    */
   const formatGini = (value: number): string => {
      const percent = (value * 100).toFixed(2)
      return `${percent}%`
   }

   /**
    * Obtiene color según percentil de volumen
    * Usado para badges y indicadores visuales
    */
   const getPercentileColor = (percent: number): string => {
      if (percent >= 80) return 'text-green-600 bg-green-50 border-green-200'
      if (percent >= 60) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      if (percent >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      if (percent >= 20) return 'text-orange-600 bg-orange-50 border-orange-200'
      return 'text-red-600 bg-red-50 border-red-200'
   }

   /**
    * Obtiene color según estrategia comercial
    */
   const getStrategyColor = (strategy: string): string => {
      const colors: Record<string, string> = {
         retain: 'text-green-700 bg-green-100 border-green-300',
         grow: 'text-blue-700 bg-blue-100 border-blue-300',
         recover: 'text-orange-700 bg-orange-100 border-orange-300',
         monitor: 'text-gray-700 bg-gray-100 border-gray-300'
      }
      return colors[strategy] || colors.monitor
   }

   return {
      formatNumber,
      formatVolume,
      formatCurrency,
      formatPercent,
      formatCompact,
      formatRange,
      formatGini,
      getPercentileColor,
      getStrategyColor
   }
}
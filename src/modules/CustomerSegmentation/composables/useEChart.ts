/* src/modules/CustomerSegmentation/composables/useEChart.ts */

import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as echarts from 'echarts/core'
import {
   BarChart,
   ScatterChart,
   LineChart,
   BoxplotChart,
   CustomChart
} from 'echarts/charts'
import {
   TitleComponent,
   TooltipComponent,
   GridComponent,
   LegendComponent,
   DataZoomComponent,
   MarkLineComponent,
   MarkAreaComponent,
   ToolboxComponent,
   VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// Registrar sólo lo que se usa (tree-shaking)
echarts.use([
   BarChart,
   ScatterChart,
   LineChart,
   BoxplotChart,
   CustomChart,
   TitleComponent,
   TooltipComponent,
   GridComponent,
   LegendComponent,
   DataZoomComponent,
   MarkLineComponent,
   MarkAreaComponent,
   ToolboxComponent,
   VisualMapComponent,
   CanvasRenderer
])

/**
 * Composable que gestiona el ciclo de vida de una instancia ECharts
 */
export function useEChart(containerRef: Ref<HTMLDivElement | null>) {
   let instance: echarts.ECharts | null = null
   const isReady = ref(false)

   const init = () => {
      if (!containerRef.value || instance) return
      instance = echarts.init(containerRef.value, null, { renderer: 'canvas' })
      isReady.value = true
   }

   const setOption = (option: echarts.EChartsOption, clear = false) => {
      if (!instance) return
      if (clear) instance.clear()
      instance.setOption(option, { notMerge: clear })
   }

   const resize = () => {
      instance?.resize()
   }

   const dispose = () => {
      instance?.dispose()
      instance = null
      isReady.value = false
   }

   const on = (event: string, handler: (params: any) => void) => {
      instance?.on(event, handler)
   }

   onMounted(() => {
      init()
      window.addEventListener('resize', resize)
   })

   onUnmounted(() => {
      window.removeEventListener('resize', resize)
      dispose()
   })

   return { isReady, setOption, resize, dispose, on }
}

// Tema de colores compartido para todos los gráficos
export const CHART_COLORS = {
   quintiles: ['#10b981', '#34d399', '#fbbf24', '#fb923c', '#f87171'],
   quartiles: ['#10b981', '#34d399', '#fb923c', '#f87171'],
   deciles: [
      '#059669', '#10b981', '#34d399', '#6ee7b7',
      '#fcd34d', '#fbbf24',
      '#f97316', '#fb923c',
      '#ef4444', '#f87171'
   ],
   base: {
      grid: '#e2e8f0',
      text: '#64748b',
      textDark: '#1e293b',
      tooltip: {
         bg: '#1e293b',
         border: '#334155',
         text: '#f1f5f9'
      }
   }
}

// Configuración base reutilizable para tooltips
export const baseTooltipStyle = {
   backgroundColor: CHART_COLORS.base.tooltip.bg,
   borderColor: CHART_COLORS.base.tooltip.border,
   textStyle: { color: CHART_COLORS.base.tooltip.text, fontSize: 12 },
   extraCssText: 'border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);'
}

// Grid base con márgenes estándar
export const baseGrid = {
   top: 40,
   right: 30,
   bottom: 60,
   left: 70,
   containLabel: true
}
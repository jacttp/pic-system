import { defineStore } from 'pinia';
import { ref } from 'vue';

import { picApi } from '../services/picApi';
import type { AiQueryConfig, DynamicWidget, ChatMessage, PicChatDashboardContext } from '../types/picTypes';
import { usePicFilterStore } from './picFilterStore';
import { getEChartConfig, getEChartPieConfig, getSeriesColor } from '../utils/picUtils';

interface ChatContext {
   id: string;
   title: string;
   data: any;
   type: 'chart' | 'table';
}

const metricViewMap: Record<AiQueryConfig['metric'], 'TotalVentaKG' | 'TotalVentaPesos' | 'TotalMetasKG'> = {
   VENTA_KG: 'TotalVentaKG',
   'VENTA_$$': 'TotalVentaPesos',
   METAS_KG: 'TotalMetasKG'
};

const metricLabelMap: Record<AiQueryConfig['metric'], string> = {
   VENTA_KG: 'Venta (KG)',
   'VENTA_$$': 'Venta ($)',
   METAS_KG: 'Meta (KG)'
};

const metricViewLabelMap: Record<'TotalVentaKG' | 'TotalVentaPesos' | 'TotalMetasKG', string> = {
   TotalVentaKG: 'Venta (KG)',
   TotalVentaPesos: 'Venta ($)',
   TotalMetasKG: 'Meta (KG)'
};

const normalizeDimensionKey = (dimension: string) => {
   if (dimension === 'Anio' || dimension === 'A_o') return 'Año';
   return dimension;
};

export const usePicChatStore = defineStore('picChat', () => {
   // --- ESTADO ---
   const messages = ref<ChatMessage[]>([]);
   const isLoading = ref(false);
   const activeContext = ref<ChatContext | null>(null);
   const isReportActive = ref(false);
   const filterStore = usePicFilterStore();
   const selectedModel = ref<string>('openai'); // Default

   // --- ACCIONES BÁSICAS ---
   function initChat() {
      if (messages.value.length === 0) {
         addMessage('assistant', 'Hola, soy tu analista virtual de PIC. Puedes pedirme datos específicos o generar reportes.');
      }
   }
   function setModel(modelId: string) {
      selectedModel.value = modelId;
   }

   function addMessage(role: 'user' | 'assistant' | 'system', text: string, chartConfig: AiQueryConfig | null = null) {
      const id = Date.now().toString() + Math.random().toString();
      messages.value.push({
         id,
         role,
         text,
         timestamp: new Date(),
         chartConfig
      });
      return id;
   }

   // Efecto typewriter: anima el texto carácter por carácter
   function typewriterMessage(role: 'user' | 'assistant' | 'system', fullText: string, chartConfig: AiQueryConfig | null = null): Promise<string> {
      const id = Date.now().toString() + Math.random().toString();
      messages.value.push({ id, role, text: '', timestamp: new Date(), chartConfig, isTyping: true });

      return new Promise((resolve) => {
         let i = 0;
         const SPEED_MS = 18; // ms por carácter (~55 chars/seg)
         const msg = messages.value.find(m => m.id === id)!;

         const tick = () => {
            if (i < fullText.length) {
               msg.text = fullText.slice(0, ++i);
               setTimeout(tick, SPEED_MS);
            } else {
               msg.isTyping = false; // ocultar cursor
               resolve(id);
            }
         };
         setTimeout(tick, SPEED_MS);
      });
   }

   function setContext(title: string, data: any, type: 'chart' | 'table') {
      activeContext.value = {
         id: Date.now().toString(),
         title,
         data,
         type
      };
      console.log("Contexto establecido:", title);
   }

   function clearContext() {
      activeContext.value = null;
   }

   function clearChat() {
      messages.value = [];
      clearContext();
      initChat();
   }

   function buildDashboardContext(): PicChatDashboardContext {
      const filters: Record<string, any> = {};
      const mappings: Record<string, string> = {
         Transaccion: 'TRANSACCION',
         FormatoCliente: 'formatocte',
         Anio: 'Anio',
         SKU: 'SKU_NOMBRE'
      };

      for (const [key, value] of Object.entries(filterStore.selected)) {
         if (key === 'usarRangoMeses') continue;
         if (Array.isArray(value) && value.length > 0) {
            filters[mappings[key] || key] = [...value];
         } else if (typeof value === 'string' && value) {
            filters[mappings[key] || key] = value;
         }
      }

      if (filterStore.selectedClients.size > 0) {
         filters.IDCLIENTE = Array.from(filterStore.selectedClients.keys());
      }

      return {
         filters,
         visualContext: activeContext.value ? {
            title: activeContext.value.title,
            type: activeContext.value.type,
            data: activeContext.value.data
         } : null
      };
   }

   async function sendMessage(userText: string) {
      if (!userText.trim()) return;

      // 1. Agregar mensaje del usuario a la UI inmediatamente
      addMessage('user', userText);
      isLoading.value = true;

      try {
         // --- A. PREPARAR MEMORIA (HISTORIAL) ---
         // Tomamos los últimos 10 mensajes previos para dar contexto
         // Excluimos el mensaje actual (que acabamos de agregar) y los mensajes de error (system)
         const history = messages.value
            .slice(0, -1) // Ignoramos el mensaje actual
            .slice(-10)   // Limitamos a 10 turnos para ahorrar tokens
            .filter(m => m.role !== 'system')
            .map(m => ({
               role: m.role === 'user' ? 'user' : 'model', // Gemini usa 'model', no 'assistant'
               parts: [{ text: m.text }]
            }));

         const dashboardContext = buildDashboardContext();

         // --- C. LLAMADA A LA API ---
         const response = await picApi.sendChatPrompt(userText, history, selectedModel.value, dashboardContext);

         // --- D. PROCESAR RESPUESTA ---
         if (response.explanation) {
            if (response.queryConfig) {
               // Respuesta con gráfico: texto instantáneo + botón de visualizar
               const msgId = addMessage('assistant', response.explanation, response.queryConfig);
               await visualizeData(msgId, true);
            } else {
               // Respuesta conversacional: efecto typewriter ✨
               await typewriterMessage('assistant', response.explanation);
            }
         }

         // Limpiamos el contexto visual después de usarlo
         clearContext();

      } catch (error: any) {
         const errorMsg = error.response?.data?.message || 'Hubo un error técnico al procesar tu solicitud.';
         addMessage('system', errorMsg);
         console.error("Chat Error:", error);
      } finally {
         isLoading.value = false;
      }
   }

   async function visualizeData(messageId: string, force = false) {
      const message = messages.value.find(m => m.id === messageId);
      if (!message || !message.chartConfig) return;

      // Evitar doble loading si el usuario hace clic varias veces rápido
      if (isLoading.value && !force) return;
      isLoading.value = true;

      try {
         // 1. Ejecutar Query a la API (Obtener los datos crudos)
         const data = await picApi.executeAiQuery(message.chartConfig);

         if (!data || data.length === 0) {
            message.text += "\n\n(La consulta no devolvió datos para visualizar).";
            return;
         }

         setContext(
            `Resultado: ${message.chartConfig.metric} por ${message.chartConfig.dimensions.join(', ')}`, // Título
            data.slice(0, 50), // Datos (Limitamos a 50 filas para no saturar tokens)
            'chart' // Tipo
         );

         const config = message.chartConfig;
         const vizType = config.visualization || 'bar'; // Fallback por seguridad
         const dimensions = config.dimensions.map(normalizeDimensionKey);
         const metricField = config.metricView || metricViewMap[config.metric] || 'TotalMetric';
         const metricFields = (config.metricViews?.length ? config.metricViews : [metricField])
            .filter((field, index, fields) => fields.indexOf(field) === index);
         const labelMetric = metricLabelMap[config.metric] || config.metric;

         // Preparar etiquetas y valores comunes
         // (Para tablas y KPIs se procesan distinto abajo)
         const labels = data.map((d: any) => dimensions.map(dim => d[dim]).join(' - '));
         const values = data.map((d: any) => Number(d[metricField] ?? d.TotalMetric ?? 0));

         let widgetConfig: any = null;
         let widgetType = vizType;

         // --- FÁBRICA DE VISUALIZACIONES ---
         switch (vizType) {
            case 'kpi':
               // Para KPI sumamos todo el resultado (ej: Venta total de la consulta)
               const totalValue = values.reduce((a: number, b: number) => a + b, 0);
               widgetConfig = {
                  value: totalValue,
                  label: labelMetric,
                  subtext: `Basado en ${data.length} registros filtrados`
               };
               break;

            case 'table':
               // Para tabla pasamos los datos crudos y las columnas
               widgetConfig = {
                  columns: [...dimensions, ...metricFields],
                  data: data,
                  metricLabel: labelMetric,
                  metricLabels: metricFields.reduce((acc: Record<string, string>, field) => {
                     acc[field] = metricViewLabelMap[field as keyof typeof metricViewLabelMap] || field;
                     return acc;
                  }, {})
               };
               break;

            case 'pie':
            case 'doughnut':
               widgetConfig = getEChartPieConfig(labels, values, labelMetric, vizType);
               break;

            case 'line':
            case 'bar':
            default: {
               // Paleta vibrante: el color rota según cuántos widgets hay ya en el tablero
               const colorIndex = filterStore.dynamicWidgets?.length ?? 0;
               const color = getSeriesColor(colorIndex);
               const colorAlpha = color + '33'; // 20% opacidad para el fill de línea
               widgetConfig = getEChartConfig(
                  labels,
                  [{
                     label: labelMetric,
                     data: values,
                     backgroundColor: vizType === 'line' ? colorAlpha : color,
                     borderColor: color,
                     borderRadius: 4,
                  }],
                  vizType as 'bar' | 'line'
               );
               break;
            }
         }

         // 2. Crear el Widget Dinámico
         const newWidget: DynamicWidget = {
            id: Date.now().toString(),
            title: config.title || `IA: ${labelMetric} por ${dimensions.join(', ')}`,
            type: widgetType, // 'bar', 'kpi', 'table', etc.
            config: widgetConfig,
            rawQuery: config,
            timestamp: Date.now()
         };

         filterStore.addDynamicWidget(newWidget);
         isReportActive.value = true;

         // 3. Generar Insight (Micro-resumen)
         // Solo para gráficos y tablas, los KPIs suelen explicarse solos
         if (vizType !== 'kpi') {
            const dataSample = labels.slice(0, 15).map((label, index) => ({
               label,
               value: values[index]
            }));
            const promptInsight = `Analiza solo esta visualizacion de ${labelMetric}. No menciones metricas que no esten en los datos. Max 20 palabras.`;
            const insightText = await picApi.getDataInsights({
               metric: labelMetric,
               visualization: vizType,
               data: dataSample
            }, promptInsight, selectedModel.value);
            message.text = `${message.text}\n\n💡 ${insightText}`;
         }

      } catch (error: any) {
         console.error("❌ Error visualizando/analizando:", error);
         message.text += "\n\n(Error al generar la visualización).";
      } finally {
         isLoading.value = false;
      }
   }

   return {
      messages,
      isLoading,
      activeContext,
      isReportActive,
      initChat,
      sendMessage,
      clearChat,
      visualizeData,
      setContext,
      clearContext,

      selectedModel,
      setModel
   };
});

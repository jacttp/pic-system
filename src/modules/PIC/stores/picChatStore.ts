import { defineStore } from 'pinia';
import { ref } from 'vue';

import { picApi } from '../services/picApi';
import type { AiQueryConfig, DynamicWidget, ChatMessage } from '../types/picTypes';
import { usePicFilterStore } from './picFilterStore';
import { getChartConfig, getPieConfig } from '../utils/picUtils';

interface ChatContext {
   id: string;
   title: string;
   data: any;
   type: 'chart' | 'table';
}

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
      return id; // Retornamos ID para uso posterior
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

         // --- B. INYECTAR CONTEXTO ---
         let promptToSend = userText;

         // B1. Contexto de Filtros Activos del Dashboard
         // Diccionario para nombres legibles (reduce tokens vs enviar keys crudos)
         const filterLabels: Record<string, string> = {
            canal: 'Canal', Gerencia: 'Gerencia', Jefatura: 'Jefatura',
            Ruta: 'Ruta', Marca: 'Marca', grupo: 'Grupo/Familia',
            Categorias: 'Categoría', SKU: 'SKU', Anio: 'Año',
            Transaccion: 'Transacción', FormatoCliente: 'Formato Cliente',
            MesInicial: 'Mes Inicial', MesFinal: 'Mes Final'
         };

         // Construir resumen compacto de filtros seleccionados (solo los no vacíos)
         const activeFilters: string[] = [];
         for (const [key, label] of Object.entries(filterLabels)) {
            const val = filterStore.selected[key as keyof typeof filterStore.selected];
            if (Array.isArray(val) && val.length > 0) {
               activeFilters.push(`${label}: ${val.join(', ')}`);
            } else if (typeof val === 'string' && val) {
               activeFilters.push(`${label}: ${val}`);
            }
         }

         if (activeFilters.length > 0) {
            promptToSend = `[FILTROS ACTIVOS DEL DASHBOARD]\n${activeFilters.join('\n')}\n\n[PREGUNTA USUARIO]\n"${userText}"`;
         }

         // B2. Contexto Visual (Si el usuario seleccionó un gráfico/tabla con el botón de contexto)
         if (activeContext.value) {
            const contextDataStr = JSON.stringify(activeContext.value.data).slice(0, 5000);
            promptToSend = `[FILTROS ACTIVOS DEL DASHBOARD]\n${activeFilters.length > 0 ? activeFilters.join('\n') : '(ninguno)'}\n\n[CONTEXTO VISUAL ACTIVO]\nElemento: "${activeContext.value.title}" (${activeContext.value.type}).\nDatos: ${contextDataStr}.\n\n[PREGUNTA USUARIO]\n"${userText}"`;
         }

         // --- C. LLAMADA A LA API ---
         // Enviamos el prompt actual + el historial de la conversación
         const response = await picApi.sendChatPrompt(promptToSend, history, selectedModel.value);

         // --- D. PROCESAR RESPUESTA ---
         if (response.explanation) {
            const msgId = addMessage('assistant', response.explanation, response.queryConfig);

            // Si la IA decidió generar un gráfico, lo renderizamos automáticamente
            if (response.queryConfig) {
               await visualizeData(msgId);
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

   async function visualizeData(messageId: string) {
      const message = messages.value.find(m => m.id === messageId);
      if (!message || !message.chartConfig) return;

      // Evitar doble loading si el usuario hace clic varias veces rápido
      if (isLoading.value) return;
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

         // Preparar etiquetas y valores comunes
         // (Para tablas y KPIs se procesan distinto abajo)
         const labels = data.map((d: any) => config.dimensions.map(dim => d[dim]).join(' - '));
         const values = data.map((d: any) => d.TotalMetric || 0);

         // Mapas de etiquetas amigables
         const metricMap: Record<string, string> = {
            'VENTA_KG': 'Venta (KG)',
            'VENTA_$$': 'Venta ($)',
            'METAS_KG': 'Meta (KG)'
         };
         const labelMetric = metricMap[config.metric] || config.metric;

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
                  columns: [...config.dimensions, 'TotalMetric'], // Columnas dinámicas
                  data: data,
                  metricLabel: labelMetric
               };
               break;

            case 'pie':
            case 'doughnut':
               // Usamos el nuevo helper de Utils
               // Importante: Pie charts necesitan colores variados
               const bgColors = [
                  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                  '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
               ];
               widgetConfig = getPieConfig(
                  labels,
                  [{
                     data: values,
                     backgroundColor: bgColors,
                     borderWidth: 1
                  }],
                  vizType
               );
               break;

            case 'line':
            case 'bar':
            default:
               // Usamos el helper existente
               widgetConfig = getChartConfig(
                  labels,
                  [{
                     label: labelMetric,
                     data: values,
                     backgroundColor: vizType === 'line' ? 'rgba(59, 130, 246, 0.2)' : '#0ea5e9',
                     borderColor: '#0ea5e9',
                     fill: vizType === 'line', // Relleno solo si es línea
                     borderRadius: 4,
                     tension: 0.3 // Curva suave para líneas
                  }],
                  vizType as 'bar' | 'line'
               );
               break;
         }

         // 2. Crear el Widget Dinámico
         const newWidget: DynamicWidget = {
            id: Date.now().toString(),
            title: `IA: ${labelMetric} por ${config.dimensions.join(', ')}`,
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
            const dataSample = data.slice(0, 15);
            const promptInsight = `Describe brevemente la tendencia, valor más alto o distribución. Máx 20 palabras.`;
            const insightText = await picApi.getDataInsights(dataSample, promptInsight);
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

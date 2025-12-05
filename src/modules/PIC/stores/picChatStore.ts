import { defineStore } from 'pinia';
import { ref } from 'vue';
import { picApi } from '../services/picApi';
import type { AiQueryConfig, DynamicWidget } from '../types/picTypes';
import { usePicFilterStore } from './picFilterStore'; // <--- Importamos el otro store
import { getChartConfig } from '../utils/picUtils'; // Reutilizamos tu util de gráficos..
import axios from 'axios';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    timestamp: Date;
    // Si el mensaje trae datos para graficar, los guardamos aquí
    chartConfig?: AiQueryConfig | null; 
}

export const usePicChatStore = defineStore('picChat', () => {
    const messages = ref<ChatMessage[]>([]);
    const isLoading = ref(false);

     // Accedemos al store de filtros/grid
    const filterStore = usePicFilterStore(); 

    // Estado para controlar si hay un reporte activo (esto servirá para la Fase 3)
    const isReportActive = ref(false);

    // Mensaje de bienvenida inicial
    function initChat() {
        if (messages.value.length === 0) {
            addMessage('assistant', 'Hola, soy tu analista virtual de PIC. Puedes pedirme datos específicos (ej: "Ventas de Corona en 2024") o generar el reporte completo.');
        }
    }

    function addMessage(role: 'user' | 'assistant' | 'system', text: string, chartConfig: AiQueryConfig | null = null) {
        messages.value.push({
            id: Date.now().toString() + Math.random().toString(),
            role,
            text,
            timestamp: new Date(),
            chartConfig
        });
    }

    async function sendMessage(userText: string) {
        if (!userText.trim()) return;

        // 1. Agregar mensaje del usuario
        addMessage('user', userText);
        isLoading.value = true;

        try {
            // 2. Consultar a la API (Backend v1)
            const response = await picApi.sendChatPrompt(userText);

            // 3. Procesar respuesta híbrida
            // 'explanation' siempre se muestra como texto
            if (response.explanation) {
                addMessage('assistant', response.explanation, response.queryConfig);
            }

            // 4. Si viene configuración de query, significa que hay datos para mostrar
            if (response.queryConfig) {
                // Aquí activaremos el dashboard en el futuro.
                // Por ahora, el mensaje del asistente ya lleva el 'chartConfig' adjunto.
                console.log("Datos listos para graficar:", response.queryConfig);
            }

        } catch (error: any) {
            addMessage('system', 'Lo siento, hubo un error al procesar tu solicitud. Intenta de nuevo.');
            console.error(error);
        } finally {
            isLoading.value = false;
        }
    }

    function clearChat() {
        messages.value = [];
        initChat();
    }

   //  async function visualizeData(messageId: string) {
   //      const message = messages.value.find(m => m.id === messageId);
   //      if (!message || !message.chartConfig) return;

   //      isLoading.value = true;
   //      try {
   //          // 1. Ejecutar la query que la IA diseñó
   //          const data = await picApi.executeAiQuery(message.chartConfig);
            
   //          if (!data || data.length === 0) {
   //              addMessage('system', 'La consulta no devolvió datos para graficar.');
   //              return;
   //          }

   //          // 2. Procesar datos para Chart.js (Adaptador rápido)
   //          // Asumimos que la API devuelve [{ Dimension: '...', TotalMetric: 100 }]
   //          const labels = data.map((d: any) => {
   //              // Combinamos dimensiones si hay múltiples (ej: "Norte - 2024")
   //              return message.chartConfig!.dimensions.map(dim => d[dim]).join(' - ');
   //          });
            
   //          const values = data.map((d: any) => d.TotalMetric || 0);
   //          const metricLabel = message.chartConfig!.metric === 'VENTA_$$' ? 'Venta ($)' : 'Venta (KG)';

   //          // 3. Generar Configuración Visual
   //          const chartJsConfig = getChartConfig(
   //              labels, 
   //              [{
   //                  label: metricLabel,
   //                  data: values,
   //                  backgroundColor: '#0ea5e9', // Brand Blue
   //                  borderRadius: 4
   //              }], 
   //              'bar' // Por defecto barras
   //          );

   //          // 4. Crear el Widget y mandarlo al Dashboard
   //          const newWidget: DynamicWidget = {
   //              id: Date.now().toString(),
   //              title: `Análisis: ${metricLabel} por ${message.chartConfig!.dimensions.join(', ')}`,
   //              type: 'bar',
   //              config: chartJsConfig,
   //              rawQuery: message.chartConfig!,
   //              timestamp: Date.now()
   //          };

   //          filterStore.addDynamicWidget(newWidget);

   //          // 5. Feedback al usuario
   //          // Opcional: Podríamos hacer scroll automático al grid

   //      } catch (error) {
   //          console.error(error);
   //          addMessage('system', 'Error al generar el gráfico. Intenta de nuevo.');
   //      } finally {
   //          isLoading.value = false;
   //      }
   //  }
   
   // NUEVA ACCIÓN: Convertir la intención de la IA en un gráfico real con manejo de errores robusto
    
   async function visualizeData(messageId: string) {
        const message = messages.value.find(m => m.id === messageId);
        if (!message || !message.chartConfig) return;

        isLoading.value = true;
        
        try {
            // 1. Ejecutar la query que la IA diseñó
            const data = await picApi.executeAiQuery(message.chartConfig);
            
            // Caso: Query exitosa (200 OK) pero sin resultados (0 filas)
            if (!data || data.length === 0) {
                addMessage('system', 'La consulta se ejecutó correctamente pero no encontró datos para esos criterios.');
                return;
            }

            // 2. Procesar datos para Chart.js (Adaptador rápido)
            const labels = data.map((d: any) => {
                // Combinamos dimensiones si hay múltiples (ej: "Norte - 2024")
                return message.chartConfig!.dimensions.map(dim => d[dim]).join(' - ');
            });
            
            const values = data.map((d: any) => d.TotalMetric || 0);
            const metricLabel = message.chartConfig!.metric === 'VENTA_$$' ? 'Venta ($)' : 'Venta (KG)';

            // 3. Generar Configuración Visual
            const chartJsConfig = getChartConfig(
                labels, 
                [{
                    label: metricLabel,
                    data: values,
                    backgroundColor: '#0ea5e9', // Brand Blue
                    borderRadius: 4
                }], 
                'bar' // Por defecto barras
            );

            // 4. Crear el Widget y mandarlo al Dashboard
            const newWidget: DynamicWidget = {
                id: Date.now().toString(),
                title: `Análisis: ${metricLabel} por ${message.chartConfig!.dimensions.join(', ')}`,
                type: 'bar',
                config: chartJsConfig,
                rawQuery: message.chartConfig!,
                timestamp: Date.now()
            };

            filterStore.addDynamicWidget(newWidget);

            // Feedback visual opcional (Scroll o mensaje toast)
            console.log("✅ Gráfico generado exitosamente");

        } catch (error: any) {
            console.error("❌ Error visualizando datos:", error);
            
            let userFeedback = 'Ocurrió un error técnico al generar el gráfico.';

            // MANEJO DE ERROR 400 (Bad Request - Culpa de los filtros/IA)
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const backendMsg = error.response.data?.message || '';

                if (status === 400) {
                    // Intentamos interpretar el error para el usuario
                    if (backendMsg.includes('filtro') || backendMsg.includes('column') || backendMsg.includes('Invalid column name')) {
                        userFeedback = `No pude interpretar correctamente algunos filtros. Detalle técnico: ${backendMsg}. Intenta ser más específico (ej: "Marca CORONA" en mayúsculas).`;
                    } else {
                        userFeedback = `La estructura de la consulta no es válida para el sistema. Detalle: ${backendMsg}`;
                    }
                } else if (status === 500) {
                    userFeedback = 'Error interno del servidor de base de datos. Por favor reporta esto a sistemas.';
                }
            }

            addMessage('system', userFeedback);
            
        } finally {
            isLoading.value = false;
        }
    }


    return {
        messages,
        isLoading,
        isReportActive,
        initChat,
        sendMessage,
        clearChat,

        visualizeData
    };
});
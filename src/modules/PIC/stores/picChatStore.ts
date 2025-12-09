import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { picApi } from '../services/picApi';
import type { AiQueryConfig, DynamicWidget, ChatMessage } from '../types/picTypes';
import { usePicFilterStore } from './picFilterStore';
import { getChartConfig } from '../utils/picUtils';

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

    // --- ACCIONES BÁSICAS ---
    function initChat() {
        if (messages.value.length === 0) {
            addMessage('assistant', 'Hola, soy tu analista virtual de PIC. Puedes pedirme datos específicos o generar reportes.');
        }
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

            // --- B. INYECTAR CONTEXTO VISUAL (Si el usuario seleccionó un gráfico) ---
            let promptToSend = userText;
            
            if (activeContext.value) {
                const contextDataStr = JSON.stringify(activeContext.value.data).slice(0, 5000);
                promptToSend = `
                [CONTEXTO VISUAL ACTIVO]
                Elemento: "${activeContext.value.title}" (${activeContext.value.type}).
                Datos: ${contextDataStr}.
                
                [PREGUNTA USUARIO]
                "${userText}"
                `;
            }

            // --- C. LLAMADA A LA API ---
            // Enviamos el prompt actual + el historial de la conversación
            const response = await picApi.sendChatPrompt(promptToSend, history);

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

    // --- GENERACIÓN DE WIDGETS ---
    async function visualizeData(messageId: string) {
        const message = messages.value.find(m => m.id === messageId);
        if (!message || !message.chartConfig) return;

        // Nota: isLoading global ya suele estar true si viene de sendMessage, 
        // pero lo forzamos por si se llama manual desde un botón "Reintentar"
        const localLoading = !isLoading.value; 
        if (localLoading) isLoading.value = true;

        try {
            // 1. Ejecutar Query SQL generada por IA
            const data = await picApi.executeAiQuery(message.chartConfig);

            if (!data || data.length === 0) {
                addMessage('system', 'La consulta es válida pero no devolvió resultados (0 registros).');
                return;
            }

            // 2. Procesar Datos para Chart.js
            const config = message.chartConfig;
            const labels = data.map((d: any) => config.dimensions.map(dim => d[dim]).join(' - '));
            const values = data.map((d: any) => d.TotalMetric || 0);
            
            const metricLabelMap: Record<string, string> = {
                'VENTA_KG': 'Venta (KG)',
                'VENTA_$$': 'Venta ($)',
                'METAS_KG': 'Meta (KG)'
            };
            const labelMetric = metricLabelMap[config.metric] || config.metric;

            const chartJsConfig = getChartConfig(
                labels,
                [{
                    label: labelMetric,
                    data: values,
                    backgroundColor: '#0ea5e9',
                    borderRadius: 4
                }],
                'bar'
            );

            // 3. Crear Widget en el Dashboard
            const newWidget: DynamicWidget = {
                id: Date.now().toString(),
                title: `IA: ${labelMetric} por ${config.dimensions.join(', ')}`,
                type: 'bar',
                config: chartJsConfig,
                rawQuery: config,
                timestamp: Date.now()
            };

            filterStore.addDynamicWidget(newWidget);
            isReportActive.value = true; // Forzar vista de dashboard

        } catch (error: any) {
            console.error("❌ Error visualizando datos:", error);
            let userFeedback = 'Error técnico al generar el gráfico.';

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const msg = error.response.data?.message || '';
                
                if (status === 400) {
                    userFeedback = `La consulta generada no es válida para la BD. Detalle: ${msg}`;
                }
            }
            addMessage('system', userFeedback);
        } finally {
            if (localLoading) isLoading.value = false;
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
        clearContext
    };
});
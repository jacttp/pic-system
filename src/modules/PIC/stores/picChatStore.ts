import { defineStore } from 'pinia';
import { ref } from 'vue';
import {picApi} from '../services/picApi';
import type { AiQueryConfig } from '../types/picTypes';

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

    return {
        messages,
        isLoading,
        isReportActive,
        initChat,
        sendMessage,
        clearChat
    };
});
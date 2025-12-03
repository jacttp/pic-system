/* src/modules/PIC/services/picApi.ts */
import axios from 'axios';
import type { PicFilterOptions, PicDataPoint, AiChatResponse, AiQueryConfig } from '../types/picTypes';

// 1. Instancia dedicada a la API V1
const picClient = axios.create({
    baseURL: 'http://localhost:3000/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

picClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('pic_auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// CAMBIO: Usamos 'export const' en lugar de 'export default'
export const picApi = {
    
    // --- FILTROS ---
    async getInitialFilters(): Promise<PicFilterOptions> {
        const [canales, gerencias, marcas, anios, transacciones, formatos] = await Promise.all([
            picClient.get<string[]>('/filters/canales'),
            picClient.get<string[]>('/filters/gerencias'),
            picClient.get<string[]>('/filters/marcas'),
            picClient.get<string[]>('/filters/anios'),
            picClient.get<string[]>('/filters/transacciones'),
            picClient.get<string[]>('/filters/formato-cliente')
        ]);

        return {
            canales: canales.data,
            gerencias: gerencias.data,
            marcas: marcas.data,
            anios: anios.data,
            transacciones: transacciones.data,
            formatosCliente: formatos.data
        };
    },

    async getDependentOptions(endpoint: string, parentFilters: Record<string, string[]>): Promise<string[]> {
        const { data } = await picClient.post<string[]>(`/filters/${endpoint}`, parentFilters);
        return data;
    },

    async searchClients(searchTerm: string, page: number, filters: Record<string, any>) {
        const { data } = await picClient.post('/filters/clients', {
            searchTerm,
            page,
            filters
        });
        return data;
    },

    // --- DATOS DEL REPORTE ---
    async getDashboardData(filters: Record<string, any>, dimensions: string[] = ['Año', 'Mes']): Promise<PicDataPoint[]> {
        const { data } = await picClient.post<PicDataPoint[]>('/query', {
            dimensions,
            filters
        });
        return data;
    },

    async getPriceAverageSummary(): Promise<any[]> {
        const { data } = await picClient.get('/summary/price-average');
        return data;
    },

    // --- INTELIGENCIA ARTIFICIAL ---
   //  async sendChatPrompt(userPrompt: string): Promise<AiChatResponse> {
   //      const { data } = await picClient.post('/gemini-proxy', { userPrompt });
        
   //      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
   //      if (!textResponse) throw new Error("IA no devolvió respuesta válida.");

   //      try {
   //          const cleanedJson = textResponse.replace(/```json\n?|```/g, '').trim();
   //          return JSON.parse(cleanedJson);
   //      } catch (e) {
   //          console.error("Error parseando respuesta IA", textResponse);
   //          throw new Error("Error al interpretar la respuesta de la IA.");
   //      }
   //  },
   // --- INTELIGENCIA ARTIFICIAL ---
    async sendChatPrompt(userPrompt: string): Promise<AiChatResponse> {
        console.log("📡 [Front] Enviando prompt:", userPrompt);
        
        const { data } = await picClient.post('/gemini-proxy', { userPrompt });
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResponse) throw new Error("IA no devolvió respuesta válida.");

        try {
            const cleanedJson = textResponse.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);
            
            console.log("✅ [Front] JSON Original:", parsed);

            // --- NORMALIZACIÓN (El Arreglo) ---
            
            // CASO A: Estructura Perfecta (Tiene explanation)
            if (parsed.explanation) {
                return parsed;
            }

            // CASO B: Estructura Plana (Solo devolvió la query config)
            // Si vemos que tiene 'metric' o 'filters', asumimos que es una query
            if (parsed.metric || parsed.filters || parsed.dimensions) {
                console.warn("⚠️ [Front] Formato plano detectado. Normalizando...");
                return {
                    explanation: "Entendido. Aquí tienes la configuración de datos solicitada:",
                    queryConfig: parsed
                };
            }

            // CASO C: Texto plano disfrazado de JSON u otro error
            // Devolvemos lo que haya como explicación
            return {
                explanation: JSON.stringify(parsed),
                queryConfig: null
            };

        } catch (e) {
            console.error("❌ [Front] Error parseando JSON:", textResponse);
            // Si falla el parseo JSON, devolvemos el texto crudo como respuesta del chat
            return {
                explanation: textResponse,
                queryConfig: null
            };
        }
    },

    async executeAiQuery(queryConfig: AiQueryConfig): Promise<any[]> {
        const { data } = await picClient.post('/ia-query', queryConfig);
        return data;
    },

    async getDataInsights(chartData: any[], promptContext: string): Promise<string> {
        const { data } = await picClient.post('/gemini-insight', {
            userPrompt: promptContext,
            chartData
        });
        return data.insight;
    }
};
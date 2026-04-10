/* src/modules/PIC/services/picApi.ts */
import api from '@/api/axios';
import type { PicFilterOptions, PicDataPoint, AiChatResponse, AiQueryConfig } from '../types/picTypes';

const V2 = import.meta.env.VITE_API_V2_PATH;

export const picApi = {

   // --- FILTROS ---
   async getInitialFilters(): Promise<PicFilterOptions> {
      const results = await Promise.allSettled([
         api.get<string[]>('/filters/canales'),
         api.get<string[]>('/filters/gerencias'),
         api.get<string[]>('/filters/marcas'),
         api.get<string[]>('/filters/anios'),
         api.get<string[]>('/filters/transacciones'),
         api.get<string[]>('/filters/formato-cliente')
      ]);

      // Helper: extrae data si fulfilled, array vacío si rejected
      const extract = (result: PromiseSettledResult<any>, label: string): string[] => {
         if (result.status === 'fulfilled') return result.value.data;
         console.warn(`⚠️ [picApi] Filtro "${label}" falló:`, result.reason?.message || 'Error desconocido');
         return [];
      };

      const labels = ['canales', 'gerencias', 'marcas', 'anios', 'transacciones', 'formatosCliente'];
      const failedFilters = results
         .map((r, i) => r.status === 'rejected' ? labels[i] : null)
         .filter(Boolean);

      if (failedFilters.length > 0) {
         console.warn(`⚠️ [picApi] ${failedFilters.length} filtro(s) con error: ${failedFilters.join(', ')}. Se reintentarán.`);
      }

      return {
         canales: extract(results[0], 'canales'),
         gerencias: extract(results[1], 'gerencias'),
         marcas: extract(results[2], 'marcas'),
         anios: extract(results[3], 'anios'),
         transacciones: extract(results[4], 'transacciones'),
         formatosCliente: extract(results[5], 'formatosCliente'),
         _failedFilters: failedFilters as string[] // Flag interno para retry
      } as PicFilterOptions & { _failedFilters?: string[] };
   },

   async getDependentOptions(endpoint: string, parentFilters: Record<string, string[]>): Promise<string[]> {
      const { data } = await api.post<string[]>(`/filters/${endpoint}`, parentFilters);
      return data;
   },

   async searchClients(searchTerm: string, page: number, filters: Record<string, any>) {
      const { data } = await api.post('/filters/clients', {
         searchTerm,
         page,
         filters
      });
      return data;
   },

   async getDashboardData(filters: Record<string, any>, dimensions: string[] = ['Año', 'Mes']): Promise<PicDataPoint[]> {
      const { data } = await api.post<PicDataPoint[]>('/query', {
         dimensions,
         filters
      });
      return data;
   },

   async getProjection(dimension: string, filters: Record<string, any>, years: string[], limit?: number) {
      const { data } = await api.post(`/projections`, {
         dimension,
         filters,
         years,
         limit // Enviamos el límite al backend
      });
      return data;
   },

   async getPriceAverageSummary(): Promise<any[]> {
      const { data } = await api.get(`/summary/price-average`);
      return data;
   },


   // --- INTELIGENCIA ARTIFICIAL (ACTUALIZADO FASE 4) ---
   async sendChatPrompt(userPrompt: string, history: any[] = [], model: string = 'gemini'): Promise<AiChatResponse> {
      console.log("📡 [Front] Enviando prompt a Smart Agent:", userPrompt);

      // 1. Llamada al nuevo endpoint 'Inteligente'
      // El backend ahora devuelve: { type: 'text'|'data_query', explanation: string, queryConfig?: object }
      const { data } = await api.post(`/ai/chat`, {
         userPrompt,
         history,
         modelProvider: model
      });

      // 2. Ya no necesitamos parsear texto crudo ni limpiar ```json
      // Retornamos la respuesta estructurada directamente
      return {
         explanation: data.explanation,
         queryConfig: data.type === 'data_query' ? data.queryConfig : null
      };
   },


   async executeAiQuery(queryConfig: AiQueryConfig): Promise<any[]> {
      const { data } = await api.post(`/ia-query`, queryConfig);
      return data;
   },

   // Actualiza esta función:
   async getDataInsights(chartData: any[], promptContext: string, model: string = 'gemini'): Promise<string> {
      try {
         // CAMBIO: Apuntamos a /ai/insight y enviamos modelProvider
         const { data } = await api.post(`/ai/insight`, {
            userPrompt: promptContext,
            chartData,
            modelProvider: model
         });
         return data.insight;
      } catch (error) {
         console.error("❌ Error getting insight:", error);
         return "No se pudo generar el análisis automático.";
      }
   },

   async getExecutiveSummary(reportData: any[]): Promise<string> {
      // 1. Pre-procesamiento ligero para no enviar MBs de datos a la IA
      // Agrupamos solo los totales anuales y por mes para reducir tokens
      const summaryData = reportData.reduce((acc, row) => {
         const key = `${row.Año}-${row.Mes}`;
         if (!acc[key]) acc[key] = { k: 0, p: 0, m: 0 };
         // @ts-ignore
         acc[key].k += row.TotalVentaKG || 0;
         // acc[key].p += row.TotalVentaPesos || 0;
         // @ts-ignore
         acc[key].m += row.TotalMetasKG || 0;
         return acc;
      }, {} as any);

      const context = `
               Actúa como un Director Financiero (CFO) experto.
               Analiza los siguientes datos agregados (Año-Mes: {k: Kilos, m: Meta}).
               
               DATOS: ${JSON.stringify(summaryData)}
               
               INSTRUCCIONES DE NEGOCIO (STRICT MODE):
               - 🚫 PROHIBIDO mencionar dinero/pesos. Todo análisis es en VOLUMEN (Kg o Toneladas).
               - KPI Principal: Cumplimiento de Volumen = (k / m) * 100.
               - Si k > m, destaca el sobrecumplimiento. Si k < m, alerta la brecha.

               INSTRUCCIÓN: GENERAR REPORTE HTML (Estructura):
               <p><strong>📊 Veredicto General:</strong> [Frase contundente sobre el movimiento de carga]</p>
               <ol>
                  <li><strong>📈 Tendencia:</strong> [Análisis de si estamos moviendo más o menos Kg]</li>
                  <li><strong>🎯 Cumplimiento vs Meta:</strong> [¿Llegamos al objetivo de tonelaje?]</li>
                  <li><strong>💡 Hallazgo Operativo:</strong> [Un insight clave sobre el volumen (ej: kg promedio o mes récord)]</li>
               </ol>
               Tono: Profesional, directo, orientado a resultados. No saludes.
         `;

      const { data } = await api.post(`/gemini-insight`, {
         userPrompt: context,
         chartData: summaryData // Enviamos data reducida
      });

      return data.insight;
   },
};


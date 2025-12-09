/* src/modules/PIC/services/picApi.ts */
import axios from 'axios';
import { setupAuthInterceptors } from '@/api/interceptorSetup';
import type { PicFilterOptions, PicDataPoint, AiChatResponse, AiQueryConfig } from '../types/picTypes';


// Instancia para API V1
const picClient = axios.create({
    baseURL: 'http://localhost:3000/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

// Aplicamos la misma configuración de seguridad que en V2
setupAuthInterceptors(picClient);

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
    
    async getProjection(dimension: string, filters: Record<string, any>, years: string[], limit?: number) {
        const { data } = await picClient.post('/projections', {
            dimension,
            filters,
            years,
            limit // Enviamos el límite al backend
        });
        return data;
    },

    async getPriceAverageSummary(): Promise<any[]> {
        const { data } = await picClient.get('/summary/price-average');
        return data;
    },

    // --- INTELIGENCIA ARTIFICIAL ---
   // async sendChatPrompt(userPrompt: string): Promise<AiChatResponse> {
   //      console.log("📡 [Front] Enviando prompt:", userPrompt);
        
   //      // 1. Llamada al Proxy de IA
   //      const { data } = await picClient.post('/gemini-proxy', { userPrompt });

   //      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
   //      if (!textResponse) throw new Error("IA no devolvió respuesta válida.");

   //      try {
   //          // 2. Limpieza del string JSON (quita markdowns ```json ... ```)
   //          const cleanedJson = textResponse.replace(/\`\`\`json\n?|\`\`\`/g, '').trim();
   //          let parsed = JSON.parse(cleanedJson);
            
   //          // --- BLOQUE DE NORMALIZACIÓN AVANZADA ---
            
   //          // A. Detectar si vino plano (sin estructura explanation/queryConfig) y envolverlo
   //          if (parsed.metric || parsed.filters || parsed.dimensions) {
   //              console.warn("⚠️ [Front] Formato plano detectado. Normalizando...");
   //              parsed = {
   //                  explanation: "Configuración de datos generada:",
   //                  queryConfig: parsed
   //              };
   //          }

   //          // B. Sanitización de Filtros (El "Fix" para 'corona' vs 'CORONA')
   //          if (parsed.queryConfig && parsed.queryConfig.filters) {
   //              const f = parsed.queryConfig.filters;
                
   //              // Regla 1: Las MARCAS siempre van en mayúsculas en nuestra BD
   //              if (f.Marca) {
   //                  if (Array.isArray(f.Marca)) {
   //                      f.Marca = f.Marca.map((m: string) => String(m).toUpperCase());
   //                  } else if (typeof f.Marca === 'string') {
   //                      f.Marca = f.Marca.toUpperCase();
   //                  }
   //              }
                
   //              // Regla 2: Si la IA alucina y pone "Anio" en vez de "Año" en filtros
   //              if (f.Anio) {
   //                  f['Año'] = f.Anio;
   //                  delete f.Anio;
   //              }

   //              console.log("🧹 [Front] Filtros sanitizados:", f);
   //          }
   //          // ----------------------------------------
   //          return {
   //              explanation: parsed.explanation || JSON.stringify(parsed),
   //              queryConfig: parsed.queryConfig || null
   //          };

   //      } catch (e) {
   //          console.error("❌ [Front] Error parseando JSON:", textResponse);
   //          // Si falla el parseo, devolvemos el texto crudo como explicación
   //          return {
   //              explanation: textResponse,
   //              queryConfig: null
   //          };
   //      }
   //  },
   
   // --- INTELIGENCIA ARTIFICIAL (ACTUALIZADO FASE 4) ---
   async sendChatPrompt(userPrompt: string, history: any[] = []): Promise<AiChatResponse> {
        console.log("📡 [Front] Enviando prompt a Smart Agent:", userPrompt);
        
        // 1. Llamada al nuevo endpoint 'Inteligente'
        // El backend ahora devuelve: { type: 'text'|'data_query', explanation: string, queryConfig?: object }
        const { data } = await picClient.post('/ai/chat', { 
         userPrompt,
         history 
      });
        
        // 2. Ya no necesitamos parsear texto crudo ni limpiar ```json
        // Retornamos la respuesta estructurada directamente
        return {
            explanation: data.explanation,
            queryConfig: data.type === 'data_query' ? data.queryConfig : null
        };
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
    },

   async getExecutiveSummary(reportData: any[]): Promise<string> {
        // 1. Pre-procesamiento ligero para no enviar MBs de datos a la IA
        // Agrupamos solo los totales anuales y por mes para reducir tokens
        const summaryData = reportData.reduce((acc, row) => {
            const key = `${row.Año}-${row.Mes}`;
            if (!acc[key]) acc[key] = { k: 0, p: 0, m: 0 };
            acc[key].k += row.TotalVentaKG || 0;
            acc[key].p += row.TotalVentaPesos || 0;
            acc[key].m += row.TotalMetasKG || 0;
            return acc;
        }, {});

        const context = `
            Actúa como un Director Financiero (CFO) experto.
            Analiza los siguientes datos agregados (Año-Mes: {k: Kilos, p: Pesos, m: Meta}).
            
            DATOS: ${JSON.stringify(summaryData)}
            
            INSTRUCCIÓN:
            Genera un "Resumen Ejecutivo" en formato HTML simple (usa <p>, <ul>, <li>, <strong>).
            Debe contener:
            1. 📊 **Veredicto General:** Una frase contundente sobre el desempeño.
            2. 📈 **Tendencias:** Qué subió o bajó significativamente.
            3. 🎯 **Cumplimiento:** Mención sobre si se lograron las metas de Kilos.
            4. 💡 **Observación Clave:** Un insight que destaque (ej: precio promedio o mes récord).
            
            Tono: Profesional, directo, orientado a resultados. No saludes.
        `;

        const { data } = await picClient.post('/gemini-insight', {
            userPrompt: context,
            chartData: summaryData // Enviamos data reducida
        });
        
        return data.insight;
    },
};


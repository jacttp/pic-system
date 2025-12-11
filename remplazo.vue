// Actualiza esta función:
    async getDataInsights(chartData: any[], promptContext: string, model: string = 'gemini'): Promise<string> {
        try {
            // CAMBIO: Apuntamos a /ai/insight y enviamos modelProvider
            const { data } = await picClient.post('/ai/insight', {
                userPrompt: promptContext,
                chartData,
                modelProvider: model 
            });
            return data.insight;
        } catch (error) {
            console.error("❌ Error getting insight:", error);
            return "No se pudo generar el análisis automático.";
        }
    }
/*

Lógica implementada:

1. Divide el año en dos periodos usando el splitMonth.

2. Calcula promedios de venta Pre y Post corte.

3. Identifica Víctimas: SKUs que cayeron más del dropThreshold.

4. Identifica Caníbales: SKUs de la misma familia que crecieron más del growthThreshold.

5. Crea un "Caso" si encuentra ambos actores en la misma familia.

*/


/* src/modules/Cannibalization/composables/useCannibalizationEngine.ts */
import type {
   ClientNode,
   DetectionRules,
   DetectedCannibalization,
   SkuMonthlyData
} from '../types/cannibalizationTypes';

export function useCannibalizationEngine() {

   // Helper: Calcula promedio de un vector en un rango dado
   const calculateAverage = (vector: number[], startIndex: number, endIndex: number): number => {
      const slice = vector.slice(startIndex, endIndex);
      if (slice.length === 0) return 0;
      const sum = slice.reduce((a, b) => a + b, 0);
      return sum / slice.length;
   };

   /**
    * Ejecuta el análisis de detección sobre los datos crudos
    */
   const runAnalysis = (data: ClientNode[], rules: DetectionRules): DetectedCannibalization[] => {
      const results: DetectedCannibalization[] = [];
      const splitIndex = rules.splitMonth - 1; // Convertir mes (1-12) a índice (0-11)

      // Validar rangos
      if (splitIndex < 1 || splitIndex > 10) {
         console.warn("Mes de corte inválido para comparación (se necesita margen Pre y Post)");
         return [];
      }

      data.forEach(client => {
         client.families.forEach(family => {

            // Listas temporales para esta familia
            const victims: { sku: SkuMonthlyData, avgPre: number, avgPost: number, loss: number }[] = [];
            const cannibals: { sku: SkuMonthlyData, avgPre: number, avgPost: number, gain: number }[] = [];

            // 1. Clasificar SKUs
            family.skus.forEach(sku => {
               const avgPre = calculateAverage(sku.salesVector, 0, splitIndex);
               const avgPost = calculateAverage(sku.salesVector, splitIndex, 12);

               // Solo considerar productos con volumen relevante (evitar ruido de muestras gratis)
               if (avgPre + avgPost < rules.minVolume) return;

               // Detección de CAÍDA (Víctima)
               if (avgPre > 0) {
                  const dropRate = (avgPre - avgPost) / avgPre;
                  // Si cayó más del umbral configurado (ej: 40%)
                  if (dropRate >= rules.dropThreshold) {
                     victims.push({
                        sku,
                        avgPre,
                        avgPost,
                        loss: (avgPre - avgPost) * (12 - splitIndex) // Kilos totales perdidos estimados en el periodo post
                     });
                  }
               }

               // Detección de SUBIDA (Caníbal)
               // Caso A: Crecimiento porcentual fuerte
               // Caso B: Producto nuevo (avgPre cercano a 0)
               const gainDiff = avgPost - avgPre;
               if (gainDiff > 0) { // Debe haber ganancia neta
                  const growthRate = avgPre > 0 ? (avgPost - avgPre) / avgPre : 999; // 999 = infinito (nuevo producto)

                  if (growthRate >= rules.growthThreshold) {
                     cannibals.push({
                        sku,
                        avgPre,
                        avgPost,
                        gain: gainDiff * (12 - splitIndex) // Kilos totales ganados estimados
                     });
                  }
               }
            });

            // 2. Emparejar (Matchmaking)
            // Heurística simple: Si hay víctimas y caníbales en la misma familia, asumimos relación.
            // Tomamos la víctima principal y buscamos al caníbal principal.


            if (victims.length > 0 && cannibals.length > 0) {
               // Ordenamos por impacto (volumen)
               victims.sort((a, b) => b.loss - a.loss);
               cannibals.sort((a, b) => b.gain - a.gain);

               const mainVictim = victims[0];
               const mainCannibal = cannibals[0];

               if (!mainVictim || !mainCannibal) return; // Type guard extra para silenciar TS


               // Calcular Score de Impacto (0-100)
               // Basado en qué tanto de la pérdida se recuperó y el volumen total
               const netBalance = mainCannibal.gain - mainVictim.loss;
               const substitutionRate = (mainCannibal.gain / mainVictim.loss) * 100;

               // Un caso "perfecto" de canibalización es cuando la tasa de sustitución es alta
               // y hay una pérdida neta significativa o impacto en drop size (que inferimos por el cambio de SKU).

               // Score simple: Priorizar aquellos con grandes volúmenes involucrados
               const impactScore = mainVictim.loss + mainCannibal.gain;

               results.push({
                  id: `${client.id}-${family.name}`,
                  clientName: client.name,
                  matriz: client.matriz,
                  gerencia: client.gerencia,
                  jefatura: client.jefatura,
                  route: client.route,
                  family: family.name,
                  victimSku: mainVictim.sku.name,
                  cannibalSku: mainCannibal.sku.name,
                  volumeLost: parseFloat(mainVictim.loss.toFixed(2)),
                  volumeGained: parseFloat(mainCannibal.gain.toFixed(2)),
                  netBalance: parseFloat(netBalance.toFixed(2)),
                  substitutionRate: parseFloat(substitutionRate.toFixed(1)),
                  impactScore
               });
            }
         });
      });

      // Retornar ordenados por mayor impacto (volumen movido)
      return results.sort((a, b) => b.impactScore - a.impactScore);
   };

   return {
      runAnalysis
   };
}
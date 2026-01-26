/* src/modules/Cannibalization/types/cannibalizationTypes.ts */

// --- 1. DATOS CRUDOS (Respuesta del API) ---

export interface SkuMonthlyData {
   name: string;
   salesVector: number[]; // Array de 12 posiciones (Ene-Dic) con VentaKG
   metaVector: number[];  // Array de 12 posiciones (Ene-Dic) con MetasKG
}

export interface FamilyGroup {
   name: string;
   totalVolumen: number; // Para ordenar importancia
   skus: SkuMonthlyData[];
}

export interface ClientNode {
   id: string;
   matriz: string;
   name: string;
   route: string;
   gerencia: string;
   jefatura: string;
   families: FamilyGroup[];
}

// --- 2. CONFIGURACIÓN DEL MOTOR ---

export interface DetectionRules {
   dropThreshold: number;   // Ej: 0.4 (40% caída)
   growthThreshold: number; // Ej: 0.2 (20% subida)
   minVolume: number;       // Filtro para ignorar "ruido" o ventas hormiga (Ej: 10kg)
   splitMonth: number;      // Mes de corte (1-12). Ej: 8 (Agosto) para comparar Ene-Jul vs Ago-Dic
}

// --- 3. RESULTADOS DEL ANÁLISIS ---

export interface DetectedCannibalization {
   id: string; // ID único del caso (Matriz + Familia)
   clientName: string;
   matriz: string;
   gerencia: string;
   jefatura: string;
   route: string;
   family: string;

   // Los actores del crimen
   victimSku: string;
   cannibalSku: string;

   // Métricas del impacto
   volumeLost: number;      // Kilos que perdió la víctima (Post-Corte)
   volumeGained: number;    // Kilos que ganó el caníbal (Post-Corte)
   netBalance: number;      // Gained - Lost
   substitutionRate: number; // Qué % de la pérdida fue cubierto por el caníbal (0 a 100+)

   impactScore: number;     // Puntuación calculada para ordenar la tabla de prioridad
}
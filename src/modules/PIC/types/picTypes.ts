// Interfaces para el manejo de datos del Reporte PIC

// Estructura de un registro crudo que viene de la API (basevPic)
// NOTA: Mapeamos las columnas principales usadas en los gráficos
export interface PicDataPoint {
    Gerencia?: string;
    Zona?: string;
    Jefatura?: string;
    Ruta?: string;
    canal?: string;
    Año: string; // La API a veces devuelve string o number, estandarizamos al usarlo
    Mes: number;
    SKU_NOMBRE?: string;
    Marca?: string;
    Categorias?: string;
    grupo?: string;
    
    // Métricas
    TotalVentaKG?: number;
    TotalVentaPesos?: number;
    TotalMetasKG?: number;
    PromedioPrecio?: number; // Calculado o venido de endpoint específico
}

// Estructura para los Filtros Disponibles (Dropdowns)
export interface PicFilterOptions {
    canales: string[];
    gerencias: string[];
    marcas: string[];
    anios: string[];
    transacciones: string[];
    formatosCliente: string[];
}

// Estructura de la respuesta del Chat IA (Híbrida)
export interface AiQueryConfig {
    metric: 'VENTA_KG' | 'VENTA_$$' | 'METAS_KG';
    dimensions: string[];
    filters: Record<string, string | string[]>;
}

export interface AiChatResponse {
    explanation: string;
    queryConfig: AiQueryConfig | null;
    // type?: 'text' | 'data_query'; esto si lo usas en el UI
}

// Tipo para el estado de los filtros seleccionados en la UI
export interface PicActiveFilters {
    [key: string]: Set<string> | string | null;
    // Específicos
    MesInicial: string;
    MesFinal: string;
    Anio: Set<string>;
    // Genéricos (Gerencia, Marca, etc...)
}

// Estructura para un Gráfico Dinámico generado por IA
export interface DynamicWidget {
    id: string;
    title: string;
    type: 'bar' | 'line' | 'pie';
    config: any; // Configuración de Chart.js
    rawQuery: AiQueryConfig; // Guardamos la query original por si queremos re-consultar
    timestamp: number;
}

// Estructura para las Chips de Sugerencia (Propuesta A)
export interface AiSuggestionChip {
    label: string;
    prompt: string; // Lo que se enviará al chat al hacer clic
    icon?: string;
}
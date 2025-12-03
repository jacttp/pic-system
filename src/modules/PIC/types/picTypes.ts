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
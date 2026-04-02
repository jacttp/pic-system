// src/modules/UploadMetas/types/uploadMetas.ts

/** Claves de tabla destino disponibles */
export type UploadTarget = 'test' | 'prod'

/** Labels amigables para mostrar en la UI */
export const TARGET_LABELS: Record<UploadTarget, string> = {
    test: 'VentasIC60  (desarrollo)',
    prod: 'VentasIC  (producción)',
}

/**
 * Representa un registro individual de metas extraído del Excel.
 * Coincide exactamente con las columnas de la tabla VentasIC60_test.
 */
export interface UploadMetasRecord {
    ClienteMuliix: string
    Clientesima:   string
    Fecha:         string  // ISO date string YYYY-MM-DD
    Skum:          string
    Fact_Kg:       number
    'Fact_$$':     number
    aaa:           string
    Meta_Kg:       number
}

/** Payload para el endpoint POST /upload-metas/batch */
export interface UploadMetasBatchRequest {
    payload: UploadMetasRecord[]
    /** Tablas destino. Default del backend: ['test'] */
    targets?: UploadTarget[]
}

/** Respuesta del endpoint de carga masiva */
export interface UploadMetasBatchResponse {
    success: boolean
    message?: string
    data?: {
        totalEnviados: number
        /** Resultado por tabla destino */
        tablas: Record<string, {
            registrosInsertados:         number
            registrosDuplicadosOmitidos: number
        }>
    }
}

/** Valores permitidos para el filtro de la columna "aaa" */
export type AaaFilter = 'venta' | 'Metas' | ''

/** Filtros para el listado paginado */
export interface UploadMetasListFilters {
    clienteMuliix?: string
    skum?:          string
    fechaInicio?:   string  // YYYY-MM-DD
    fechaFin?:      string  // YYYY-MM-DD
    aaa?:           AaaFilter
}

export interface UploadMetasListPagination {
    page:  number
    limit: number
}

/** Payload para POST /upload-metas/list */
export interface UploadMetasListRequest {
    filtros:    UploadMetasListFilters
    paginacion: UploadMetasListPagination
    /** Tabla a consultar. Default del backend: 'test' */
    tabla?: UploadTarget
}

/** Respuesta del listado paginado */
export interface UploadMetasListResponse {
    success: boolean
    count:   number
    total:   number
    data:    UploadMetasRecord[]
}

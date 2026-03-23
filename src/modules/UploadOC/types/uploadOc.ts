// src/modules/UploadOC/types/uploadOc.ts

export type EstadoOC = 'pendiente' | 'procesado' | 'caducado' | 'invalido'

/**
 * Representa un registro individual extraído del Excel y normalizado.
 * Este es el contrato exacto que espera el Backend.
 */
export interface UploadOcRecord {
    id?: number // Opcional, devuelto por el servidor al listar
    num_pedido: string
    id_cliente: string
    sku_cadena: string
    upc_cadena: string
    nom_cadena: string
    cant_pedida: number
    fec_pedido_cadena: string // Formato: YYYY-MM-DD
    fec_captura: string // Formato: YYYY-MM-DDTHH:mm:ss.SSSZ
    estado: EstadoOC
    uni_com: string
    cap_emp: number
    desc_art: string
    fec_fin_embarque: string // Formato: YYYY-MM-DD
}

/**
 * Payload para el endpoint de carga masiva (Batch).
 */
export interface UploadOcBatchRequest {
    payload: UploadOcRecord[]
}

/**
 * Respuesta esperada del endpoint de carga masiva (Batch).
 * Incluye la notificación de duplicados omitidos según reglas de negocio.
 */
export interface UploadOcBatchResponse {
    success: boolean
    message?: string
    data?: {
        totalEnviados: number
        registrosInsertados: number
        registrosDuplicadosOmitidos: number
    }
}

/**
 * Filtros para el visualizador dinámico.
 */
export interface UploadOcListFilters {
    cadenas: string[]
    numPedido: string
    estado: EstadoOC | ''
    fecPedidoInicio?: string
    fecPedidoFin?: string
    fecEmbarqueInicio?: string
    fecEmbarqueFin?: string
    fecCapturaInicio?: string
    fecCapturaFin?: string
}

export interface UploadOcListPagination {
    page: number
    limit: number
}

/**
 * Payload para el endpoint de listado paginado.
 */
export interface UploadOcListRequest {
    filtros: UploadOcListFilters
    paginacion: UploadOcListPagination
}

/**
 * Respuesta esperada del endpoint de listado paginado.
 */
export interface UploadOcListResponse {
    success: boolean
    count: number
    total: number
    data: UploadOcRecord[]
}
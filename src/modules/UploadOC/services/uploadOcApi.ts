// src/modules/UploadOC/services/uploadOcApi.ts

import api from '@/api/axios'
import type { AxiosResponse } from 'axios'
import type {
    UploadOcBatchRequest,
    UploadOcBatchResponse,
    UploadOcListRequest,
    UploadOcListResponse
} from '../types/uploadOc'

/**
 * Prefijo base para el módulo de Órdenes de Compra (UploadOC)
 */
const BASE_PATH = import.meta.env.VITE_API_V2_PATH + '/upload-oc'

export const uploadOcApi = {
    /**
     * Envía un lote masivo de órdenes de compra procesadas en el cliente.
     * @param data Payload con el arreglo de registros unificados
     */
    async uploadBatch(data: UploadOcBatchRequest): Promise<UploadOcBatchResponse> {
        const response = await api.post(`${BASE_PATH}/batch`, data)
        return response.data
    },

    /**
     * Obtiene la lista paginada de órdenes de compra según los filtros (Pestañas/Cadenas).
     * @param data Payload con filtros y paginación
     */
    async getList(data: UploadOcListRequest): Promise<UploadOcListResponse> {
        const response = await api.post(`${BASE_PATH}/list`, data)
        return response.data
    }
}
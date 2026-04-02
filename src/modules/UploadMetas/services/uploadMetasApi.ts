// src/modules/UploadMetas/services/uploadMetasApi.ts

import api from '@/api/axios'
import type {
    UploadMetasBatchRequest,
    UploadMetasBatchResponse,
    UploadMetasListRequest,
    UploadMetasListResponse,
} from '../types/uploadMetas'

const BASE_PATH = import.meta.env.VITE_API_V2_PATH + '/upload-metas'

export const uploadMetasApi = {
    /** Envía lote masivo de metas al backend */
    async uploadBatch(data: UploadMetasBatchRequest): Promise<UploadMetasBatchResponse> {
        const response = await api.post(`${BASE_PATH}/batch`, data)
        return response.data
    },

    /** Obtiene listado paginado de metas */
    async getList(data: UploadMetasListRequest): Promise<UploadMetasListResponse> {
        const response = await api.post(`${BASE_PATH}/list`, data)
        return response.data
    },

    /** Vacía por completo la tabla (admin only) */
    async clearAll(): Promise<{ success: boolean; message?: string }> {
        const response = await api.delete(`${BASE_PATH}/clear`)
        return response.data
    }
}

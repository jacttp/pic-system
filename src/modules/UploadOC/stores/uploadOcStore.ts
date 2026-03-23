// src/modules/UploadOC/stores/uploadOcStore.ts

import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as xlsx from 'xlsx'
import { uploadOcApi } from '../services/uploadOcApi'
import type {
    UploadOcRecord,
    UploadOcListFilters,
    UploadOcListPagination
} from '../types/uploadOc'

const excelDateToYYYYMMDD = (excelDate: number | string): string => {
    if (!excelDate) return ''
    if (typeof excelDate === 'string') {
        const s = excelDate.trim()
        if (s.length === 8 && !isNaN(Number(s))) {
            return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
        }
        // Si ya viene como string y parece fecha, intentar formatearla
        const d = new Date(excelDate)
        return isNaN(d.getTime()) ? String(excelDate) : (d.toISOString().split('T')[0] as string)
    }
    // Lógica para números seriales de Excel (base 1900)
    const d = new Date(Math.round((excelDate - 25569) * 86400 * 1000))
    // Corrección de zona horaria simple
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
    return d.toISOString().split('T')[0] as string
}

export const useUploadOcStore = defineStore('uploadOc', () => {
    // --- STATE ---
    const isLoading = ref<boolean>(false)
    const isUploading = ref<boolean>(false)

    // Data de la tabla
    const records = ref<UploadOcRecord[]>([])
    const totalRecords = ref<number>(0)

    const filters = reactive<UploadOcListFilters>({
        cadenas: [], 
        numPedido: '',
        estado: 'pendiente',
        fecPedidoInicio: '',
        fecPedidoFin: '',
        fecEmbarqueInicio: '',
        fecEmbarqueFin: '',
        fecCapturaInicio: '',
        fecCapturaFin: ''
    })

    // Paginación
    const pagination = reactive<UploadOcListPagination>({
        page: 1,
        limit: 50
    })

    // Resultados de la última carga (para UI alerts)
    const uploadStats = reactive({
        inserted: 0,
        omitted: 0,
        message: ''
    })

    // --- ACTIONS ---

    /**
     * Procesa múltiples archivos Excel, normaliza las columnas según la cadena
     * y los une en un solo payload unificado.
     */
    const processExcelFiles = async (files: File[], targetChain: string = 'SORIANA'): Promise<UploadOcRecord[]> => {
        const allRecords: UploadOcRecord[] = []

        for (const file of files) {
            const data = await file.arrayBuffer()
            const workbook = xlsx.read(data, { type: 'array' })
            const firstSheetName = workbook.SheetNames[0]
            if (!firstSheetName) continue
            const worksheet = workbook.Sheets[firstSheetName]
            if (!worksheet) continue
            
            if (targetChain.toUpperCase() === 'SORIANA') {
                const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null })
                if (rows.length < 5) continue
                
                const HDR_ROW = 1
                const ITEMS_START = 4
                const COL = { NUM_PEDIDO: 1, FECHA_PEDIDO: 2, FEC_FIN_EMB: 4, NUM_TIENDA: 2, CANT_PEDIDA: 3, CODIGO: 4, UNI_COM: 5, CAP_EMP: 7, DESC_ART: 8 }

                const hdrRow: any[] = rows[HDR_ROW] || []
                const num_pedido = String(hdrRow[COL.NUM_PEDIDO] ?? '').trim()
                const fec_pedido_cadena = excelDateToYYYYMMDD(hdrRow[COL.FECHA_PEDIDO])
                const fec_fin_embarque = excelDateToYYYYMMDD(hdrRow[COL.FEC_FIN_EMB])
                
                const itemRows = rows.slice(ITEMS_START)
                
                for (const row of itemRows) {
                    const cant_pedida = parseFloat(row[COL.CANT_PEDIDA])
                    if (isNaN(cant_pedida) || cant_pedida <= 0) continue
                    
                    const num_tienda = String(parseInt(String(row[COL.NUM_TIENDA]).trim(), 10) || '')
                    const upc_cadena = String(row[COL.CODIGO] ?? '').trim()
                    const desc_art   = String(row[COL.DESC_ART] ?? '').trim()
                    const sku_cadena = desc_art
                    
                    if (!sku_cadena) continue
                    
                    allRecords.push({
                        num_pedido,
                        id_cliente: num_tienda, 
                        sku_cadena,
                        upc_cadena,
                        nom_cadena: 'SORIANA',
                        cant_pedida,
                        fec_pedido_cadena, 
                        fec_captura: new Date().toISOString(),
                        estado: 'pendiente',
                        uni_com: String(row[COL.UNI_COM] ?? '').trim() || 'CAJAS',
                        cap_emp: parseFloat(row[COL.CAP_EMP]) || 1,
                        desc_art,
                        fec_fin_embarque
                    } as UploadOcRecord)
                }
            } else {
                throw new Error(`Cadena no soportada para mapeo: ${targetChain}`)
            }
        }

        return allRecords
    }

    /**
     * Envía los archivos procesados al Backend.
     */
    const uploadBatch = async (files: File[], chain: string) => {
        isUploading.value = true
        try {
            const payload = await processExcelFiles(files, chain)

            if (payload.length === 0) {
                throw new Error('No se encontraron registros válidos en los archivos.')
            }

            const response = await uploadOcApi.uploadBatch({ payload })

            // Actualizamos estado de stats para que la UI lo consuma
            uploadStats.inserted = response.data?.registrosInsertados || 0
            uploadStats.omitted = response.data?.registrosDuplicadosOmitidos || 0
            uploadStats.message = response.message || `Se insertaron ${uploadStats.inserted} registros, se omitieron ${uploadStats.omitted} duplicados.`

            // Refrescamos la tabla tras una carga exitosa
            await fetchOrders()

        } catch (error: any) {
            console.error('[uploadOcStore] Error en carga batch:', error)
            throw error // Lanzar error para que la UI muestre el Toast rojo
        } finally {
            isUploading.value = false
        }
    }

    /**
     * Obtiene la lista de órdenes paginada y filtrada desde el Backend.
     */
    const fetchOrders = async () => {
        isLoading.value = true
        try {
            const response = await uploadOcApi.getList({
                filtros: filters,
                paginacion: pagination
            })

            if (response.success) {
                records.value = response.data || []
                totalRecords.value = response.total || 0
            }
        } catch (error) {
            console.error('[uploadOcStore] Error al listar órdenes:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Actualiza el filtro de cadenas simulando el comportamiento de pestañas.
     */
    const setChainFilter = async (chain: string) => {
        if (chain === 'TODAS') {
            filters.cadenas = []
        } else {
            filters.cadenas = [chain]
        }
        pagination.page = 1 // Resetear a la primera página al cambiar de pestaña
        await fetchOrders()
    }

    return {
        // State
        isLoading,
        isUploading,
        records,
        totalRecords,
        filters,
        pagination,
        uploadStats,
        // Actions
        uploadBatch,
        fetchOrders,
        setChainFilter
    }
})
// src/modules/UploadOC/stores/uploadOcStore.ts

import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as xlsx from 'xlsx'
import { uploadOcApi } from '../services/uploadOcApi'
import type {
    UploadOcGatewayRecord,
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

const GW_COLUMNS: Array<keyof UploadOcGatewayRecord> = [
    'OrdenCompra',
    'Formato',
    'Inicio',
    'Fin',
    'Determinante',
    'EAN',
    'skuInterno',
    'UPC',
    'ID1',
    'Medida',
    'PedidoCantidad',
    'CostoUnitario',
    'Punto',
    'EA',
    'ID2',
    'fechaOrden',
    'ID3',
    'ID4',
    'Picking',
    'ID5'
]

const GW_NUMERIC_COLUMNS = new Set<keyof UploadOcGatewayRecord>([
    'Formato',
    'PedidoCantidad',
    'CostoUnitario',
    'ID3',
    'Picking',
    'ID5'
])

const nullableText = (value: unknown): string | null => {
    const text = String(value ?? '').trim()
    return text === '' ? null : text
}

const nullableNumber = (value: unknown): number | null => {
    const text = nullableText(value)
    if (text === null) return null
    const n = Number(text)
    return Number.isFinite(n) ? n : null
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
        status: '' as 'success' | 'warning' | 'error' | '',
        chain: '',
        files: 0,
        totalSent: 0,
        inserted: 0,
        omitted: 0,
        duplicated: 0,
        invalid: 0,
        cpfrInserted: 0,
        reasons: [] as string[],
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

    const processGatewayFiles = async (files: File[]): Promise<UploadOcGatewayRecord[]> => {
        const allRecords: UploadOcGatewayRecord[] = []

        for (const file of files) {
            const text = await file.text()
            const lines = text
                .split(/\r?\n/)
                .slice(1)
                .map(line => line.trim())
                .filter(Boolean)

            for (const line of lines) {
                const rawValues = line.split(',').map(value => value.trim())
                if (rawValues.length !== 19 && rawValues.length !== 20) continue

                const values = rawValues.length === 19 ? [...rawValues, ''] : rawValues
                const formato = nullableNumber(values[1])
                if (formato !== 64 && formato !== 97) continue

                const record = {} as UploadOcGatewayRecord
                GW_COLUMNS.forEach((column, index) => {
                    ;(record as any)[column] = GW_NUMERIC_COLUMNS.has(column)
                        ? nullableNumber(values[index])
                        : nullableText(values[index])
                })

                allRecords.push(record)
            }
        }

        return allRecords
    }

    /**
     * Envía los archivos procesados al Backend.
     */
    const uploadBatch = async (files: File[], chain: string) => {
        isUploading.value = true
        uploadStats.status = ''
        uploadStats.chain = chain
        uploadStats.files = files.length
        uploadStats.totalSent = 0
        uploadStats.inserted = 0
        uploadStats.omitted = 0
        uploadStats.duplicated = 0
        uploadStats.invalid = 0
        uploadStats.cpfrInserted = 0
        uploadStats.reasons = []
        uploadStats.message = ''
        try {
            const normalizedChain = chain.toUpperCase()

            if (normalizedChain === 'GW' || normalizedChain === 'SAMS' || normalizedChain === 'WALMART') {
                const payload = await processGatewayFiles(files)

                if (payload.length === 0) {
                    throw new Error('No se encontraron registros .INF validos para Walmart o Sam\'s.')
                }

                const response = await uploadOcApi.uploadGatewayBatch({ payload })
                const data = response.data

                uploadStats.chain = 'Walmart / Sam\'s'
                uploadStats.totalSent = data?.totalEnviados || payload.length
                uploadStats.inserted = data?.registrosInsertados || 0
                uploadStats.duplicated = data?.registrosDuplicadosOmitidos || 0
                uploadStats.invalid = data?.registrosInvalidosOmitidos || 0
                uploadStats.omitted = uploadStats.duplicated + uploadStats.invalid
                uploadStats.cpfrInserted = data?.registrosCpfrInsertados || 0
                uploadStats.status = uploadStats.inserted > 0 ? 'success' : 'warning'
                uploadStats.reasons = [
                    uploadStats.duplicated > 0 ? `${uploadStats.duplicated} duplicados omitidos` : '',
                    uploadStats.invalid > 0 ? `${uploadStats.invalid} registros invalidos omitidos` : '',
                    uploadStats.cpfrInserted > 0 ? `${uploadStats.cpfrInserted} registros sincronizados a CPFR` : ''
                ].filter(Boolean)
                uploadStats.message = response.message || `${uploadStats.inserted} insertados, ${uploadStats.omitted} omitidos.`
                await fetchOrders()
                return
            }

            const payload = await processExcelFiles(files, chain)

            if (payload.length === 0) {
                throw new Error('No se encontraron registros válidos en los archivos.')
            }

            const response = await uploadOcApi.uploadBatch({ payload })

            // Actualizamos estado de stats para que la UI lo consuma
            uploadStats.chain = chain
            uploadStats.totalSent = response.data?.totalEnviados || payload.length
            uploadStats.inserted = response.data?.registrosInsertados || 0
            uploadStats.duplicated = response.data?.registrosDuplicadosOmitidos || 0
            uploadStats.omitted = uploadStats.duplicated
            uploadStats.status = uploadStats.inserted > 0 ? 'success' : 'warning'
            uploadStats.reasons = [
                uploadStats.duplicated > 0 ? `${uploadStats.duplicated} duplicados omitidos` : '',
                uploadStats.inserted === 0 && uploadStats.duplicated > 0 ? 'Todos los registros ya existian para la misma cadena, pedido y SKU' : ''
            ].filter(Boolean)
            uploadStats.message = response.message || `${uploadStats.inserted} insertados, ${uploadStats.omitted} omitidos.`

            // Refrescamos la tabla tras una carga exitosa
            await fetchOrders()

        } catch (error: any) {
            console.error('[uploadOcStore] Error en carga batch:', error)
            uploadStats.status = 'error'
            uploadStats.message = error.message || 'Error al procesar los archivos.'
            uploadStats.reasons = [uploadStats.message]
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
        // Al cambiar de pestaña, limpiar el filtro de estado para mostrar todos los registros
        // de la cadena seleccionada sin importar su estado. El usuario puede refinar desde la UI.
        filters.estado = ''
        pagination.page = 1
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

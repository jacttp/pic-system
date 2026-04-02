// src/modules/UploadMetas/stores/uploadMetasStore.ts

import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as xlsx from 'xlsx'
import { uploadMetasApi } from '../services/uploadMetasApi'
import type {
    UploadMetasRecord,
    UploadMetasListFilters,
    UploadMetasListPagination,
    UploadTarget,
    AaaFilter,
} from '../types/uploadMetas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const excelDateToISO = (raw: number | string | null | undefined): string => {
    if (raw == null || raw === '') return ''
    if (typeof raw === 'number') {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
        return d.toISOString().split('T')[0] as string
    }
    const s = String(raw).trim()
    if (s.length === 8 && !isNaN(Number(s))) {
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    }
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : (d.toISOString().split('T')[0] as string)
}

const safeNum = (v: unknown): number => { const n = Number(v); return isNaN(n) ? 0 : n }
const safeStr = (v: unknown): string  => v != null ? String(v).trim() : ''

/**
 * Busca un valor en un objeto ignorando mayúsculas/minúsculas y espacios extra.
 * Ej: col(row, 'Meta_Kg') también encuentra 'meta_kg', 'META_KG', 'Meta_KG', etc.
 */
const col = (row: Record<string, unknown>, key: string): unknown => {
    if (key in row) return row[key]                          // coincidencia exacta (más rápido)
    const needle = key.toLowerCase().replace(/\s/g, '_')    // normalizar: minúsculas + espacios → _
    const found  = Object.keys(row).find(
        k => k.toLowerCase().replace(/\s/g, '_') === needle
    )
    return found !== undefined ? row[found] : undefined
}

/** Devuelve { inicio: 'YYYY-MM-01', fin: 'YYYY-MM-DD' } para el mes actual */
const currentMonthRange = () => {
    const now     = new Date()
    const year    = now.getFullYear()
    const month   = now.getMonth()          // 0-indexed
    const inicio  = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const fin     = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { inicio, fin }
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useUploadMetasStore = defineStore('uploadMetas', () => {
    // --- STATE ---
    const isLoading   = ref<boolean>(false)
    const isUploading = ref<boolean>(false)

    const records      = ref<UploadMetasRecord[]>([])
    const totalRecords = ref<number>(0)

    const { inicio, fin } = currentMonthRange()
    const filters = reactive<UploadMetasListFilters>({
        clienteMuliix: '',
        skum:          '',
        fechaInicio:   inicio,
        fechaFin:      fin,
        aaa:           'Metas',   // default: evita full-scan en tabla con millones de registros
    })

    const pagination = reactive<UploadMetasListPagination>({ page: 1, limit: 50 })

    /** Tabla que se visualiza en el listado ('test' | 'prod') */
    const tablaVista = ref<UploadTarget>('test')

    /** Tablas destino seleccionadas para la próxima carga */
    const selectedTargets = ref<UploadTarget[]>(['test'])

    /** Estadísticas de la última operación de carga */
    const uploadStats = reactive({
        message:       '',
        totalEnviados: 0,
        /** { "VentasIC60_test": { registrosInsertados, registrosDuplicadosOmitidos }, ... } */
        tablas: {} as Record<string, { registrosInsertados: number; registrosDuplicadosOmitidos: number }>,
    })

    // --- ACTIONS ---

    const processExcelFile = async (file: File): Promise<UploadMetasRecord[]> => {
        const data      = await file.arrayBuffer()
        const workbook  = xlsx.read(data, { type: 'array', cellDates: false })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) return []
        const worksheet = workbook.Sheets[sheetName]
        if (!worksheet) return []

        const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null })

        // Debug: imprime los encabezados detectados para facilitar diagnóstico de nombres
        if (rows.length > 0) {
            console.info('[UploadMetas] Columnas detectadas en el Excel:', Object.keys(rows[0]!))
        }

        return rows.map(row => ({
            ClienteMuliix: safeStr(col(row, 'ClienteMuliix')),
            Clientesima:   safeStr(col(row, 'Clientesima')),
            Fecha:         excelDateToISO(col(row, 'Fecha') as number | string),
            Skum:          safeStr(col(row, 'Skum')),
            Fact_Kg:       safeNum(col(row, 'Fact_Kg')),
            'Fact_$$':     safeNum(col(row, 'Fact_$$')),
            aaa:           safeStr(col(row, 'aaa')),
            Meta_Kg:       safeNum(col(row, 'Meta_Kg')),
        }))
    }

    /**
     * Procesa uno o más archivos Excel y sube el payload a las tablas destino seleccionadas.
     */
    const uploadBatch = async (files: File[]) => {
        isUploading.value = true
        try {
            const allRecords: UploadMetasRecord[] = []
            for (const file of files) {
                allRecords.push(...(await processExcelFile(file)))
            }

            if (allRecords.length === 0) {
                throw new Error(
                    'No se encontraron registros válidos. Verifica que las columnas tengan el nombre exacto de la tabla.'
                )
            }

            const response = await uploadMetasApi.uploadBatch({
                payload: allRecords,
                targets: selectedTargets.value,
            })

            // Actualizar stats para la UI
            uploadStats.totalEnviados = response.data?.totalEnviados    ?? 0
            uploadStats.tablas        = response.data?.tablas           ?? {}
            uploadStats.message       = response.message                ?? 'Carga completada.'

            // Refrescar la tabla visible
            await fetchMetas()

        } catch (error: any) {
            console.error('[uploadMetasStore] Error en carga batch:', error)
            throw error
        } finally {
            isUploading.value = false
        }
    }

    /** Carga el listado paginado desde el backend */
    const fetchMetas = async () => {
        isLoading.value = true
        try {
            const response = await uploadMetasApi.getList({
                filtros:    filters,
                paginacion: pagination,
                tabla:      tablaVista.value,
            })
            if (response.success) {
                records.value      = response.data  || []
                totalRecords.value = response.total || 0
            }
        } catch (error) {
            console.error('[uploadMetasStore] Error al listar metas:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    /** Cambia la tabla mostrada en el listado y recarga */
    const setTablaVista = async (t: UploadTarget) => {
        tablaVista.value  = t
        pagination.page   = 1
        await fetchMetas()
    }

    return {
        // State
        isLoading, isUploading,
        records, totalRecords,
        filters, pagination,
        tablaVista, selectedTargets,
        uploadStats,
        // Actions
        uploadBatch, fetchMetas, setTablaVista,
    }
})

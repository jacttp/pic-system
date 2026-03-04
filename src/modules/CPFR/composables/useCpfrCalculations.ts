// src/modules/CPFR/composables/useCpfrCalculations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Toda la lógica de derivación numérica vive aquí.
// El store y los componentes NUNCA calculan — solo consumen este composable.
// ─────────────────────────────────────────────────────────────────────────────

import type { CpfrDataItem, CpfrCalculatedRow, CpfrStoreMacro, CpfrStoreGroup } from '../types/cpfrTypes'

const DEFAULT_CRITERIA = 2.5

export function useCpfrCalculations(
    skuCriteria: Record<string, number>,
    storeCriteria: Record<string, number>,
) {

    // ── Calcular una fila individual ────────────────────────────────────────────
    function calcRow(item: CpfrDataItem): CpfrCalculatedRow {
        const criterioSKU = skuCriteria[item.SKU_NOMBRE] ?? DEFAULT_CRITERIA
        const criterioFinal = storeCriteria[item.id_cliente] ?? criterioSKU

        const semanasActuales = item.ventaPromSemanal > 0
            ? item.invActual / item.ventaPromSemanal
            : 0

        const pedidoSugerido = Math.max(
            0,
            Math.ceil(criterioFinal * item.ventaPromSemanal - item.invActual)
        )

        let fillRate = 0
        if (pedidoSugerido === 0) {
            fillRate = item.pedidoCadena === 0 ? 100 : 0
        } else {
            fillRate = Math.min(100, (item.pedidoCadena / pedidoSugerido) * 100)
        }

        let estado: 'INSTOCK' | 'BAJO' | 'AGOTADO'
        if (item.invActual <= 0 && item.ventaPromSemanal > 0) {
            estado = 'AGOTADO'
        } else if (semanasActuales < criterioFinal) {
            estado = 'BAJO'
        } else {
            estado = 'INSTOCK'
        }

        return { ...item, criterioAplicado: criterioFinal, semanasActuales, pedidoSugerido, fillRate, estado }
    }

    // ── Calcular macro de una tienda ────────────────────────────────────────────
    function calcMacro(skus: CpfrCalculatedRow[]): CpfrStoreMacro {
        let sumInv = 0, sumVentaProm = 0, sumSugerido = 0, sumCadena = 0, sumCriterio = 0
        let instockCount = 0

        for (const s of skus) {
            sumInv += s.invActual
            sumVentaProm += s.ventaPromSemanal
            sumSugerido += s.pedidoSugerido
            sumCadena += s.pedidoCadena
            sumCriterio += s.criterioAplicado
            if (s.invActual > 0) instockCount++
        }

        const avgCriterio = skus.length > 0 ? sumCriterio / skus.length : 0
        const macroSemanas = sumVentaProm > 0 ? sumInv / sumVentaProm : 0

        let fillRate = 0
        if (sumSugerido === 0) {
            fillRate = sumCadena === 0 ? 100 : 0
        } else {
            fillRate = Math.min(100, (sumCadena / sumSugerido) * 100)
        }

        const instockPct = skus.length > 0 ? (instockCount / skus.length) * 100 : 0

        let estado: 'INSTOCK' | 'BAJO' | 'AGOTADO'
        if (instockPct < 75) estado = 'AGOTADO'
        else if (instockPct < 95) estado = 'BAJO'
        else estado = 'INSTOCK'

        return { sumInv, sumVentaProm, sumSugerido, sumCadena, avgCriterio, macroSemanas, fillRate, instockPct, estado }
    }

    // ── Agrupar raw data en StoreGroups ────────────────────────────────────────
    function buildGroups(items: CpfrDataItem[]): CpfrStoreGroup[] {
        const map = new Map<string, CpfrStoreGroup>()

        for (const item of items) {
            if (!map.has(item.id_cliente)) {
                map.set(item.id_cliente, {
                    id_cliente: item.id_cliente,
                    formatocte: item.formatocte,
                    jefatura: item.jefatura,
                    dia: item.dia,
                    skus: [],
                    macro: {} as CpfrStoreMacro,
                })
            }
            map.get(item.id_cliente)!.skus.push(calcRow(item))
        }

        for (const group of map.values()) {
            group.macro = calcMacro(group.skus)
        }

        return Array.from(map.values())
    }

    return { calcRow, calcMacro, buildGroups }
}
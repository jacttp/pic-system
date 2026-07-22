import type { CpfrDiaDash, CpfrSkuDash } from '../types/cpfrTypes'

type CpfrStatusFilters = {
    escenarioA?: boolean
    escenarioB?: boolean
    sinSellout?: boolean
    desabasto?: boolean
    bajoStock?: boolean
    sobrestock?: boolean
    fillrateBajo?: boolean
    fillrate100?: boolean
    sobrepedido?: boolean
    searchOC?: string
    searchSku?: string
}

type CpfrVisibilityOptions = {
    activeTab: string
    dias: CpfrDiaDash[]
    historialDias?: CpfrDiaDash[]
    statusFilters?: CpfrStatusFilters
    criterioGlobal?: number
    selectedFilterWeek?: string
    today?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

export function normalizeCpfrOrderState(value: unknown): string | null {
    const state = String(value ?? '').trim().toLowerCase()
    return state || null
}

export function cpfrSkuFinalPieces(sku: Pick<CpfrSkuDash, 'pedido_sugerido_pz_red' | 'cantidad_base_uni' | 'ajuste' | 'ajuste_mix'>): number {
    const base = sku.cantidad_base_uni !== undefined && sku.cantidad_base_uni !== null
        ? Number(sku.cantidad_base_uni)
        : Number(sku.pedido_sugerido_pz_red ?? 0)
    const ajuste = Number(sku.ajuste ?? 0)
    const ajusteMix = Number(sku.ajuste_mix ?? 0)
    return (Number.isFinite(base) ? base : 0)
        + (Number.isFinite(ajuste) ? ajuste : 0)
        + (Number.isFinite(ajusteMix) ? ajusteMix : 0)
}

function parseLocalDate(value: string | null | undefined): Date | null {
    if (!value) return null
    const [year, month, day] = value.slice(0, 10).split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
}

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

function sameLocalDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
}

function getISOContext(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7)
    return { year: d.getUTCFullYear(), week }
}

function startOfISOWeek(date: Date): Date {
    const d = startOfLocalDay(date)
    const dayNum = d.getDay() || 7
    return addDays(d, 1 - dayNum)
}

function isSameISOWeek(date: Date | null, context: { year: number; week: number }): boolean {
    if (!date) return false
    const dateContext = getISOContext(date)
    return dateContext.year === context.year && dateContext.week === context.week
}

function canStillShipByLeadTime(sku: CpfrSkuDash, leadTime: number | null | undefined, today: Date): boolean {
    const finEmbarqueDate = parseLocalDate(sku.fec_fin_embarque)
    if (!finEmbarqueDate) return true

    const normalizedLeadTime = Math.max(0, Number(leadTime) || 0)
    const earliestShipDate = addDays(startOfLocalDay(today), normalizedLeadTime)
    return finEmbarqueDate.getTime() >= earliestShipDate.getTime()
}

function calcularCoberturaDinamica(sku: CpfrSkuDash): number | null {
    if (!sku.promedio_sellout_kg || sku.promedio_sellout_kg <= 0) return null
    const qtyPz = cpfrSkuFinalPieces(sku)
    const invKg = sku.inv_actual_kg || 0
    const unInv = sku.unidad_inventario || 0
    return ((qtyPz * unInv) + invKg) / sku.promedio_sellout_kg
}

function calcularFillRateDinamico(sku: CpfrSkuDash): number | null {
    if (!sku.cant_pedida || sku.cant_pedida <= 0) return null
    return cpfrSkuFinalPieces(sku) / sku.cant_pedida
}

function esSinSellout(sku: CpfrSkuDash): boolean {
    return !sku.promedio_sellout_kg || sku.promedio_sellout_kg <= 0
}

function coberturaStatus(sku: CpfrSkuDash, criterioGlobal: number): 'ok' | 'bajo' | 'sobre' | 'sin_datos' {
    if (esSinSellout(sku)) return 'sin_datos'
    const cob = calcularCoberturaDinamica(sku)
    if (cob === null) return 'sin_datos'
    const crit = sku.semanas_objetivo || criterioGlobal || 2.5
    if (cob < crit) return 'bajo'
    if (cob > crit + 0.5) return 'sobre'
    return 'ok'
}

function skuWeekKey(sku: CpfrSkuDash): string {
    const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0
    const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0
    return `${y}-W${w.toString().padStart(2, '0')}`
}

export function buildVisibleCpfrDias(options: CpfrVisibilityOptions): CpfrDiaDash[] {
    const sf = options.statusFilters || {}
    const activeTab = options.activeTab
    const selectedFilterWeek = options.selectedFilterWeek || 'TODAS'
    const criterioGlobal = options.criterioGlobal || 2.5
    const today = options.today || new Date()
    const curr = getISOContext(today)
    const last = getISOContext(addDays(today, -7))
    const currentWeekStart = startOfISOWeek(today)
    const immediatePreviousSaturday = addDays(currentWeekStart, -2)
    const immediatePreviousSunday = addDays(currentWeekStart, -1)
    const rollingSevenDaysStart = addDays(startOfLocalDay(today), -7)
    const source = activeTab === 'historial' ? (options.historialDias || []) : options.dias

    const hasStatusFilter = !!(
        sf.escenarioA || sf.escenarioB || sf.sinSellout || sf.desabasto
        || sf.bajoStock || sf.sobrestock || sf.fillrateBajo
        || sf.fillrate100 || sf.sobrepedido
    )

    const isCurrentWeek = (sku: CpfrSkuDash) => {
        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0
        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0
        return y === curr.year && w === curr.week
    }

    const isPreviousWeek = (sku: CpfrSkuDash) => {
        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0
        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0
        return y === last.year && w === last.week
    }

    const isVisibleOrderWindow = (
        sku: CpfrSkuDash,
        leadTime: number | null | undefined,
        requireShippable = true,
    ) => {
        if (requireShippable && !canStillShipByLeadTime(sku, leadTime, today)) return false

        const pedidoDate = parseLocalDate(sku.fec_pedido_cadena)
        const finEmbarqueDate = parseLocalDate(sku.fec_fin_embarque)

        if (isSameISOWeek(pedidoDate, curr)) return true

        const isImmediatePreviousWeekend =
            sameLocalDay(pedidoDate, immediatePreviousSaturday)
            || sameLocalDay(pedidoDate, immediatePreviousSunday)

        if (isImmediatePreviousWeekend) return true

        return isSameISOWeek(pedidoDate, last)
            && isSameISOWeek(finEmbarqueDate, curr)
            && !!pedidoDate
            && pedidoDate.getTime() >= rollingSevenDaysStart.getTime()
    }

    return source.map(dia => {
        const tiendas = dia.tiendas.map(tienda => {
            const skus = tienda.skus.filter(sku => {
                const state = normalizeCpfrOrderState(
                    sku.estado_oc ?? (sku as any).estado ?? (sku as any).estado_pedido ?? tienda.estado_pedido
                )

                if (activeTab === 'centralizados') {
                    if (!(state === 'pendiente' || state === 'borrador' || !state)) return false
                    // Las OC dentro de la ventana operativa siguen visibles aunque ya no
                    // alcancen el fin de embarque por lead time. La tabla las identifica
                    // con el badge de alerta para que el usuario pueda cerrar su caso.
                    if (!isVisibleOrderWindow(sku, tienda.resumen?.lead_time, false)) return false
                } else if (activeTab === 'revision') {
                    if ((!isCurrentWeek(sku) && !isPreviousWeek(sku)) || state !== 'revision') return false
                } else if (activeTab === 'aprobada') {
                    if (state !== 'aprobado') return false
                    // Conserva el alcance operativo de Centralizados (semana actual y arrastre
                    // inmediato permitido), pero no oculta una OC ya aprobada porque su fecha
                    // de embarque haya vencido o ya no alcance por lead time.
                    if (!isVisibleOrderWindow(sku, tienda.resumen?.lead_time, false)) return false
                } else if (activeTab === 'sin_embarcar') {
                    if (state !== 'cerrado') return false
                    if (selectedFilterWeek !== 'TODAS' && skuWeekKey(sku) !== selectedFilterWeek) return false
                } else if (activeTab === 'historial') {
                    if (isCurrentWeek(sku) || isPreviousWeek(sku)) return false
                    if (selectedFilterWeek !== 'TODAS' && skuWeekKey(sku) !== selectedFilterWeek) return false
                }

                if (sf.searchOC) {
                    const term = sf.searchOC.toLowerCase()
                    const num = (sku.num_pedido || '').toLowerCase()
                    if (!num.includes(term)) return false
                }

                if (sf.searchSku) {
                    const term = sf.searchSku.toLowerCase()
                    const searchableSku = [
                        sku.sku_nombre,
                        sku.sku_muliix,
                        sku.sku_cadena,
                        sku.upc_cadena,
                        sku.desc_art,
                    ].filter(Boolean).join(' ').toLowerCase()
                    if (!searchableSku.includes(term)) return false
                }

                if (!hasStatusFilter) return true

                const fr = calcularFillRateDinamico(sku)
                const cobStatus = coberturaStatus(sku, criterioGlobal)

                if (sf.escenarioA && sku.escenario === 'A') return true
                if (sf.escenarioB && sku.escenario === 'B') return true
                if (sf.sinSellout && esSinSellout(sku)) return true
                if (sf.bajoStock && cobStatus === 'bajo') return true
                if (sf.sobrestock && cobStatus === 'sobre') return true
                if (sf.fillrateBajo && fr !== null && fr < 0.999) return true
                if (sf.fillrate100 && fr !== null && Math.abs(fr - 1) < 0.001) return true
                if (sf.sobrepedido && fr !== null && fr > 1.001) return true
                if (sf.desabasto && sku.inv_actual_pz <= 0) return true

                return false
            }).sort((a, b) => {
                const dateA = a.fec_pedido_cadena ? new Date(a.fec_pedido_cadena).getTime() : 0
                const dateB = b.fec_pedido_cadena ? new Date(b.fec_pedido_cadena).getTime() : 0
                return dateB - dateA
            })

            return { ...tienda, skus }
        }).filter(tienda => tienda.skus.length > 0)

        return { ...dia, tiendas }
    }).filter(dia => dia.tiendas.length > 0)
}

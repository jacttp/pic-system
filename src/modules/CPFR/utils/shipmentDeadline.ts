export type CpfrDateValue = string | Date | null | undefined

export function parseCpfrLocalDate(value: CpfrDateValue): Date | null {
    if (!value) return null

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null
        return new Date(value.getFullYear(), value.getMonth(), value.getDate())
    }

    const raw = String(value).trim()
    const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
    const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    const match = compact || dashed
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(year, month - 1, day)
    if (
        date.getFullYear() !== year
        || date.getMonth() !== month - 1
        || date.getDate() !== day
    ) return null

    return date
}

export function startOfCpfrLocalDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function addCpfrDays(value: Date, days: number): Date {
    const next = new Date(value)
    next.setDate(next.getDate() + days)
    return next
}

export function canStillShipByLeadTime(
    fecFinEmbarque: CpfrDateValue,
    leadTime: number | null | undefined,
    today = new Date(),
): boolean {
    const finEmbarqueDate = parseCpfrLocalDate(fecFinEmbarque)
    if (!finEmbarqueDate) return true

    const normalizedLeadTime = Math.max(0, Number(leadTime) || 0)
    const earliestShipDate = addCpfrDays(startOfCpfrLocalDay(today), normalizedLeadTime)

    // La igualdad es válida durante todo el día límite. Caduca al día siguiente.
    return finEmbarqueDate.getTime() >= earliestShipDate.getTime()
}

export function isShipmentDeadlineExpired(
    fecFinEmbarque: CpfrDateValue,
    leadTime: number | null | undefined,
    today = new Date(),
): boolean {
    return !canStillShipByLeadTime(fecFinEmbarque, leadTime, today)
}

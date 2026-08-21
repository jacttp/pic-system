// src/modules/CPFR/composables/useCpfrExport.ts
import * as XLSX from 'xlsx';
import logoUrl from '@/assets/logo.png'
import { cpfrSkuFinalPieces } from './useCpfrVisibility'

const DAY_MAP: Record<number, string> = {
    1: 'LU',
    2: 'MA',
    3: 'MI',
    4: 'JU',
    5: 'VI',
    6: 'SA',
    7: 'DO'
};

export interface ExportRow {
    sku_key: string
    sku_cadena: string
    cliente: string       // id_cliente parte antes de 's'
    nombre: string        // nombre_tienda
    sucursal: string      // id_cliente parte después de 's'
    jefatura: string | null
    semana_ic: string | null
    fec_pedido_cadena: string
    fec_fin_embarque: string // AAAAMMDD
    num_pedido: string
    cant_pedida: number   // pedido_sugerido_pz_red
    pedido_kg: number
    marca?: string
    inv_actual_pz: number
    promedio_sellout_pz: number
    cobertura_calculada: number | null
    upc: string           // upc_cadena
    desc: string          // JUST sku_nombre
    estado_oc?: string | null
}

export interface ExportTiendaItem {
    id_cliente: string
    nombre_tienda: string
    jefatura: string | null
    num_pedido: string
    estado_oc: string | null
    dayNum: number
    semana_ic: string | null
    anio: number | null
    lead_time?: number
    rows: ExportRow[]
}

export interface ExportPdfResult {
    filename: string
    fileCount: number
    zipped: boolean
}

export type ExportImageResult = ExportPdfResult

function splitIdCliente(id_cliente: string): { cliente: string; sucursal: string } {
    const idx = id_cliente.toLowerCase().indexOf('s')
    if (idx === -1) return { cliente: id_cliente, sucursal: '' }
    return {
        cliente: id_cliente.slice(0, idx),
        sucursal: id_cliente.slice(idx + 1)
    }
}

function normalizeOrderState(value: unknown): string | null {
    const state = String(value ?? '').trim().toLowerCase()
    return state || null
}

function formatDateToAAAAMMDD(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    return dateStr.slice(0, 10).replace(/-/g, '')
}

function formatDateForSams(dateValue: string): string {
    const compactDate = String(dateValue || '').replace(/\D/g, '')
    if (compactDate.length !== 8) return ''

    return `${compactDate.slice(4, 6)}/${compactDate.slice(6, 8)}/${compactDate.slice(0, 4)}`
}

function calcularCoberturaDinamica(sku: any): number | null {
    if (!sku || !sku.promedio_sellout_kg || sku.promedio_sellout_kg <= 0) return null
    const qtyPz = cpfrSkuFinalPieces(sku)
    const invKg = sku.inv_actual_kg || 0
    const unInv = sku.unidad_inventario || 0
    const promKg = sku.promedio_sellout_kg
    return ((qtyPz * unInv) + invKg) / promKg
}

function formatNumber(value: number | null | undefined, decimals = 0): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '-'
    return value.toLocaleString('es-MX', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })
}

function safeFilenamePart(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'tienda'
}

function groupItemsByStore(items: ExportTiendaItem[]): ExportTiendaItem[] {
    const map = new Map<string, ExportTiendaItem>()

    for (const item of items) {
        if (!map.has(item.id_cliente)) {
            map.set(item.id_cliente, {
                id_cliente: item.id_cliente,
                nombre_tienda: item.nombre_tienda,
                jefatura: item.jefatura,
                num_pedido: 'MULTIPLE',
                estado_oc: item.estado_oc,
                dayNum: item.dayNum,
                semana_ic: item.semana_ic,
                anio: item.anio,
                rows: []
            })
        }

        map.get(item.id_cliente)!.rows.push(...item.rows)
    }

    return Array.from(map.values())
}

function calculateBrandKgSummary(rows: ExportRow[]) {
    let totalKg = 0
    let coronaKg = 0
    let rosKg = 0

    for (const row of rows) {
        const kg = Number(row.pedido_kg)
        if (!Number.isFinite(kg)) continue

        totalKg += kg
        const brand = String(row.marca ?? '').trim().toLocaleLowerCase('es-MX')
        if (brand === 'corona') coronaKg += kg
        if (brand === 'ros') rosKg += kg
    }

    return { totalKg, coronaKg, rosKg }
}

function filterPositiveQuantityItems(items: ExportTiendaItem[]): ExportTiendaItem[] {
    return items
        .map(item => ({
            ...item,
            rows: item.rows.filter(row => Number(row.cant_pedida) > 0)
        }))
        .filter(item => item.rows.length > 0)
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('No se pudo convertir la exportación a imagen.'))
        }, 'image/png')
    })
}

async function waitForImages(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll('img'))
    await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
        })
    }))
}

async function imageUrlToDataUrl(url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
    })
}

function buildCrcTable(): number[] {
    const table: number[] = []
    for (let n = 0; n < 256; n += 1) {
        let c = n
        for (let k = 0; k < 8; k += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
        }
        table[n] = c >>> 0
    }
    return table
}

const CRC_TABLE = buildCrcTable()

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff
    for (const byte of bytes) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date): { date: number; time: number } {
    const year = Math.max(1980, date.getFullYear())
    return {
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
    }
}

function writeUint16(out: number[], value: number): void {
    out.push(value & 0xff, (value >>> 8) & 0xff)
}

function writeUint32(out: number[], value: number): void {
    out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff)
}

function createZipBlob(files: { name: string; data: Uint8Array }[]): Blob {
    const encoder = new TextEncoder()
    const now = dosDateTime(new Date())
    const chunks: Uint8Array[] = []
    const centralChunks: Uint8Array[] = []
    let offset = 0

    for (const file of files) {
        const filename = encoder.encode(file.name)
        const crc = crc32(file.data)
        const local: number[] = []

        writeUint32(local, 0x04034b50)
        writeUint16(local, 20)
        writeUint16(local, 0x0800)
        writeUint16(local, 0)
        writeUint16(local, now.time)
        writeUint16(local, now.date)
        writeUint32(local, crc)
        writeUint32(local, file.data.length)
        writeUint32(local, file.data.length)
        writeUint16(local, filename.length)
        writeUint16(local, 0)

        const localHeader = new Uint8Array([...local, ...filename])
        chunks.push(localHeader, file.data)

        const central: number[] = []
        writeUint32(central, 0x02014b50)
        writeUint16(central, 20)
        writeUint16(central, 20)
        writeUint16(central, 0x0800)
        writeUint16(central, 0)
        writeUint16(central, now.time)
        writeUint16(central, now.date)
        writeUint32(central, crc)
        writeUint32(central, file.data.length)
        writeUint32(central, file.data.length)
        writeUint16(central, filename.length)
        writeUint16(central, 0)
        writeUint16(central, 0)
        writeUint16(central, 0)
        writeUint16(central, 0)
        writeUint32(central, 0)
        writeUint32(central, offset)

        centralChunks.push(new Uint8Array([...central, ...filename]))
        offset += localHeader.length + file.data.length
    }

    const centralOffset = offset
    const centralSize = centralChunks.reduce((total, chunk) => total + chunk.length, 0)
    const end: number[] = []
    writeUint32(end, 0x06054b50)
    writeUint16(end, 0)
    writeUint16(end, 0)
    writeUint16(end, files.length)
    writeUint16(end, files.length)
    writeUint32(end, centralSize)
    writeUint32(end, centralOffset)
    writeUint16(end, 0)

    return new Blob([...chunks, ...centralChunks, new Uint8Array(end)], { type: 'application/zip' })
}

export function buildExportItems(dias: any[]): ExportTiendaItem[] {
    const items: ExportTiendaItem[] = []

    for (const dia of dias) {
        for (const tienda of dia.tiendas) {
            // Group SKUs by num_pedido
            const groups: Record<string, any[]> = {}
            for (const sku of tienda.skus) {
                const key = sku.num_pedido || 'SIN_PEDIDO'
                if (!groups[key]) groups[key] = []
                groups[key].push(sku)
            }

            for (const [num_pedido, skus] of Object.entries(groups) as [string, any[]][]) {
                const { cliente, sucursal } = splitIdCliente(tienda.id_cliente)

                const rows: ExportRow[] = skus.map(sku => {
                    const finalPieces = cpfrSkuFinalPieces(sku)
                    return {
                        sku_key: String(sku.oc_id ?? sku.sku_muliix ?? sku.sku_cadena ?? sku.upc_cadena ?? sku.sku_nombre ?? ''),
                        sku_cadena: String(sku.sku_cadena ?? sku.upc_cadena ?? ''),
                        cliente,
                        nombre: tienda.nombre_tienda,
                        sucursal,
                        jefatura: tienda.jefatura || null,
                        semana_ic: sku.semana_ic || null,
                        fec_pedido_cadena: formatDateToAAAAMMDD(sku.fec_pedido_cadena),
                        fec_fin_embarque: formatDateToAAAAMMDD(sku.fec_fin_embarque),
                        num_pedido: sku.num_pedido || '',
                        cant_pedida: finalPieces,
                        pedido_kg: finalPieces * (sku.unidad_inventario ?? 0),
                        marca: String(sku.marca ?? sku.Marca ?? ''),
                        inv_actual_pz: sku.inv_actual_pz ?? 0,
                        promedio_sellout_pz: sku.promedio_sellout_pz ?? 0,
                        cobertura_calculada: calcularCoberturaDinamica(sku),
                        upc: sku.upc_cadena || '',
                        desc: sku.desc_art || sku.sku_nombre || '',
                        estado_oc: normalizeOrderState(sku.estado_oc ?? sku.estado ?? sku.estado_pedido ?? tienda.estado_pedido)
                    }
                })

                items.push({
                    id_cliente: tienda.id_cliente,
                    nombre_tienda: tienda.nombre_tienda,
                    jefatura: tienda.jefatura || null,
                    num_pedido,
                    estado_oc: normalizeOrderState(skus[0]?.estado_oc ?? skus[0]?.estado ?? skus[0]?.estado_pedido ?? tienda.estado_pedido),
                    semana_ic: skus[0]?.semana_ic || null,
                    anio: skus[0]?.fec_pedido_cadena ? parseInt(skus[0].fec_pedido_cadena.slice(0, 4)) : null,
                    lead_time: Number(tienda.resumen?.lead_time ?? 0),
                    dayNum: dia.dia_num,
                    rows
                })
            }
        }
    }
    return items
}

export function useCpfrExport() {

    function generateSamsExcel(selectedItems: ExportTiendaItem[], dayNums: number[]): string {
        const exportItems = filterPositiveQuantityItems(selectedItems)
        const allRows: (string | number)[][] = [[
            'Num Artículo',
            'Signing Desc',
            'Nombre Proveedor',
            'Num Proveedor',
            'Num de Tienda',
            'Nombre Tienda/Club',
            'Número OC',
            'Fecha Pedido OC',
            'Fecha Cancelado OC',
            'Fecha de Embarque de la OC',
            'Estado OC',
            'Total de Piezas Pedidas p/Tienda',
            'Total de Piezas Recibidas p/Tienda',
        ]]

        for (const item of exportItems) {
            for (const row of item.rows) {
                const shipmentDate = formatDateForSams(row.fec_fin_embarque)
                allRows.push([
                    row.upc,
                    row.desc,
                    'EMBUTIDOS CORONA SA CV',
                    item.id_cliente,
                    row.sucursal,
                    row.nombre,
                    row.num_pedido,
                    formatDateForSams(row.fec_pedido_cadena),
                    shipmentDate,
                    shipmentDate,
                    'A',
                    row.cant_pedida,
                    0,
                ])
            }
        }

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(allRows)
        ws['!cols'] = [
            { wch: 16 },
            { wch: 48 },
            { wch: 30 },
            { wch: 16 },
            { wch: 15 },
            { wch: 36 },
            { wch: 16 },
            { wch: 16 },
            { wch: 18 },
            { wch: 24 },
            { wch: 12 },
            { wch: 30 },
            { wch: 32 },
        ]

        XLSX.utils.book_append_sheet(wb, ws, 'Template OV')

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const dayCode = dayNums.length === 1 ? (DAY_MAP[dayNums[0]] || 'XX') : 'MIX'
        const filename = `CPFR_Sams_${dayCode}_${dateStr}.xlsx`

        XLSX.writeFile(wb, filename)
        return filename
    }

    function generateExcel(selectedItems: ExportTiendaItem[], dayNums: number[], nomCadena = 'SORIANA'): string {
        if (String(nomCadena).trim().toUpperCase() === 'SAMS') {
            return generateSamsExcel(selectedItems, dayNums)
        }

        const exportItems = filterPositiveQuantityItems(selectedItems)
        const allRows: (string | number)[][] = []

        // Headers
        allRows.push(['Jefatura', 'cliente', 'nombre', 'sucursal', 'fec_fin_embarque', 'num_pedido', 'cant. pedida', 'upc', 'desc'])

        for (const item of exportItems) {
            for (const row of item.rows) {
                allRows.push([
                    'PIC',
                    row.cliente,
                    row.nombre,
                    row.sucursal,
                    row.fec_fin_embarque,
                    row.num_pedido,
                    row.cant_pedida,
                    row.upc,
                    row.desc
                ])
            }
        }

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(allRows)

        ws['!cols'] = [
            { wch: 10 },
            { wch: 10 },
            { wch: 30 },
            { wch: 10 },
            { wch: 16 },
            { wch: 16 },
            { wch: 14 },
            { wch: 16 },
            { wch: 45 }
        ]

        XLSX.utils.book_append_sheet(wb, ws, 'Template OV')

        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        
        let dayCode = 'MIX'
        if (dayNums.length === 1) {
            dayCode = DAY_MAP[dayNums[0]] || 'XX'
        }

        const filename = `CPFR_Soriana_${dayCode}_${dateStr}.xlsx`

        XLSX.writeFile(wb, filename)
        return filename
    }

    async function generateStorePdfs(
        selectedItems: ExportTiendaItem[],
        dayNums: number[],
        tab?: string
    ): Promise<ExportPdfResult> {
        const { default: jsPDF } = await import('jspdf')
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        const dayCode = dayNums.length === 1 ? (DAY_MAP[dayNums[0]] || 'XX') : 'MIX'
        const logoDataUrl = await imageUrlToDataUrl(logoUrl)
        const pdfFiles: { name: string; data: Uint8Array }[] = []
        const red = { r: 199, g: 18, b: 31 }
        const redDark = { r: 153, g: 17, b: 27 }
        const gold = { r: 201, g: 148, b: 34 }
        const goldDark = { r: 161, g: 112, b: 20 }
        const grayBand = { r: 246, g: 244, b: 244 }
        const slate = { r: 45, g: 55, b: 72 }
        const muted = { r: 100, g: 116, b: 139 }
        const lightLine = { r: 224, g: 224, b: 224 }
        const orderStatusLegend = tab === 'centralizados'
            ? 'Estado del pedido: NO APROBADO'
            : tab === 'revision'
                ? 'Estado del pedido: EN REVISIÓN'
                : null

        for (const storeItem of groupItemsByStore(selectedItems)) {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 8
            const contentWidth = pageWidth - margin * 2
            let y = 0
            let pageNumber = 1
            const setFill = (color: { r: number; g: number; b: number }) => pdf.setFillColor(color.r, color.g, color.b)
            const setText = (color: { r: number; g: number; b: number }) => pdf.setTextColor(color.r, color.g, color.b)
            const textFit = (text: string, width: number) => {
                const safe = text || '-'
                if (pdf.getTextWidth(safe) <= width) return safe
                let out = safe
                while (out.length > 3 && pdf.getTextWidth(`${out}...`) > width) out = out.slice(0, -1)
                return `${out}...`
            }

            const addFooter = () => {
                setText(goldDark)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(7)
                pdf.setDrawColor(gold.r, gold.g, gold.b)
                pdf.setLineWidth(0.35)
                pdf.line(margin, pageHeight - 9, pageWidth / 2 - 13, pageHeight - 9)
                pdf.line(pageWidth / 2 + 13, pageHeight - 9, pageWidth - margin, pageHeight - 9)
                pdf.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 4.3, pageHeight - 14, 8.6, 7)
                pdf.text(`Pagina ${pageNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' })
            }

            const ensureSpace = (height: number) => {
                if (y + height <= pageHeight - 17) return
                addFooter()
                pdf.addPage()
                pageNumber += 1
                y = 14
            }

            const rowsByOc = new Map<string, ExportRow[]>()
            for (const row of storeItem.rows) {
                const key = row.num_pedido || 'SIN FOLIO'
                if (!rowsByOc.has(key)) rowsByOc.set(key, [])
                rowsByOc.get(key)!.push(row)
            }

            const totalPz = storeItem.rows.reduce((a, r) => a + r.cant_pedida, 0)
            const kgSummary = calculateBrandKgSummary(storeItem.rows)
            const jefatura = storeItem.jefatura || storeItem.rows[0]?.jefatura || 'N/D'
            const sucursal = storeItem.rows[0]?.sucursal || '-'

            y = 8
            pdf.addImage(logoDataUrl, 'PNG', margin + 2, y, 32, 26)
            setFill(red)
            pdf.roundedRect(margin + 40, y + 1, contentWidth - 40, 24, 2.5, 2.5, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(11.5)
            pdf.text(textFit(storeItem.nombre_tienda.toUpperCase(), 104), margin + 46, y + 10)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.6)
            pdf.text(`Cliente ${storeItem.id_cliente} | Jefatura ${jefatura}`, margin + 46, y + 17)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(8)
            pdf.text(`${rowsByOc.size} OC`, pageWidth - margin - 5, y + 10, { align: 'right' })
            pdf.setFontSize(7.1)
            pdf.text(`Total: ${formatNumber(kgSummary.totalKg, 1)}kg | Corona: ${formatNumber(kgSummary.coronaKg, 1)}kg | Ros: ${formatNumber(kgSummary.rosKg, 1)}kg`, pageWidth - margin - 5, y + 17, { align: 'right' })
            y += 31

            setFill(grayBand)
            pdf.roundedRect(margin, y, contentWidth, 11, 2, 2, 'F')
            setText(slate)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7)
            pdf.text(`Generado ${now.toLocaleDateString('es-MX')} | Dia ${dayCode} | Sucursal ${sucursal}`, margin + 13, y + 7)
            if (orderStatusLegend) {
                setText(redDark)
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(6.6)
                pdf.text(orderStatusLegend, pageWidth - margin - 4, y + 7, { align: 'right' })
            }
            pdf.setDrawColor(muted.r, muted.g, muted.b)
            pdf.setLineWidth(0.35)
            pdf.roundedRect(margin + 4, y + 2.8, 5, 5, 0.7, 0.7, 'S')
            pdf.line(margin + 5.1, y + 4.6, margin + 7.9, y + 4.6)
            pdf.line(margin + 5.1, y + 6, margin + 7.9, y + 6)
            pdf.line(margin + 5.7, y + 2.3, margin + 5.7, y + 3.5)
            pdf.line(margin + 7.3, y + 2.3, margin + 7.3, y + 3.5)
            y += 17

            const drawOcHeader = (oc: string, rows: ExportRow[]) => {
                const first = rows[0]
                const ocPz = rows.reduce((a, r) => a + r.cant_pedida, 0)
                const ocKg = rows.reduce((a, r) => a + r.pedido_kg, 0)
                const pillWidth = 36
                const pillX = pageWidth - margin - pillWidth

                setFill(red)
                pdf.roundedRect(margin, y, contentWidth, 13, 2.5, 2.5, 'F')
                setFill(gold)
                pdf.roundedRect(pillX, y, pillWidth, 13, 2.5, 2.5, 'F')
                pdf.rect(pillX, y, 7, 13, 'F')
                pdf.triangle(pillX - 6, y + 13, pillX, y, pillX, y + 13, 'F')

                pdf.setTextColor(255, 255, 255)
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(8)
                pdf.text(`OC ${oc}`, margin + 4, y + 5)
                pdf.setFontSize(6.4)
                pdf.text(textFit(`SEM ${first.semana_ic || '-'} | Pedido ${first.fec_pedido_cadena || '-'} | Fin emb. ${first.fec_fin_embarque || '-'} | ${rows.length} SKU`, contentWidth - pillWidth - 12), margin + 4, y + 9.4)
                pdf.setFontSize(6.8)
                pdf.text(`${formatNumber(ocPz, 0)} pz | ${formatNumber(ocKg, 1)} kg`, pageWidth - margin - 4, y + 7.6, { align: 'right' })
                y += 15
            }

            const drawTableHeader = () => {
                setText(slate)
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(6.5)
                pdf.text('SKU', margin + 3, y + 4)
                pdf.text('INV. ACT.', margin + 132, y + 4, { align: 'right' })
                pdf.text('SELL. PROM.', margin + 155, y + 4, { align: 'right' })
                pdf.text('COB. S.', margin + 174, y + 4, { align: 'right' })
                pdf.text('PEDIDO', pageWidth - margin - 4, y + 4, { align: 'right' })
                pdf.setDrawColor(lightLine.r, lightLine.g, lightLine.b)
                pdf.line(margin, y + 6, pageWidth - margin, y + 6)
                y += 8
            }

            Array.from(rowsByOc.entries()).forEach(([oc, rows]) => {
                ensureSpace(25)
                drawOcHeader(oc, rows)
                drawTableHeader()

                rows.forEach((row, index) => {
                    if (y + 6.8 > pageHeight - 17) {
                        addFooter()
                        pdf.addPage()
                        pageNumber += 1
                        y = 14
                        drawOcHeader(oc, rows)
                        drawTableHeader()
                    }
                    pdf.setDrawColor(lightLine.r, lightLine.g, lightLine.b)
                    pdf.setLineDashPattern([0.8, 1.2], 0)
                    pdf.line(margin, y + 6.4, pageWidth - margin, y + 6.4)
                    pdf.setLineDashPattern([], 0)
                    setText(slate)
                    pdf.setFont('helvetica', 'bold')
                    pdf.setFontSize(6.7)
                    pdf.text(textFit(row.desc, 118), margin + 3, y + 4.2)
                    setText(redDark)
                    pdf.text(formatNumber(row.inv_actual_pz, 2), margin + 132, y + 4.2, { align: 'right' })
                    pdf.text(formatNumber(row.promedio_sellout_pz, 2), margin + 155, y + 4.2, { align: 'right' })
                    pdf.text(formatNumber(row.cobertura_calculada, 2), margin + 174, y + 4.2, { align: 'right' })
                    pdf.text(`${formatNumber(row.cant_pedida, 0)} pz`, pageWidth - margin - 4, y + 4.2, { align: 'right' })
                    y += 6.8
                })

                y += 4
            })

            addFooter()
            const filename = `CPFR_${safeFilenamePart(storeItem.id_cliente)}_${safeFilenamePart(storeItem.nombre_tienda)}_${dayCode}_${dateStr}_${safeFilenamePart(jefatura)}.pdf`
            const blob = pdf.output('blob') as Blob
            pdfFiles.push({
                name: filename,
                data: new Uint8Array(await blob.arrayBuffer())
            })
        }

        if (pdfFiles.length === 1) {
            const file = pdfFiles[0]
            downloadBlob(new Blob([file.data], { type: 'application/pdf' }), file.name)
            return {
                filename: file.name,
                fileCount: 1,
                zipped: false
            }
        }

        const zipName = `CPFR_Pedidos_${dayCode}_${dateStr}.zip`
        downloadBlob(createZipBlob(pdfFiles), zipName)
        return {
            filename: zipName,
            fileCount: pdfFiles.length,
            zipped: true
        }
    }

    async function generateStoreImages(
        selectedItems: ExportTiendaItem[],
        dayNums: number[],
        tab?: string
    ): Promise<ExportImageResult> {
        const { default: html2canvas } = await import('html2canvas')
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        const dayCode = dayNums.length === 1 ? (DAY_MAP[dayNums[0]] || 'XX') : 'MIX'
        const orderStatusLegend = tab === 'centralizados'
            ? 'Estado del pedido: NO APROBADO'
            : tab === 'revision'
                ? 'Estado del pedido: EN REVISIÓN'
                : null
        const imageFiles: { name: string; data: Uint8Array }[] = []

        for (const storeItem of groupItemsByStore(selectedItems)) {
            const rowsByOc = new Map<string, ExportRow[]>()
            for (const row of storeItem.rows) {
                const key = row.num_pedido || 'SIN FOLIO'
                if (!rowsByOc.has(key)) rowsByOc.set(key, [])
                rowsByOc.get(key)!.push(row)
            }

            const totalPz = storeItem.rows.reduce((total, row) => total + row.cant_pedida, 0)
            const kgSummary = calculateBrandKgSummary(storeItem.rows)
            const jefatura = storeItem.jefatura || storeItem.rows[0]?.jefatura || 'N/D'
            const sucursal = storeItem.rows[0]?.sucursal || '-'
            const orderSections = Array.from(rowsByOc.entries()).map(([oc, rows]) => {
                const first = rows[0]
                const ocPz = rows.reduce((total, row) => total + row.cant_pedida, 0)
                const ocKg = rows.reduce((total, row) => total + row.pedido_kg, 0)
                const rowMarkup = rows.map((row) => `
                    <tr>
                        <td>${escapeHtml(row.desc || '-')}</td>
                        <td>${escapeHtml(formatNumber(row.inv_actual_pz, 2))}</td>
                        <td>${escapeHtml(formatNumber(row.promedio_sellout_pz, 2))}</td>
                        <td>${escapeHtml(formatNumber(row.cobertura_calculada, 2))}</td>
                        <td>${escapeHtml(`${formatNumber(row.cant_pedida, 0)} pz`)}</td>
                    </tr>
                `).join('')

                return `
                    <section class="oc-section">
                        <div class="oc-header">
                            <div>
                                <strong>OC ${escapeHtml(oc)}</strong>
                                <span>SEM ${escapeHtml(first?.semana_ic || '-')} | Pedido ${escapeHtml(first?.fec_pedido_cadena || '-')} | Fin emb. ${escapeHtml(first?.fec_fin_embarque || '-')} | ${rows.length} SKU</span>
                            </div>
                            <b>${escapeHtml(`${formatNumber(ocPz, 0)} pz | ${formatNumber(ocKg, 1)} kg`)}</b>
                        </div>
                        <table>
                            <thead><tr><th>SKU</th><th>INV. ACT.</th><th>SELL. PROM.</th><th>COB. S.</th><th>PEDIDO</th></tr></thead>
                            <tbody>${rowMarkup}</tbody>
                        </table>
                    </section>
                `
            }).join('')

            const container = document.createElement('article')
            container.style.cssText = 'position:fixed;left:-100000px;top:0;width:816px;background:#fff;color:#2d3748;font-family:Arial,sans-serif;z-index:-1;'
            container.innerHTML = `
                <style>
                    * { box-sizing: border-box; }
                    .report { padding: 32px; }
                    .report-header { display:flex; align-items:center; gap:22px; }
                    .report-header img { width:112px; height:91px; object-fit:contain; }
                    .store-card { min-height:84px; flex:1; border-radius:10px; background:#c7121f; color:#fff; padding:17px 19px; display:flex; justify-content:space-between; gap:14px; }
                    .store-card h1 { margin:0 0 9px; font-size:22px; line-height:1.05; letter-spacing:.2px; }
                    .store-card p, .store-card b { margin:0; font-size:12px; line-height:1.45; }
                    .store-summary { min-width:245px; text-align:right; }
                    .store-summary span { display:block; white-space:nowrap; font-size:10px; line-height:1.45; }
                    .meta-band { margin-top:17px; border-radius:8px; background:#f6f4f4; padding:11px 14px; display:flex; justify-content:space-between; gap:12px; color:#2d3748; font-size:11px; font-weight:700; }
                    .status { color:#99111b; text-align:right; }
                    .oc-section { margin-top:19px; }
                    .oc-header { min-height:54px; border-radius:10px; background:linear-gradient(90deg,#c7121f 0%,#c7121f 73%,#c99422 73%,#c99422 100%); color:#fff; padding:11px 15px; display:flex; align-items:center; justify-content:space-between; gap:14px; }
                    .oc-header strong { display:block; font-size:15px; margin-bottom:5px; }
                    .oc-header span { display:block; font-size:10px; }
                    .oc-header b { font-size:11px; text-align:right; white-space:nowrap; }
                    table { width:100%; border-collapse:collapse; margin-top:9px; table-layout:fixed; font-size:11px; }
                    th { padding:7px 5px; color:#2d3748; font-size:10px; text-align:right; border-bottom:1px solid #e0e0e0; }
                    th:first-child, td:first-child { width:58%; text-align:left; }
                    td { padding:8px 5px; color:#99111b; text-align:right; border-bottom:1px dashed #e0e0e0; vertical-align:top; }
                    td:first-child { color:#2d3748; font-weight:700; word-break:break-word; }
                    .report-footer { margin-top:25px; display:flex; align-items:center; justify-content:center; gap:12px; color:#a17014; font-size:10px; }
                    .report-footer::before, .report-footer::after { content:''; height:1px; flex:1; background:#c99422; }
                    .report-footer img { width:31px; height:25px; object-fit:contain; }
                </style>
                <div class="report">
                    <header class="report-header">
                        <img src="${escapeHtml(logoUrl)}" alt="PIC">
                        <div class="store-card">
                            <div>
                                <h1>${escapeHtml(storeItem.nombre_tienda.toUpperCase())}</h1>
                                <p>Cliente ${escapeHtml(storeItem.id_cliente)} | Jefatura ${escapeHtml(jefatura)}</p>
                            </div>
                            <div class="store-summary">
                                <b>${rowsByOc.size} OC</b>
                                <span>Total: ${escapeHtml(formatNumber(kgSummary.totalKg, 1))}kg | Corona: ${escapeHtml(formatNumber(kgSummary.coronaKg, 1))}kg | Ros: ${escapeHtml(formatNumber(kgSummary.rosKg, 1))}kg</span>
                            </div>
                        </div>
                    </header>
                    <div class="meta-band">
                        <span>Generado ${escapeHtml(now.toLocaleDateString('es-MX'))} | Día ${escapeHtml(dayCode)} | Sucursal ${escapeHtml(sucursal)}</span>
                        ${orderStatusLegend ? `<span class="status">${escapeHtml(orderStatusLegend)}</span>` : ''}
                    </div>
                    ${orderSections}
                    <footer class="report-footer"><span></span><img src="${escapeHtml(logoUrl)}" alt="PIC"><span></span></footer>
                </div>
            `

            document.body.appendChild(container)
            try {
                await waitForImages(container)
                const canvas = await html2canvas(container, {
                    backgroundColor: '#ffffff',
                    logging: false,
                    scale: 2,
                    useCORS: true,
                    windowWidth: 816,
                })
                const blob = await canvasToBlob(canvas)
                const filename = `CPFR_${safeFilenamePart(storeItem.id_cliente)}_${safeFilenamePart(storeItem.nombre_tienda)}_${dayCode}_${dateStr}_${safeFilenamePart(jefatura)}.png`
                imageFiles.push({ name: filename, data: new Uint8Array(await blob.arrayBuffer()) })
            } finally {
                container.remove()
            }
        }

        if (imageFiles.length === 1) {
            const file = imageFiles[0]
            downloadBlob(new Blob([file.data], { type: 'image/png' }), file.name)
            return { filename: file.name, fileCount: 1, zipped: false }
        }

        const zipName = `CPFR_Pedidos_${dayCode}_${dateStr}_imagenes.zip`
        downloadBlob(createZipBlob(imageFiles), zipName)
        return { filename: zipName, fileCount: imageFiles.length, zipped: true }
    }

    return { generateExcel, generateStorePdfs, generateStoreImages, buildExportItems }
}

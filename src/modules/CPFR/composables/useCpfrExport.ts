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
    rows: ExportRow[]
}

export interface ExportPdfResult {
    filename: string
    fileCount: number
    zipped: boolean
}

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
                        inv_actual_pz: sku.inv_actual_pz ?? 0,
                        promedio_sellout_pz: sku.promedio_sellout_pz ?? 0,
                        cobertura_calculada: calcularCoberturaDinamica(sku),
                        upc: sku.upc_cadena || '',
                        desc: sku.sku_nombre || '',
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
                    dayNum: dia.dia_num,
                    rows
                })
            }
        }
    }
    return items
}

export function useCpfrExport() {

    function generateExcel(selectedItems: ExportTiendaItem[], dayNums: number[]): string {
        const allRows: (string | number)[][] = []

        // Headers
        allRows.push(['Jefatura', 'cliente', 'nombre', 'sucursal', 'fec_fin_embarque', 'num_pedido', 'cant. pedida', 'upc', 'desc'])

        for (const item of selectedItems) {
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

    async function generateStorePdfs(selectedItems: ExportTiendaItem[], dayNums: number[]): Promise<ExportPdfResult> {
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
            const totalKg = storeItem.rows.reduce((a, r) => a + r.pedido_kg, 0)
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
            pdf.text(`${storeItem.rows.length} SKU | ${formatNumber(totalPz, 0)} pz | ${formatNumber(totalKg, 1)} kg`, pageWidth - margin - 5, y + 17, { align: 'right' })
            y += 31

            setFill(grayBand)
            pdf.roundedRect(margin, y, contentWidth, 11, 2, 2, 'F')
            setText(slate)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7)
            pdf.text(`Generado ${now.toLocaleDateString('es-MX')} | Dia ${dayCode} | Sucursal ${sucursal}`, margin + 13, y + 7)
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

    return { generateExcel, generateStorePdfs, buildExportItems }
}

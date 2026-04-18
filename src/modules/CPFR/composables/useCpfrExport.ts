// src/modules/CPFR/composables/useCpfrExport.ts
import * as XLSX from 'xlsx';

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
    cliente: string       // id_cliente parte antes de 's'
    nombre: string        // nombre_tienda
    sucursal: string      // id_cliente parte después de 's'
    fec_fin_embarque: string // AAAAMMDD
    num_pedido: string
    cant_pedida: number   // pedido_sugerido_pz_red
    upc: string           // upc_cadena
    desc: string          // JUST sku_nombre
}

export interface ExportTiendaItem {
    id_cliente: string
    nombre_tienda: string
    num_pedido: string
    estado_oc: string | null
    dayNum: number
    rows: ExportRow[]
}

function splitIdCliente(id_cliente: string): { cliente: string; sucursal: string } {
    const idx = id_cliente.toLowerCase().indexOf('s')
    if (idx === -1) return { cliente: id_cliente, sucursal: '' }
    return {
        cliente: id_cliente.slice(0, idx),
        sucursal: id_cliente.slice(idx + 1)
    }
}

function formatDateToAAAAMMDD(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    return dateStr.slice(0, 10).replace(/-/g, '')
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

                const rows: ExportRow[] = skus.map(sku => ({
                    cliente,
                    nombre: tienda.nombre_tienda,
                    sucursal,
                    fec_fin_embarque: formatDateToAAAAMMDD(sku.fec_fin_embarque),
                    num_pedido: sku.num_pedido || '',
                    cant_pedida: sku.pedido_sugerido_pz_red ?? 0,
                    upc: sku.upc_cadena || '',
                    desc: sku.sku_nombre || ''
                }))

                items.push({
                    id_cliente: tienda.id_cliente,
                    nombre_tienda: tienda.nombre_tienda,
                    num_pedido,
                    estado_oc: skus[0]?.estado_oc || null,
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
        allRows.push(['cliente', 'nombre', 'sucursal', 'fec_fin_embarque', 'num_pedido', 'cant. pedida', 'upc', 'desc'])

        for (const item of selectedItems) {
            for (const row of item.rows) {
                allRows.push([
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

    return { generateExcel, buildExportItems }
}

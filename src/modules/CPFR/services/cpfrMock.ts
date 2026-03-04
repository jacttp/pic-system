// src/modules/CPFR/services/cpfrMock.ts

import type { CpfrDataItem, CpfrFilterOptions } from '../types/cpfrTypes'

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

const TIENDAS: { id: string; nombre: string; jefatura: string; ruta: string; dia: string }[] = [
    { id: '150', nombre: 'Soriana Hiper Chapala', jefatura: 'Autoservicios Local 01 - Perla Villalobos', ruta: 'R-01', dia: 'MARTES' },
    { id: '28', nombre: 'Soriana Hiper Rio Nilo', jefatura: 'Autoservicios Local 01 - Perla Villalobos', ruta: 'R-01', dia: 'SABADO' },
    { id: '321', nombre: 'Soriana Hiper Circunvalacion', jefatura: 'Autoservicios Local 01 - Perla Villalobos', ruta: 'R-02', dia: 'JUEVES' },
    { id: '318', nombre: 'Soriana Hiper Oblatos', jefatura: 'Autoservicios Local 01 - Perla Villalobos', ruta: 'R-02', dia: 'MIERCOLES' },
    { id: '84', nombre: 'Soriana Hiper Estadio', jefatura: 'Autoservicios Local 01 - Perla Villalobos', ruta: 'R-03', dia: 'JUEVES' },
    { id: '332', nombre: 'Soriana Hiper Aguilas', jefatura: 'Autoservicios Local 02 - Vanessa Gaona', ruta: 'R-04', dia: 'SABADO' },
    { id: '16', nombre: 'Soriana Hiper Bugambilias', jefatura: 'Autoservicios Local 02 - Vanessa Gaona', ruta: 'R-04', dia: 'LUNES' },
    { id: '894', nombre: 'Soriana Mega Las Fuentes', jefatura: 'Autoservicios Local 02 - Vanessa Gaona', ruta: 'R-05', dia: 'SABADO' },
    { id: '289', nombre: 'Soriana Super Espacio Tlaquepaque', jefatura: 'Autoservicios Local 03 - Marco Ruiz', ruta: 'R-06', dia: 'VIERNES' },
    { id: '311', nombre: 'Soriana Hiper Gobernador Curiel', jefatura: 'Autoservicios Local 03 - Marco Ruiz', ruta: 'R-06', dia: 'VIERNES' },
]

const SKUS: string[] = [
    'Jamon de Pierna Extrafina Horneada Corona',
    'Jamon de Pierna Horneada 11x11',
    'Jamon de Pavo Golden Roast Corona',
    'Queso de Puerco Corona',
    'Tocino Corona',
    'Tocino Rebanado Corona 1 Kg',
    'Chorizo Al Vacio Corona 5 Kg',
    'Chorizo Al Vacio Corona 1 Kg',
    'Salchicha de Pavo Corona 500g',
    'Salchicha Viena Corona 500g',
    'Salchicha Cocktail 500g',
    'Pechuga de Pavo Corona',
    'Chorizo para Asar 300g',
    'Salchicha Frankfort Corona 500g',
    'Jamon Virginia de Pavo Rebanado 250g',
]

function rnd(min: number, max: number, decimals = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function rndInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateMockData(ano = 2025, semana = 20): CpfrDataItem[] {
    const rows: CpfrDataItem[] = []

    for (const tienda of TIENDAS) {
        for (const sku of SKUS) {
            const ventaProm = rnd(80, 500)
            const inv = rnd(0, ventaProm * 4)
            const sugerido = Math.max(0, Math.ceil(2.5 * ventaProm - inv))
            const pedidoCadena = sugerido > 0
                ? rndInt(Math.floor(sugerido * 0.5), Math.ceil(sugerido * 1.1))
                : 0

            rows.push({
                id_cliente: tienda.id,
                formatocte: tienda.nombre,
                jefatura: tienda.jefatura,
                ruta: tienda.ruta,
                dia: tienda.dia,
                SKU_NOMBRE: sku,
                semana,
                ano,
                invActual: inv,
                ventaPromSemanal: ventaProm,
                pedidoCadena,
            })
        }
    }

    return rows
}

export function generateMockFilters(): CpfrFilterOptions {
    return {
        anos: [2024, 2025],
        semanas: Array.from({ length: 52 }, (_, i) => i + 1),
        jefaturas: [...new Set(TIENDAS.map(t => t.jefatura))],
        tiendas: TIENDAS.map(t => ({ id: t.id, nombre: t.nombre })),
        dias: DIAS,
    }
}
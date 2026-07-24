import sorianaLogo from '@/assets/chains/soriana.png'
import walmartLogo from '@/assets/chains/walmart.png'
import chedrauiLogo from '@/assets/chains/chedraui.png'
import type { SelloutChain } from '../types/sellout'

interface SelloutChainConfig {
  name: string
  shortCode: string
  logo: string
  accept: string
  fileTag: string
  format: string
  columns: string
  accent: string
  rail: string
  marker: string
}

export const SELLOUT_CHAINS: SelloutChain[] = ['SORIANA', 'WALMART', 'CHEDRAUI']

export const SELLOUT_CHAIN_CONFIG: Record<SelloutChain, SelloutChainConfig> = {
  SORIANA: {
    name: 'Soriana',
    shortCode: 'SO',
    logo: sorianaLogo,
    accept: '.xls,.xlsx',
    fileTag: 'XLS/XLSX',
    format: 'Excel · primera hoja · columnas A:E',
    columns: 'Código Tienda · Código de Barras · Fecha · Venta · Inventario',
    accent: 'border-pic-accent-teal bg-pic-accent-teal-soft text-pic-accent-teal',
    rail: 'bg-pic-accent-teal',
    marker: 'bg-pic-accent-teal',
  },
  WALMART: {
    name: 'Walmart',
    shortCode: 'WM',
    logo: walmartLogo,
    accept: '.txt',
    fileTag: 'TXT',
    format: 'TXT · tabulador · sin encabezados',
    columns: 'Fecha · Tienda · Artículo · vacío · Venta · Inventario',
    accent: 'border-pic-accent-blue bg-pic-accent-blue-soft text-pic-accent-blue',
    rail: 'bg-pic-accent-blue',
    marker: 'bg-pic-accent-blue',
  },
  CHEDRAUI: {
    name: 'Chedraui',
    shortCode: 'CH',
    logo: chedrauiLogo,
    accept: '.xls,.xlsx',
    fileTag: 'XLS/XLSX',
    format: 'Excel diario · primera hoja · columnas B:F',
    columns: 'Fecha · Tienda · SKU · Venta Neta en Unidades · Inv Fin Uni',
    accent: 'border-pic-accent-orange bg-pic-accent-orange-soft text-pic-accent-orange',
    rail: 'bg-pic-accent-orange',
    marker: 'bg-pic-accent-orange',
  },
}

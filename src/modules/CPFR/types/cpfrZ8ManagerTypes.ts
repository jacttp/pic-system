export type Z8Tipo = 'z8' | 'z8carnes'
export type Z8Letra = 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export interface Z8OrderKey {
  id_cliente: string
  num_pedido: string
  fec_pedido_cadena: string
}

export interface Z8ExtraSeries {
  aplicable: boolean
  original: { num_pedido: string; estado: string; fec_pedido_cadena: string } | null
  extras: Array<{ num_pedido: string; estado: string; eliminado: boolean; fec_pedido_cadena: string }>
  consumidas: number
  siguiente_letra: Z8Letra | null
}

export interface Z8ManagerStore {
  id_cliente: string
  nombre_tienda: string
  Jefatura: string | null
  dia_ventas: number
  dia_cadena: number
  series: Record<Z8Tipo, Z8ExtraSeries>
}

export interface Z8PriorLine {
  sku_muliix: string
  num_pedido: string
  fec_pedido_cadena: string
  fec_envio: string | null
  estado: string
  cantidad_efectiva: number
}

export interface Z8CatalogItem {
  sku_muliix: string
  sku_nombre: string
  unidad_inventario: number
  pzas_bolsa: number
  pzas_caja: number
  sku_cadena: string | null
  upc_cadena: string | null
  antecedentes: Z8PriorLine[]
  antecedentes_token: string | null
}

export interface Z8ExtraLineInput { sku_muliix: string; cantidad_pz: number }

export interface Z8ExtraCreateInput {
  solicitud_id: string
  id_cliente: string
  nom_cadena: string
  year: number
  week: number
  tipo: Z8Tipo
  fec_envio: string
  motivo: string
  detalle_motivo?: string
  lineas: Z8ExtraLineInput[]
  confirmaciones_repetidos: Array<{ sku_muliix: string; antecedentes_token: string }>
}

export interface Z8ExtraUpdateInput extends Z8OrderKey {
  nom_cadena: string
  version: string
  fec_envio: string
  motivo: string
  detalle_motivo?: string
  lineas: Z8ExtraLineInput[]
  confirmaciones_repetidos: Array<{ sku_muliix: string; antecedentes_token: string }>
}

export interface Z8ManagerOrder extends Z8OrderKey {
  fec_envio: string | null
  estado: string
  es_extraordinario: boolean
  motivo: string | null
  detalle_motivo: string | null
  eliminado: boolean
  version: string
  lineas: Array<Z8CatalogItem & { cantidad_final_uni: number; ajuste: number; ajuste_mix: number; variable_bolsa: 0 | 1 }>
}

export interface Z8CalendarOrder extends Z8OrderKey {
  fec_envio: string | null
  estado: string
  total_skus: number
  total_piezas: number
  es_extraordinario: boolean
  motivo: string | null
}

export const Z8_REASON_LABELS: Record<string, string> = {
  festivo_puente: 'Festivo o puente',
  contingencia: 'Contingencia',
  solicitud_tienda: 'Solicitud de tienda',
  logistica: 'Logística',
  produccion: 'Producción',
  otro: 'Otro',
}

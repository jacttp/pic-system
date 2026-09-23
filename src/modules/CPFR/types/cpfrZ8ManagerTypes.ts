export type Z8Tipo = 'z8' | 'z8carnes'
export type Z8Letra = 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export interface Z8OrderKey {
  id_cliente: string
  num_pedido: string
  fec_pedido_cadena: string
}

export interface Z8ExtraSeries {
  aplicable: boolean
  original: Z8WeeklyOrder | null
  extras: Z8WeeklyOrder[]
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
  fecha_atencion: string | null
  motivos_en_fecha: Z8CalendarEventType[]
  pedidos: Z8WeeklyOrder[]
}
export type Z8CalendarEventType = 'pedido_creado' | 'fin_embarque' | 'atencion_oficial'
export interface Z8ManagerContext { timezone: 'America/Mexico_City'; today: string; isoYear: number; isoWeek: number; weekStart: string; weekEnd: string }
export interface Z8CalendarEvent { fecha: string; tipo: Z8CalendarEventType; id_cliente: string; pedido: Z8OrderKey | null }
export interface Z8CalendarDay { fecha: string; tiendas_relacionadas: number; tiendas_con_pedidos: number; pedidos_creados: number; pedidos_fin_embarque: number; tiendas_atencion_oficial: number }
export interface Z8ManagerCalendar { context: Z8ManagerContext; eventos: Z8CalendarEvent[]; dias: Z8CalendarDay[]; tiendas_sin_dia: number }
export interface Z8WeeklyOrder extends Z8OrderKey {
  tipo: 'oc' | Z8Tipo; extraordinario: boolean; letra: Z8Letra | null
  estado_resumen: string; estados: string[]; motivo: string | null
  detalle_motivo: string | null; fec_envio: string | null; fechas_fin_embarque: string[]
  total_skus: number; cantidad_solicitada_pz: number | null; cantidad_enviada_pz: number | null
  capacidades: { puede_editar: boolean; puede_eliminar: boolean; bloqueo_edicion: string | null; bloqueo_eliminacion: string | null }
  eventos_en_fecha: Z8CalendarEventType[]
  version: string
}
export interface Z8DeletePreview { pedidos: Array<Z8OrderKey & { bloqueo: string | null; lineas_fuente: number; lineas_persistidas: number; estados_fuente: string[]; estados_persistidos: string[] }>; preview_token: string; bloqueado: boolean }

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
  lineas: Array<{ sku_muliix: string; sku_nombre: string; estado: string; cantidad_final_uni: number | null; ajuste: number | null; ajuste_mix: number | null; cantidad_solicitada_pz: number | null; cantidad_enviada_pz: number | null }>
  capacidades: Z8WeeklyOrder['capacidades']
  fechas_fin_embarque: string[]
  tipo: 'oc' | Z8Tipo
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

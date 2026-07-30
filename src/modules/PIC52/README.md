# Reporte PIC 52S

Estado actual: Fases 0, 1, 2, 3 y 4.

## Regla de componentes y UI

Antes de crear o adaptar cualquier control del módulo se debe revisar
`src/modules/UIStandards/views/UIStandardsView.vue` y el catálogo
`src/modules/Shared/components/std/`. Se reutilizará primero un componente o
patrón existente; cualquier excepción deberá quedar justificada en este documento.

## Implementado

- Contrato backend para catálogos, opciones de producto, matrices y reporte.
- Ruta frontend `/admin/pic-52s`.
- Panel de filtros responsive y colapsable, alineado con el patrón operativo de
  `PIC/components/PicFilters.vue`.
- Componente compartido `FilterDropdown`.
- Semántica semanal `observed`/`missing`.
- Service Axios basado exclusivamente en `@/api/axios`; el JWT permanece a cargo
  del interceptor global.
- Store Pinia con catálogos, contexto comercial, bloqueos por rol y estado pendiente.
- Cascadas Gerencia → Jefatura → Ruta y jerarquía completa de producto.
- Las cascadas comercial y de producto están aisladas: cambiar Canal, Gerencia,
  Jefatura, Ruta, Matriz o Formato no recarga ni limpia Marca/producto.
- Selector paginado por Matriz.
- El selector muestra `Venta` y `NC` por defecto; el payload conserva el contrato
  `transaction: "Ventas"` para que el backend agregue ambas operaciones.
- El selector de años es multicheck y preselecciona los tres últimos disponibles;
  el payload envía exactamente los años marcados.
- Las semanas se seleccionan como un intervalo continuo mediante un slider de dos
  extremos, hasta SEM-52 o SEM-53.
- `Visualizar` consulta una sola vez `/api/pic-52s/report` y presenta las dos tablas
  comparativas y las dos gráficas ECharts.
- Cada tabla se presenta como un bloque independiente de ancho completo. El resumen
  de filtros solo aparece en su encabezado cuando la selección difiere del default.
- Cada año seleccionado se muestra como columna. La variación porcentual y la
  diferencia absoluta comparan los dos años más recientes de la selección.
- Los totales suman exclusivamente semanas `observed`; las semanas `missing`
  muestran `—` y los ceros observados permanecen como `0`.
- El total de la columna porcentual suma las variaciones semanales comparables
  mostradas en la tabla; no recalcula un porcentaje sobre los importes acumulados.
- Estado de carga, resultado vacío, error y reintento independiente del reporte.
- La respuesta queda almacenada en el store para que la Fase 4 alimente ECharts
  sin ejecutar una consulta distinta.
- La misma respuesta presenta dos superficies ECharts apiladas de ancho completo:
  kilogramos y pesos.
- Ambas gráficas comparten zoom, puntero, leyenda y resaltado.
- Tooltip semanal con valores por año, diferencia y variación.
- Clic para fijar una semana y mostrar un resumen común de KG y MXN.
- Zoom interior, slider táctil, marca de semana actual y toolbox con vista de datos,
  restauración, línea/barras y descarga PNG.
- Navegación por semanas mediante teclado (`←`, `→`) y restauración con `Esc`.
- Las semanas `missing` permanecen como huecos y nunca conectan artificialmente
  el trazo.
- Cambiar filtros invalida y oculta las gráficas hasta aplicar nuevamente.

## Pendiente para Fase 5

- Impresión de la vista activa.
- Endurecimiento responsive final y documentación del contrato completo.

## Checklist de revisión funcional de Fase 4

1. Aplicar `Visualizar` y confirmar una única llamada a `/api/pic-52s/report`.
2. Confirmar gráficas apiladas de KG y pesos con una serie por cada año marcado.
3. Confirmar que una semana `missing` deja un hueco y no une puntos vecinos.
4. Mover el cursor y confirmar tooltip sincronizado con valores, diferencia y %.
5. Ocultar un año desde la leyenda y confirmar el mismo estado en ambas gráficas.
6. Usar rueda, gesto táctil o slider y confirmar el mismo zoom en ambas.
7. Hacer clic en una semana y confirmar el resumen fijado de KG y MXN.
8. Enfocar una gráfica y usar `←`, `→` y `Esc`.
9. Probar vista de datos, restauración, línea/barras y descarga PNG del toolbox.
10. Confirmar la marca de semana actual cuando el año vigente esté seleccionado.
11. Cambiar cualquier filtro y confirmar que tablas y gráficas se ocultan hasta
    aplicar nuevamente con `Visualizar`.
12. Revisar legibilidad y controles en laptop 1366×768, tablet y móvil.

La impresión pertenece a la Fase 5.

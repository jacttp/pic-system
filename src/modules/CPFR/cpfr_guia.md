# Guía del Algoritmo y Visualización CPFR (Collaborative Planning, Forecasting, and Replenishment)

Esta guía detalla la lógica de cálculo del pedido sugerido y los indicadores visuales implementados en el módulo CPFR para optimizar el abastecimiento y la gestión de inventarios.

## 1. Algoritmo de Cálculo del Pedido Sugerido

El motor de cálculo opera bajo dos escenarios principales basados en la **cobertura actual** del SKU y aplica protecciones de seguridad para garantizar el abastecimiento.

### Definiciones Base
- **Múltiplo de Empaque (Bolsa)**: Todo pedido se redondea siempre a múltiplos de `pzas_bolsa`.
- **Criterio de Semanas**: El objetivo de cobertura (por defecto 2.5 semanas).

---

### Escenario A: Cobertura Saludable (2.0 a 3.0 semanas)
En este escenario, el inventario es óptimo. El sistema prioriza lo que la cadena solicita.
- **Lógica**: Se toma la `cant_pedida` por la cadena.
- **Redondeo**: Se aplica el múltiplo más cercano (`ROUND`) de la bolsa.
- **Protección Anti-Cero**: Si la cadena pide producto (`cant_pedida > 0`), el sistema **nunca** sugerirá 0. Si el redondeo aritmético resultara en 0, se fuerza a 1 bolsa (`CEIL`).

### Escenario B: Ajuste de Inventario (Cobertura < 2.0 o > 3.0)
El inventario está fuera de rango. El sistema calcula matemáticamente la necesidad real.
- **Cálculo Base**: `(Venta Promedio × Semanas Objetivo) - Inventario Actual + (Venta Promedio × Factor Ajuste)`.
- **Anti-Timidez (Redondeo CEIL)**: Para evitar quedarse por debajo del objetivo, el redondeo se hace siempre hacia arriba (`CEIL`) al múltiplo de bolsa. Preferimos exceder ligeramente el criterio que quedarnos cortos.
- **Heurística de Mínimo Envío (Frescura)**: Si el cálculo resulta en 0, el sistema verifica si enviar 1 bolsa mantendría la cobertura por debajo de `Criterio + 0.5`. Si es así, sugiere ese mínimo para mantener el flujo de producto fresco.

### Caso Especial: Sin Histórico de Venta (Producto Nuevo)
Si el SKU no tiene promedio de venta (sellout):
- **Acción**: Se ignora el cálculo matemático y se respeta el **Pedido Cadena** (`cant_pedida`), redondeado al múltiplo de bolsa.

---

### Guardia Final: Anti-Desabasto (Aplica a A y B)
Antes de entregar el resultado, se realiza una última validación:
- Si la **cobertura proyectada** con el pedido sugerido es menor al **Criterio de Semanas**.
- O si el **Fill Rate es 0%** cuando la cadena sí solicitó producto.
- **Acción**: El algoritmo incrementa el pedido de a 1 bolsa iterativamente hasta que la cobertura proyectada alcance el objetivo mínimo. **Nunca se sugiere desabasto.**

---

## 2. Guía Visual de la Tabla

La tabla utiliza colores e iconos inteligentes para diagnosticar la salud de cada SKU de forma no intrusiva.

### Diagnóstico de SKU (Fondos de Fila)
El color de la fila completa indica la situación general:
- 🟡 **Amarillo**: Producto sin histórico de sellout (Nuevo/Incorporado).
- 🟢 **Verde Suave**: Pedido sugerido cubre el 100% o lo más cercano a lo pedido por la cadena.
- 🟠 **Naranja Suave**: Fill Rate de 0% (Riesgo de desabasto o decisión de no surtir).
- 🔵 **Azul Suave**: Sobre-pedido (El algoritmo sugiere más de lo solicitado por la cadena para alcanzar el objetivo de inventario).

### Alertas de Columna

| Columna | Indicador | Significado |
| :--- | :--- | :--- |
| **Semanas Actuales** | ⚠️ Rojo | **Bajo Stock**: Cobertura menor al criterio objetivo. |
| | ↗️ Naranja | **Sobrestock**: Cobertura excede el criterio + 0.5. |
| | ❓ Gris | **Sin Datos**: Falta histórico de venta para calcular. |
| **Pedido Sugerido** | 🌱 Semilla | **Sin Sellout**: Sugerencia basada solo en pedido cadena. |
| | ✏️ Lápiz | **Editable**: SKU con histórico normal. |
| **Fill Rate** | 🚫 0% | El algoritmo sugiere 0 frente a una demanda de la cadena. |
| | ↓ < 80% | Sugerencia significativamente menor a lo solicitado. |
| | ✓ 100% | Surtido completo de la demanda. |
| | ↑ > 100% | **Sobre-pedido**: Sugerimos enviar más para alcanzar el objetivo. |

### Interactividad
- **Tooltips**: Pasa el ratón sobre cualquier icono o valor de cobertura/fill rate para leer una explicación detallada de la alerta.
- **Edición**: El input de pedido sugerido respeta automáticamente los múltiplos de bolsa. Si escribes un número inválido, se redondeará al múltiplo más cercano al guardar.

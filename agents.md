# CONTEXTO DEL MÓDULO: DETECCIÓN DE CANIBALIZACIÓN (PIC)

## 1. Objetivo del Módulo
Este módulo tiene como propósito identificar, cuantificar y visualizar casos de **"Canibalización Inducida"** en las ventas.
En el contexto de negocio (Embutidos Corona), esto ocurre cuando estrategias de incentivos ("Vivecos") provocan que la venta de un producto consolidado (**Víctima**) sea desplazada por un producto nuevo o promocionado (**Caníbal**), resultando en una pérdida de eficiencia logística (Drop Size) o nula ganancia neta.

## 2. Arquitectura Técnica
El módulo sigue una arquitectura **DDD (Domain-Driven Design)** implementada como un "Silo Modular" dentro de la aplicación Vue 3.
* **Ruta Base:** `src/modules/Cannibalization/`
* **Aislamiento:** El módulo es autocontenido. Posee sus propios tipos, servicios, stores y vistas.
* **Dependencias Externas:**
    * `src/api/axios.ts`: Para comunicación HTTP segura.
    * `src/Shared/components/charts/BaseChart.vue`: Para renderizado de gráficos (Chart.js).

## 3. Interacción Backend-Frontend

### 3.1. Responsabilidad del Backend (`Node.js`)
El backend actúa como un **Agregador y Pivoteador de Datos**. No realiza el análisis matemático de detección; su función es entregar vectores de venta limpios y estructurados jerárquicamente.

* **Endpoint:** `POST /api/cannibalization`
* **Controlador:** `getCannibalizationData` (en `picController.js`)
* **Query SQL:** Extrae ventas agrupadas por `Matriz` (Cliente), `Grupo` (Familia), `SKU` y `Mes`.
* **Transformación:** Convierte filas planas de base de datos en una estructura JSON anidada.

### 3.2. Contrato de Datos (Input del Frontend)
El frontend recibe una lista de nodos de cliente (`ClientNode[]`).

```typescript
// Estructura Jerárquica recibida del API
interface ClientNode {
    id: string;        // Identificador del Cliente (Matriz)
    name: string;      // Nombre del Cliente
    route: string;     // Ruta de venta
    families: {
        name: string;  // Familia de productos (ej: "ZF-Chorizos Corona")
        skus: {
            name: string;        // Nombre del SKU
            salesVector: number[]; // Array[12] con venta en KG (Ene-Dic)
            metaVector: number[];  // Array[12] con metas asignadas
        }[];
    }[];
}

```

## 4. Motor Lógico (Frontend)
El análisis de detección ocurre en el lado del cliente (Client-Side) para permitir interactividad en tiempo real sin saturar el servidor.

### 4.1. Ubicación

-Composable: src/modules/Cannibalization/composables/useCannibalizationEngine.ts

-Store: src/modules/Cannibalization/stores/cannibalizationStore.ts

### 4.2. Algoritmo de Detección

El motor itera sobre cada familia de cada cliente y aplica la siguiente heurística comparativa basada en un Mes de Corte (splitMonth):

1. Cálculo de Promedios: Se calcula el volumen promedio Pre-Corte y Post-Corte para cada SKU.

2. Identificación de Víctima:

- Condición: (PromedioPre - PromedioPost) / PromedioPre >= dropThreshold

- Significado: El producto cayó drásticamente tras el cambio de estrategia.

3. Identificación de Caníbal:

- Condición: (PromedioPost - PromedioPre) / PromedioPre >= growthThreshold (o es un producto nuevo).

- Significado: El producto creció significativamente en el mismo periodo.

4. Emparejamiento (Matchmaking):

- Si en una misma familia existen Víctimas y Caníbales, se asume correlación.

- Se calcula el netBalance (Ganancia - Pérdida).

### 4.3. Variables Configurables (Rules)
El análisis es dinámico y depende de los siguientes parámetros ajustables por el usuario:

- dropThreshold: Sensibilidad a la caída (ej. 0.4 = 40%).

- growthThreshold: Sensibilidad al crecimiento (ej. 0.2 = 20%).

- minVolume: Filtro de ruido para ignorar ventas insignificantes.

- splitMonth: Mes donde inicia la supuesta canibalización (Punto de inflexión).

## 5. Componentes Clave de UI

- AnalysisConfigPanel.vue: Interfaz de control. Modifica el estado reactivo rules en el Store, disparando automáticamente el re-análisis del motor (engine.runAnalysis).

- SuspectsTable.vue: Muestra la lista de casos detectados (DetectedCannibalization[]), ordenados por impactScore (Severidad económica).

SubstitutionChart.vue: Visualización detallada. Recibe dos vectores (Víctima vs Caníbal) y los grafica en una línea de tiempo para evidenciar el cruce de tendencias.

## 6. Flujo de Información Resumido
1. User Action: Selecciona Año 2025 y Familia "Chorizos".

2. API Call: fetchAnalysisData solicita datos crudos.

3. Store: Almacena rawData (Jerarquía de Clientes).

4. Engine: Ejecuta runAnalysis(rawData, rules).

5. Output: Genera detectedCases.

6. UI: Renderiza tabla de sospechosos.

7. Interaction: Usuario mueve slider de "Umbral Caída" -> Engine Recalcula -> UI se actualiza instantáneamente.



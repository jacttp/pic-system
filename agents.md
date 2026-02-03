# Contexto de Proyecto & Handover Frontend
**Proyecto:** PIC System (Módulo de Validación de Clientes)
**Rol Actual:** Arquitecto de Software Lead
**Estado:** Backend Finalizado (API v2) | Frontend Pendiente de Implementación

## 1. OBJETIVO DEL SPRINT
Desarrollar el módulo **"ClientValidation"** en el Frontend.
El objetivo de negocio es una herramienta para detectar, validar y homologar clientes duplicados basándose en su ubicación geográfica (`Geopos`).

El flujo de trabajo es:
1.  **Bandeja de Entrada:** Ver clientes con status `TipoCli = 'Revisar'`.
2.  **Análisis:** Al seleccionar uno, buscar automáticamente clientes cercanos (radio 1km).
3.  **Decisión:** (Futuro) Fusionar o validar.


## 2. ARQUITECTURA FRONTEND OBLIGATORIA
Estamos usando **Domain-Driven Design (DDD)** con "Silos Modulares".
**NO** agregues archivos en carpetas genéricas. Todo debe vivir dentro de `src/modules/ClientValidation/`.

**Estructura de Directorios Definida:**
```text
src/modules/ClientValidation/
├── components/
│   ├── ClientReviewTable.vue      # (Pendiente)
│   ├── HomologationWorkspace.vue  # (Pendiente - Panel derecho)
│   └── GeoMapWidget.vue           # (Fase 3 - Futuro)
├── services/
│   └── validationApi.ts           # (Definido abajo)
├── stores/
│   └── validationStore.ts         # (Lógica de estado Pinia)
├── types/
│   └── clientValidationTypes.ts   # (Interfaces estrictas)
└── views/
    └── ClientValidationView.vue   # (Layout Principal: Master-Detail)

```

**Tech Stack:**

- Vue 3 (Composition API + <script setup lang="ts">)
- TypeScript Estricto (Prohibido any).
- TailwindCSS.
- Pinia (Store Setup Syntax).

## 3. CONTRATO DE BACKEND (API v2 - YA IMPLEMENTADO)
Los endpoints ya existen y responden correctamente. Base URL: /api/v2/homologation Auth: Header Authorization: Bearer <TOKEN>

**A. Obtener Pendientes (GET /pending)** 
Query Params: page, limit

```JSON

{
    "success": true,
    "total": 150,
    "data": [
        {
            "clienteid": "CTE-001",
            "Nombre": "Abarrotes Don Pepe",
            "Geopos": "19.4326,-99.1332", // IMPORTANTE: String "lat,long"
            "TipoCli": "Revisar",
            "Calle_Numero": "Av. Siempre Viva 123"
        }
    ]
}
```

**B. Buscar Vecinos (GET /nearby)**

- Lógica: El backend parsea la string Geopos y aplica fórmula Haversine.
- Query Params:
   - lat: float (Ej: 19.4326)
   - lng: float (Ej: -99.1332)
   - radiusMetros: int (Default 1000)
   - excludeId: string (ID del cliente actual para no auto-encontrarse)

- Respuesta JSON:

```JSON

{
    "success": true,
    "count": 2,
    "data": [
        {
            "clienteid": "CTE-999",
            "Nombre": "Tienda Pepe (Duplicado)",
            "DistanciaKm": 0.05 // Distancia calculada
            // ... resto de datos
        }
    ]
}

```


## 4. INSTRUCCIONES DE IMPLEMENTACIÓN (PASO A PASO)

### Paso 1: Tipado (types/clientValidationTypes.ts)
Define interfaces para ClientReview (incluyendo Geopos string y DistanciaKm number opcional) y NearbyResponse.

### Paso 2: Servicio (services/validationApi.ts)
Implementa las funciones getPendingClients y getNearbyClients usando la instancia de axios existente (@/api/axios o picApi).

### Paso 3: Store (stores/validationStore.ts)
Necesitamos un store de Pinia que maneje:

- pendingClients: Array de pendientes.
- selectedClient: El cliente que el usuario está revisando actualmente.
- nearbyCandidates: Array de vecinos encontrados por el endpoint /nearby.
- Acción Crítica: selectClientForReview(client) -> Debe parsear la string client.Geopos ("lat,long"), validar que no sea null, y llamar automáticamente a la API /nearby.

### Paso 4: Vista (views/ClientValidationView.vue)

- mplementar un layout de Pantalla Dividida (Split View).
- Izquierda (1/3): Lista scrolleable de pendientes.
- Derecha (2/3): Panel de detalles.
   - Header con datos del selectedClient.
   - Sección "Análisis Geoespacial": Mostrar una tabla simple con los nearbyCandidates y su distancia. (El mapa gráfico se hará en el siguiente sprint).

### Paso 5: Router (src/routes/index.ts)
Asegúrate de que la ruta existente:


``` ts

{
    path: 'clients-validation',
    name: 'ClientValidation',
    component: () => import('@/modules/ClientValidation/views/ClientValidationView.vue')
}
```

Apunte correctamente al nuevo archivo.


## 5. REGLAS DE ORO (Estrictas)
1. Cero any: Si no sabes el tipo, crea una interfaz.
2. Manejo de Errores: La UI debe mostrar estados de isLoading y manejar errores de conexión (ej: si Geopos es inválida, no romper la app, solo avisar).
3. Código Limpio: Usa Composition API con <script setup>. No uses Options API.
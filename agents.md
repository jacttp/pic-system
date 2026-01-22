# Directiva de Arquitectura y Desarrollo: Sistema de Gobierno "Setup" (PIC v2.1)

## 1. Visión y Objetivo
Implementar un sistema de **Gobierno de Datos y Seguridad Matricial**.
El objetivo es eliminar los menús estáticos ("hardcodeados") en el Frontend. La visibilidad de los módulos debe ser controlada dinámicamente desde la base de datos, permitiendo:
1.  **Gestión Centralizada:** Encender/Apagar módulos sin redesplegar el Frontend.
2.  **Seguridad Vertical:** Restricción por jerarquía (`MinRoleLevel`).
3.  **Seguridad Horizontal:** Restricción por zona (`Scope`).

---

## 2. Diccionario de Datos y Lógica UI (CRÍTICO)

La tabla **`SysModulesIC`** es el cerebro del layout. Cada campo afecta directamente el renderizado en `AdminLayout.vue`.

| Campo BD | Tipo | Impacto en Frontend (`AdminLayout`) | Ejemplo |
| :--- | :--- | :--- | :--- |
| **ModuleKey** | `String` | Identificador interno para lógica en código (si se requiere). | `'PIC'`, `'USERS'` |
| **Label** | `String` | **Texto visible** en el botón del Sidebar. | `'Reporte Ventas'` |
| **Route** | `String` | Destino del `router-link`. Debe coincidir con `router/index.ts`. | `'/admin/pic'` |
| **Icon** | `String` | Clase de **FontAwesome** para el icono. | `'fa-solid fa-chart-pie'` |
| **Category** | `String` | **Agrupador Visual**. El Sidebar iterará sobre esto para crear separadores/títulos de sección. | `'Analítica'`, `'Gestión'` |
| **DisplayOrder**| `Int` | **Orden de renderizado**. Menor número = Más arriba. Se recomienda saltos de 10 en 10. | `10` (Arriba), `90` (Abajo) |
| **IsActive** | `Bit` | Interruptor Maestro. `0` = Desaparece del menú y Router bloquea acceso. | `1` (On), `0` (Off) |
| **MinRoleLevel**| `Int` | **Filtro Vertical**. El usuario debe tener `AccessLevel >= MinRoleLevel` para ver el botón. | `1` (User), `3` (Admin) |
| **Scope** | `String` | **Filtro Horizontal**. Si no es NULL, el usuario debe tener `Zona == Scope` exacta. | `'Corporativo'`, `NULL` |

---

## 3. Estado Actual (Infraestructura)

### Base de Datos (SQL Server)
* **`SysModulesIC`**: Tabla CREADA. Contiene el catálogo de módulos y reglas.
* **`UsuariosPicTest`**: Tabla EXISTENTE. Se agregó columna `AccessLevel` (int) para jerarquía.
* **`GerenciasUsuarios`**: Tabla EXISTENTE. Gestiona RLS (Row-Level Security) de datos.

### Estructura de Carpetas (Frontend)
El módulo de gestión residirá en: `src/modules/Setup/` (Store, Vistas, Tipos).

---

## 4. Guía: Cómo agregar un nuevo módulo (Futuro)

Para agregar una nueva funcionalidad al sistema (ej: "Inventarios"), **NO** se toca el `AdminLayout.vue`. Sigue estos pasos:

1.  **Desarrollo:** Crea los archivos Vue en `src/modules/Inventarios/`.
2.  **Rutas:** Registra la ruta en `src/router/index.ts`.
3.  **Registro (SQL):** Ejecuta un INSERT en la BD para que aparezca en el menú:
    ```sql
    INSERT INTO SysModulesIC 
    (ModuleKey, Label, Route, Icon, Category, DisplayOrder, MinRoleLevel)
    VALUES 
    ('INV', 'Inventarios', '/admin/inv', 'fa-box', 'Operación', 50, 2);
    ```
    *Resultado:* Automáticamente aparecerá un grupo "Operación" en el Sidebar con el botón "Inventarios" en la posición 50, visible solo para nivel 2+.

---

## 5. Roadmap de Implementación (Paso a Paso)

### FASE A: BACKEND (Node.js/Express)

- [ ] **Tarea A1: Actualizar Auth (Login)**
    * **Archivo:** `src/controllers/authController.js` (o similar).
    * **Acción:** Al hacer login, leer la columna `AccessLevel` de `UsuariosPicTest` e incluirla en el payload del JWT.
    * **Meta:** Frontend debe recibir: `{ id, user, role, zona, accessLevel }`.

- [ ] **Tarea A2: Endpoints de Sistema**
    * **Archivos:** `src/controllers/systemController.js`, `routes/systemRoutes.js`.
    * **Endpoint:** `GET /api/system/modules`.
    * **Query:** `SELECT * FROM SysModulesIC WHERE IsActive = 1 ORDER BY DisplayOrder ASC`.
    * *Nota:* No filtrar por rol en SQL. Traer todo y que el Frontend filtre (o filtrar en Backend si se prefiere máxima seguridad, definir estrategia). -> **Decisión:** Filtrar en Frontend para cachear la configuración completa, pero el Router Guard protege el acceso.

### FASE B: FRONTEND - LÓGICA (Store)

- [ ] **Tarea B1: Definir Tipos**
    * **Archivo:** `src/modules/Setup/types/setupTypes.ts`.
    * **Acción:** Mapear la tabla `SysModulesIC` a interfaz TypeScript `SystemModule`.

- [ ] **Tarea B2: SetupStore**
    * **Archivo:** `src/modules/Setup/stores/setupStore.ts`.
    * **Acción:**
        1.  `fetchModules()`: Carga la configuración.
        2.  `groupedMenu` (Getter): Retorna un objeto agrupado por `Category` para facilitar el loop en el layout.
        3.  Debe filtrar usando `authStore.user.accessLevel` vs `module.MinRoleLevel`.

### FASE C: FRONTEND - UI (Layout & Views)

- [ ] **Tarea C1: Refactorizar AdminLayout (CRÍTICO)**
    * **Archivo:** `src/modules/Shared/layouts/AdminLayout.vue`.
    * **Lógica:** Reemplazar links estáticos por doble bucle:
        ```html
        <template v-for="(modules, category) in store.groupedMenu">
           <div class="sidebar-header">{{ category }}</div>
           <router-link v-for="mod in modules" :to="mod.Route">
              <i :class="mod.Icon"></i> {{ mod.Label }}
           </router-link>
        </template>
        ```

- [ ] **Tarea C2: Router Guard (Seguridad)**
    * **Archivo:** `src/router/index.ts`.
    * **Acción:** En `beforeEach`, verificar permisos. Si el usuario va a `/admin/users` (Nivel 3) y tiene Nivel 1, redirigir a `/403`.

- [ ] **Tarea C3: Vista de Gestión (Opcional por ahora)**
    * **Archivo:** `src/modules/Setup/views/SystemConfigView.vue`.
    * **Meta:** UI para hacer los INSERTS/UPDATES sin usar SQL Management Studio.
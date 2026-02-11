## Para dar de alta un modulo en la BD.

``` sql
INSERT INTO SysModulesIC (
    ModuleKey,      -- Clave única interna (Mayúsculas)
    Label,          -- Nombre visible en el menú
    Route,          -- La URL del frontend (debe coincidir con el Router)
    Icon,           -- Clase de FontAwesome
    Category,       -- 'Analítica', 'Gestión' o 'Sistema'
    [Display Order],-- Orden de aparición (asegura que no choque con otros)
    IsActive,       -- 1 = Visible
    MinRoleLevel,   -- Nivel mínimo de acceso (1=User, 2=Gerente, etc.)
    DevStatus,      -- Estado del desarrollo
    Scope           -- 'Global' o 'Admin'
)
VALUES (
    'CANNIBALIZATION',           
    'Canibalización',            
    '/admin/cannibalization',    
    'fa-solid fa-chart-area',    -- Sugerencia de icono
    'Analítica',                 
    25,                          -- Ajusta este número según donde lo quieras ver
    1,                           
    1,                           -- Nivel de acceso (Ajústalo según necesites)
    'Finished',                  
    'Global'                     
);

```

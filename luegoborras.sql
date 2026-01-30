SELECT 
    O.Tipo, 
    O.Gerencia, 
    O.Jefatura, 
    O.SKU_NOMBRE, 
    O.Lista, 
    O.Descuento, 
    O.Ids_Cliente, 
    O.Nombre_Cliente
FROM 
    [dbo].[ofertasIC] O
WHERE 
    -- 1. BLOQUE DE SEGURIDAD (RLS)
    -- Verifica si el usuario es 'GEneral' o si pertenece a la gerencia del registro
    (
        EXISTS (SELECT 1 FROM [dbo].[GerenciaUsuarios] WHERE UsuarioIC = @UserID AND Gerencia = 'GEneral')
        OR
        O.Gerencia IN (SELECT Gerencia FROM [dbo].[GerenciaUsuarios] WHERE UsuarioIC = @UserID)
    )
    
    -- 2. VIGENCIA (Tu regla de negocio original)
    AND O.Anio_Vigencia = YEAR(GETDATE())
    AND O.Mes_Vigencia >= MONTH(GETDATE())

    -- 3. FILTROS DINÁMICOS

    -- Filtro Tipo: Acepta NULL, Vacío (Seleccionar Todo) o un valor específico
    AND (@Tipo IS NULL OR @Tipo = '' OR O.Tipo = @Tipo)         
    
    -- Filtro Jefatura: Manejo estándar de listas múltiples en SSRS
    AND (@Jefatura IS NULL OR @Jefatura = '' OR O.Jefatura IN (@Jefatura)) 
    
    -- Filtro SKU: Acepta NULL, Vacío (Seleccionar Todo) o coincidencia exacta
    AND (@SKU IS NULL OR @SKU = '' OR O.SKU_NOMBRE = @SKU) 

ORDER BY 
    O.Mes_Vigencia ASC, 
    O.Id_Oferta DESC;
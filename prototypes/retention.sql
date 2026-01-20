/* CONSULTA DE RETENCIÓN PIC V8 (GOLDEN STANDARD)
   - Agregado: [Ultima_Vez_Absoluta] para validación rápida.
   - Desglose: 24 columnas mensuales para sparklines.
   - Lógica: Historial Global vs Desempeño Reciente.
*/

DECLARE @FechaCorte DATE = '2025-12-31';

WITH HistorialGlobal AS (
    -- MEMORIA HISTÓRICA (Desde el inicio de los tiempos)
    SELECT 
        Matriz,
        MIN(DATEFROMPARTS(TRY_CAST(Año AS INT), Mes, 1)) as Primera_Vez_Historica,
        MAX(DATEFROMPARTS(TRY_CAST(Año AS INT), Mes, 1)) as Ultima_Vez_Historica
    FROM basevPic
    WHERE TRANSACCION IN ('venta', 'adm') AND VENTA_KG > 0
    GROUP BY Matriz
),
VentasDetalladas AS (
    -- RADIOGRAFÍA 2024-2025
    SELECT 
        Matriz,
        MAX(NOM_CLIENTE) as NombreCliente,
        MAX(canal) as Canal,
        MAX(formatocte) as Formato,
        
        -- TOTALES
        SUM(CASE WHEN Año = '2024' THEN VENTA_KG ELSE 0 END) as KG_2024,
        SUM(CASE WHEN Año = '2025' THEN VENTA_KG ELSE 0 END) as KG_2025,

        -- 2024 MENSUAL
        SUM(CASE WHEN Año = '2024' AND Mes = 1  THEN VENTA_KG ELSE 0 END) as v24_01,
        SUM(CASE WHEN Año = '2024' AND Mes = 2  THEN VENTA_KG ELSE 0 END) as v24_02,
        SUM(CASE WHEN Año = '2024' AND Mes = 3  THEN VENTA_KG ELSE 0 END) as v24_03,
        SUM(CASE WHEN Año = '2024' AND Mes = 4  THEN VENTA_KG ELSE 0 END) as v24_04,
        SUM(CASE WHEN Año = '2024' AND Mes = 5  THEN VENTA_KG ELSE 0 END) as v24_05,
        SUM(CASE WHEN Año = '2024' AND Mes = 6  THEN VENTA_KG ELSE 0 END) as v24_06,
        SUM(CASE WHEN Año = '2024' AND Mes = 7  THEN VENTA_KG ELSE 0 END) as v24_07,
        SUM(CASE WHEN Año = '2024' AND Mes = 8  THEN VENTA_KG ELSE 0 END) as v24_08,
        SUM(CASE WHEN Año = '2024' AND Mes = 9  THEN VENTA_KG ELSE 0 END) as v24_09,
        SUM(CASE WHEN Año = '2024' AND Mes = 10 THEN VENTA_KG ELSE 0 END) as v24_10,
        SUM(CASE WHEN Año = '2024' AND Mes = 11 THEN VENTA_KG ELSE 0 END) as v24_11,
        SUM(CASE WHEN Año = '2024' AND Mes = 12 THEN VENTA_KG ELSE 0 END) as v24_12,

        -- 2025 MENSUAL
        SUM(CASE WHEN Año = '2025' AND Mes = 1  THEN VENTA_KG ELSE 0 END) as v25_01,
        SUM(CASE WHEN Año = '2025' AND Mes = 2  THEN VENTA_KG ELSE 0 END) as v25_02,
        SUM(CASE WHEN Año = '2025' AND Mes = 3  THEN VENTA_KG ELSE 0 END) as v25_03,
        SUM(CASE WHEN Año = '2025' AND Mes = 4  THEN VENTA_KG ELSE 0 END) as v25_04,
        SUM(CASE WHEN Año = '2025' AND Mes = 5  THEN VENTA_KG ELSE 0 END) as v25_05,
        SUM(CASE WHEN Año = '2025' AND Mes = 6  THEN VENTA_KG ELSE 0 END) as v25_06,
        SUM(CASE WHEN Año = '2025' AND Mes = 7  THEN VENTA_KG ELSE 0 END) as v25_07,
        SUM(CASE WHEN Año = '2025' AND Mes = 8  THEN VENTA_KG ELSE 0 END) as v25_08,
        SUM(CASE WHEN Año = '2025' AND Mes = 9  THEN VENTA_KG ELSE 0 END) as v25_09,
        SUM(CASE WHEN Año = '2025' AND Mes = 10 THEN VENTA_KG ELSE 0 END) as v25_10,
        SUM(CASE WHEN Año = '2025' AND Mes = 11 THEN VENTA_KG ELSE 0 END) as v25_11,
        SUM(CASE WHEN Año = '2025' AND Mes = 12 THEN VENTA_KG ELSE 0 END) as v25_12

    FROM basevPic
    WHERE 
        TRANSACCION IN ('venta', 'adm') 
        AND Año IN ('2024', '2025') 
    GROUP BY Matriz
)
SELECT 
    V.*, -- Todas las columnas de venta
    
CASE 
        -- 1. CASO SCHRÖDINGER (Prioridad Máxima)
        -- Empezó en 2025 Y ADEMÁS ya dejó de comprar hace > 3 meses.
        WHEN YEAR(H.Primera_Vez_Historica) = 2025 
             AND DATEDIFF(MONTH, H.Ultima_Vez_Historica, @FechaCorte) > 3 
        THEN 'NUEVO ABANDONO' 
        
        -- 2. NUEVO EXITOSO
        -- Empezó en 2025 y sigue activo (o compró hace poco).
        WHEN YEAR(H.Primera_Vez_Historica) = 2025 THEN 'NUEVO'
        
        -- 3. BAJA HISTÓRICA
        -- Cliente viejo (compró antes de 2025) que dejó de comprar.
        WHEN DATEDIFF(MONTH, H.Ultima_Vez_Historica, @FechaCorte) > 3 THEN 'BAJA'
        
        -- 4. RESTO
        ELSE 'ACTIVO'
    END as Status_Cliente,

    (V.KG_2025 - V.KG_2024) as Diferencia_KG,
    DATEDIFF(MONTH, H.Ultima_Vez_Historica, @FechaCorte) as Meses_Sin_Compra,
    FORMAT(H.Primera_Vez_Historica, 'yyyy-MM') as Primera_Vez_Absoluta,
    FORMAT(H.Ultima_Vez_Historica, 'yyyy-MM') as Ultima_Vez_Absoluta

FROM VentasDetalladas V
INNER JOIN HistorialGlobal H ON V.Matriz = H.Matriz
WHERE (V.KG_2024 > 0 OR V.KG_2025 > 0)
ORDER BY Diferencia_KG ASC;
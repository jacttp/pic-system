import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { picApi } from '../services/picApi';
import type { PicFilterOptions } from '../types/picTypes';

export const usePicFilterStore = defineStore('picFilter', () => {
   // 1. ESTADO: Opciones disponibles para llenar los selects
   const options = reactive<PicFilterOptions>({
      canales: [],
      gerencias: [],
      marcas: [],
      anios: [],
      transacciones: [],
      formatosCliente: []
   });

   // Opciones dependientes (se llenan dinámicamente)
   const depOptions = reactive({
      jefaturas: [] as string[],
      rutas: [] as string[],
      grupos: [] as string[],
      categorias: [] as string[],
      skus: [] as string[]
   });

   // 2. ESTADO: Selecciones del usuario
   const selected = reactive({
      canal: [] as string[],
      Gerencia: [] as string[],
      Jefatura: [] as string[],
      Ruta: [] as string[],
      Marca: [] as string[],
      grupo: [] as string[],
      Categorias: [] as string[],
      SKU: [] as string[],
      Anio: [] as string[],
      Transaccion: ['Venta', 'Metas', 'NC'], // Default legacy
      FormatoCliente: [] as string[],
      MesInicial: '1',
      MesFinal: '12'
   });

   // Almacén para las tablas
   const projectionData = reactive({
      familias: [] as any[],
      marcas: [] as any[],
      gerencia: [] as any[],
      zona: [] as any[],
      canal: [] as any[],
      clientes: [] as any[],
      articulos: [] as any[]
   });
   const isLoading = ref(false);

   const reportData = ref<any[]>([]); // Datos crudos de la API
   const isGenerating = ref(false);   // Loading específico del botón generar

   const isComparisonFrozen = ref(true); //Candado de comparación - por defecto activado. 
   const selectedClients = reactive(new Map<string, string>());
   const loadingProjections = reactive<Record<string, boolean>>({});

   const dynamicWidgets = ref<DynamicWidget[]>([]);



   // 3. ACCIONES

   // Carga inicial (al montar el componente)
   async function initFilters() {
      isLoading.value = true;
      try {
         const data = await picApi.getInitialFilters();
         Object.assign(options, data);

         // Lógica Legacy Mejorada: Seleccionar Año Actual y 2 previos
         if (options.anios.length > 0) {
            const currentYear = new Date().getFullYear(); // 2026
            const targetYears = [
               (currentYear - 2).toString(), // 2024
               (currentYear - 1).toString(), // 2025
               currentYear.toString()        // 2026
            ];

            // Filtramos para asegurar que los años calculados existan en las opciones que trajo la API
            const matchedYears = targetYears.filter(y => options.anios.includes(y));

            if (matchedYears.length > 0) {
               selected.Anio = matchedYears;
            } else {
               // Fallback: Si la BD es muy vieja y no tiene el año actual, tomamos los últimos disponibles
               const sortedYears = [...options.anios].sort();
               selected.Anio = sortedYears.slice(-3);
            }
         }
      } catch (error) {
         console.error("Error cargando filtros iniciales", error);
      } finally {
         isLoading.value = false;
      }
   }

   // --- CASCADAS ---

   // Cuando cambia GERENCIA
   async function handleGerenciaChange() {
      // 1. Limpiar hijos
      selected.Jefatura = [];
      selected.Ruta = [];
      depOptions.jefaturas = [];
      depOptions.rutas = [];

      // 2. Si hay selección, buscar nuevos datos
      if (selected.Gerencia.length > 0) {
         const data = await picApi.getDependentOptions('jefaturas', { Gerencia: selected.Gerencia });
         depOptions.jefaturas = data;
      }
   }

   // Cuando cambia JEFATURA
   async function handleJefaturaChange() {
      selected.Ruta = [];
      depOptions.rutas = [];

      if (selected.Jefatura.length > 0) {
         const data = await picApi.getDependentOptions('rutas', { Jefatura: selected.Jefatura });
         depOptions.rutas = data;
      }
   }

   // Cuando cambia MARCA
   async function handleMarcaChange() {
      selected.grupo = [];
      selected.Categorias = [];
      selected.SKU = [];
      depOptions.grupos = [];
      depOptions.categorias = [];
      depOptions.skus = [];

      if (selected.Marca.length > 0) {
         const [grupos, skus] = await Promise.all([
            picApi.getDependentOptions('grupos', { Marca: selected.Marca }),
            picApi.getDependentOptions('skus', { Marca: selected.Marca })
         ]);
         depOptions.grupos = grupos;
         depOptions.skus = skus;
      }
   }

   // Cuando cambia GRUPO
   async function handleGrupoChange() {
      selected.Categorias = [];
      // Nota: SKU se recarga filtrado por Marca + Grupo
      selected.SKU = [];
      depOptions.categorias = [];

      if (selected.grupo.length > 0) {
         const [categorias, skus] = await Promise.all([
            picApi.getDependentOptions('categorias', { Marca: selected.Marca, grupo: selected.grupo }),
            picApi.getDependentOptions('skus', { Marca: selected.Marca, grupo: selected.grupo })
         ]);
         depOptions.categorias = categorias;
         depOptions.skus = skus;
      } else {
         // Si deselecciono grupo, recargar SKUs solo por Marca
         if (selected.Marca.length > 0) {
            depOptions.skus = await picApi.getDependentOptions('skus', { Marca: selected.Marca });
         }
      }
   }

   // NUEVA ACCIÓN: Generar Reporte (CORREGIDA)
   async function generateReport() {
      isGenerating.value = true;
      try {
         // 1. Limpiar proyecciones anteriores (CRÍTICO para consistencia)
         Object.keys(projectionData).forEach(key => {
            projectionData[key as keyof typeof projectionData] = [];
         });

         // 1. Construir filtros limpios para la API
         const apiFilters: Record<string, any> = {};

         // Mapeo de filtros UI -> API Columns
         const mappings: Record<string, string> = {
            'Transaccion': 'TRANSACCION',
            'FormatoCliente': 'formatocte',
            'grupo': 'grupo',
            'Categorias': 'Categorias',
            'SKU': 'SKU_NOMBRE'
         };

         // A. Agregar filtros estándar (Dropdowns)
         for (const key in selected) {
            const val = selected[key as keyof typeof selected];
            // Si es un array y tiene valores
            if (Array.isArray(val) && val.length > 0) {
               const dbKey = mappings[key] || key;
               // Excluimos mes/año aquí porque se tratan aparte o ya tienen su lógica
               if (key !== 'MesInicial' && key !== 'MesFinal') {
                  apiFilters[dbKey] = val;
               }
            }
         }

         // B. Agregar rango de meses
         apiFilters['MesInicial'] = selected.MesInicial;
         apiFilters['MesFinal'] = selected.MesFinal;

         // C. AGREGRAR CLIENTES SELECCIONADOS (¡ESTO FALTABA!)
         if (selectedClients.size > 0) {
            // Convertimos las llaves del Map (IDs) a un Array simple
            apiFilters['IDCLIENTE'] = Array.from(selectedClients.keys());
            console.log("Filtro de clientes aplicado:", apiFilters['IDCLIENTE']);
         }

         // 2. Llamada a la API
         // Nota: El backend en 'picController.js' ya está programado para recibir 'IDCLIENTE'
         // y filtrar por la columna [IDCLIENTE] IN (...)
         const data = await picApi.getDashboardData(apiFilters, ['Año', 'Mes']);
         reportData.value = data;

         return true; // Éxito

      } catch (error) {
         console.error("Error generando reporte:", error);
         return false;
      } finally {
         isGenerating.value = false;
      }
   }

   // --- NUEVA ACCIÓN: CARGA BAJO DEMANDA ---
   async function fetchSingleProjection(dimensionKey: string) {
      // Marcamos esta tabla específica como cargando
      loadingProjections[dimensionKey] = true;

      try {
         // 1. Reconstruir filtros (Podríamos refactorizar esto a un getter para no repetir código, pero por ahora copiamos la lógica)
         const apiFilters: Record<string, any> = {};
         const mappings: Record<string, string> = {
            'Transaccion': 'TRANSACCION', 'FormatoCliente': 'formatocte',
            'grupo': 'grupo', 'Categorias': 'Categorias', 'SKU': 'SKU_NOMBRE'
         };
         for (const key in selected) {
            const val = selected[key as keyof typeof selected];
            if (Array.isArray(val) && val.length > 0) {
               const dbKey = mappings[key] || key;
               if (key !== 'MesInicial' && key !== 'MesFinal') apiFilters[dbKey] = val;
            }
         }
         apiFilters['MesInicial'] = selected.MesInicial;
         apiFilters['MesFinal'] = selected.MesFinal;
         if (selectedClients.size > 0) apiFilters['IDCLIENTE'] = Array.from(selectedClients.keys());

         // 2. Años objetivo
         let yearsTarget = selected.Anio.length > 0
            ? [...selected.Anio].sort()
            : (options.anios.length > 0 ? options.anios.slice(-3).sort() : ['2023', '2024', '2025']);

         // --- CAMBIO AQUÍ: Definir límite según la dimensión ---
         let limit: number | undefined = undefined;

         // Regla: Clientes y Artículos limitados a Top 50 para rendimiento
         if (dimensionKey === 'clientes' || dimensionKey === 'articulos') {
            limit = 50;
         }

         // 3. Llamada API
         const data = await picApi.getProjection(dimensionKey, apiFilters, yearsTarget, limit);

         // 4. Guardar en el slot correspondiente
         // @ts-ignore (Tipado dinámico rápido)
         projectionData[dimensionKey] = data;

      } catch (e) {
         console.error(`Error cargando proyección ${dimensionKey}`, e);
      } finally {
         loadingProjections[dimensionKey] = false;
      }
   }

   //Toggle Candado
   function toggleComparisonLock() {
      isComparisonFrozen.value = !isComparisonFrozen.value;
   }

   // ACCIONES DE CLIENTES
   function toggleClientSelection(id: string, name: string) {
      if (selectedClients.has(id)) {
         selectedClients.delete(id);
      } else {
         selectedClients.set(id, name);
      }
   }

   function clearSelectedClients() {
      selectedClients.clear();
   }

   // Helper para formatear filtros para la API de Clientes
   // (Excluye mes/año porque los clientes son entidades estáticas, no transaccionales)
   function getFiltersForClientSearch() {
      const apiFilters: Record<string, any> = {};

      // Mapeo manual de lo que espera el backend vs lo que tenemos
      // Basado en filterController.js: allowedFilterColumns
      const keys = ['canal', 'Gerencia', 'Jefatura', 'Ruta', 'FormatoCliente'];
      const backendKeys: Record<string, string> = { 'FormatoCliente': 'formatocte' };

      keys.forEach(key => {
         const val = selected[key as keyof typeof selected];
         if (Array.isArray(val) && val.length > 0) {
            const dbKey = backendKeys[key] || key;
            apiFilters[dbKey] = val;
         }
      });
      return apiFilters;
   }
   function resetFilters() {
      // 1. Limpiar arrays de selección
      selected.canal = [];
      selected.Gerencia = [];
      selected.Jefatura = [];
      selected.Ruta = [];
      selected.Marca = [];
      selected.grupo = [];
      selected.Categorias = [];
      selected.SKU = [];
      selected.FormatoCliente = [];

      // 2. Restaurar Defaults
      selected.Transaccion = ['Venta', 'Metas', 'NC'];
      selected.MesInicial = '1';
      selected.MesFinal = '12';

      // 3. Restaurar Años (Últimos 3)
      if (options.anios.length > 0) {
         const sortedYears = [...options.anios].sort();
         selected.Anio = sortedYears.slice(-3);
      } else {
         selected.Anio = [];
      }

      // 4. Limpiar Clientes
      selectedClients.clear();

      // 5. Limpiar opciones dependientes (Cascada)
      depOptions.jefaturas = [];
      depOptions.rutas = [];
      depOptions.grupos = [];
      depOptions.categorias = [];
      depOptions.skus = [];
   }

   function addDynamicWidget(widget: DynamicWidget) {
      // Agregamos al inicio para que se vea luego luego
      dynamicWidgets.value.unshift(widget);

      // Opcional: Limitar a máximo 5 gráficos dinámicos para no saturar memoria
      if (dynamicWidgets.value.length > 5) {
         dynamicWidgets.value.pop();
      }
   }

   function removeDynamicWidget(id: string) {
      dynamicWidgets.value = dynamicWidgets.value.filter(w => w.id !== id);
   }

   function clearDynamicWidgets() {
      dynamicWidgets.value = [];
   }

   return {

      selectedClients,
      toggleClientSelection,
      clearSelectedClients,
      getFiltersForClientSearch,

      resetFilters,

      isComparisonFrozen,
      toggleComparisonLock,

      reportData,
      projectionData,     // Datos de tablas
      loadingProjections, // Estado de carga individual
      fetchSingleProjection, // Acción nueva

      isGenerating,
      generateReport,

      options,
      depOptions,
      selected,
      isLoading,
      initFilters,
      handleGerenciaChange,
      handleJefaturaChange,
      handleMarcaChange,
      handleGrupoChange,

      dynamicWidgets,
      addDynamicWidget,
      removeDynamicWidget,
      clearDynamicWidgets
   };
});
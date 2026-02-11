/* src/modules/CustomerSegmentation/composables/useFilterOptions.ts */

import { ref, reactive } from 'vue'
import api from '@/api/axios'

/**
 * Composable para gestión de opciones de filtros
 * Reutiliza endpoints de /api/filters del módulo PIC
 */
export function useFilterOptions() {

   // Opciones estáticas (GET)
   const staticOptions = reactive({
      canales: [] as string[],
      gerencias: [] as string[],
      marcas: [] as string[],
      anios: [] as string[],
      transacciones: [] as string[]
   })

   // Opciones dependientes (POST con filtros)
   const dependentOptions = reactive({
      jefaturas: [] as string[],
      rutas: [] as string[],
      grupos: [] as string[],
      categorias: [] as string[]
   })

   const isLoadingOptions = ref(false)
   const optionsError = ref<string | null>(null)

   /**
    * Cargar opciones estáticas (una sola vez al inicio)
    */
   async function loadStaticOptions() {
      isLoadingOptions.value = true
      optionsError.value = null

      try {
         const [canales, gerencias, marcas, anios] = await Promise.all([
            api.get('filters/canales'),
            api.get('filters/gerencias'),
            api.get('filters/marcas'),
            api.get('filters/anios')
         ])

         staticOptions.canales = canales.data
         staticOptions.gerencias = gerencias.data
         staticOptions.marcas = marcas.data
         staticOptions.anios = anios.data.sort((a: string, b: string) => b.localeCompare(a)) // Descendente

      } catch (e: any) {
         optionsError.value = 'Error al cargar opciones de filtros'
         console.error('[FilterOptions] Error loading static options:', e)
      } finally {
         isLoadingOptions.value = false
      }
   }

   /**
    * Cargar jefaturas según gerencias seleccionadas
    */
   async function loadJefaturas(gerencias: string[]) {
      if (gerencias.length === 0) {
         dependentOptions.jefaturas = []
         return
      }

      try {
         const { data } = await api.post('filters/jefaturas', { Gerencia: gerencias })
         dependentOptions.jefaturas = data
      } catch (e) {
         console.error('[FilterOptions] Error loading jefaturas:', e)
         dependentOptions.jefaturas = []
      }
   }

   /**
    * Cargar rutas según jefaturas seleccionadas
    */
   async function loadRutas(jefaturas: string[]) {
      if (jefaturas.length === 0) {
         dependentOptions.rutas = []
         return
      }

      try {
         const { data } = await api.post('filters/rutas', { Jefatura: jefaturas })
         dependentOptions.rutas = data
      } catch (e) {
         console.error('[FilterOptions] Error loading rutas:', e)
         dependentOptions.rutas = []
      }
   }

   /**
    * Cargar grupos según marcas seleccionadas
    */
   async function loadGrupos(marcas: string[]) {
      if (marcas.length === 0) {
         dependentOptions.grupos = []
         return
      }

      try {
         const { data } = await api.post('filters/grupos', { Marca: marcas })
         dependentOptions.grupos = data
      } catch (e) {
         console.error('[FilterOptions] Error loading grupos:', e)
         dependentOptions.grupos = []
      }
   }

   /**
    * Cargar categorías según grupos seleccionados
    */
   async function loadCategorias(grupos: string[]) {
      if (grupos.length === 0) {
         dependentOptions.categorias = []
         return
      }

      try {
         const { data } = await api.post('filters/categorias', { grupo: grupos })
         dependentOptions.categorias = data
      } catch (e) {
         console.error('[FilterOptions] Error loading categorias:', e)
         dependentOptions.categorias = []
      }
   }

   /**
    * Resetear opciones dependientes (cascada)
    */
   function resetDependentOptions() {
      dependentOptions.jefaturas = []
      dependentOptions.rutas = []
      dependentOptions.grupos = []
      dependentOptions.categorias = []
   }

   return {
      staticOptions,
      dependentOptions,
      isLoadingOptions,
      optionsError,
      loadStaticOptions,
      loadJefaturas,
      loadRutas,
      loadGrupos,
      loadCategorias,
      resetDependentOptions
   }
}
// src/modules/CPFR/stores/cpfrZ8Store.ts
// Store Pinia para el dashboard Z8.
// Deliberadamente separado de cpfrStore para no alterar el flujo existente.
// Se activa desde CpfrOrderTable cuando el usuario pulsa "Ver Z8".

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cpfrApi } from '../services/cpfrApi'
import { useCpfrStore } from './cpfrStore'
import type { CpfrDiaDashZ8, CpfrDashZ8Response, CpfrZ8Context } from '../types/cpfrZ8Types'

export const useCpfrZ8Store = defineStore('cpfrZ8', () => {

    // ── State ─────────────────────────────────────────────────────────────────

    const dias    = ref<CpfrDiaDashZ8[]>([])
    const context = ref<CpfrZ8Context | null>(null)
    const loading = ref(false)
    const error   = ref<string | null>(null)
    const loaded  = ref(false)   // true tras la primera carga exitosa

    // UI — control de expansión por OC (clave: num_pedido)
    const expandedOCs = ref<Set<string>>(new Set())

    // ── Computed ──────────────────────────────────────────────────────────────

    const totalSkusZ8 = computed(() => context.value?.total_skus_z8 ?? 0)
    const totalTiendas = computed(() => context.value?.total_tiendas ?? 0)

    const hasData = computed(() =>
        dias.value.some(d => d.tiendas.some(t => t.ocs_z8.length > 0))
    )

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Carga el dashboard Z8 reutilizando el contexto activo de cpfrStore
     * (year, week, nom_cadena, criterio_global, filters).
     */
    async function loadZ8() {
        const cpfrStore = useCpfrStore()

        if (!cpfrStore.currentWeek) {
            error.value = 'No hay semana activa. Carga primero el dashboard principal.'
            return
        }

        loading.value = true
        error.value   = null

        try {
            const body = {
                year:             cpfrStore.currentWeek.anio,
                week:             cpfrStore.currentWeek.semana,
                nom_cadena:       cpfrStore.nom_cadena,
                criterio_global:  cpfrStore.criterio_global,
                filters:          { ...cpfrStore.filters },
            }

            const res: CpfrDashZ8Response = await cpfrApi.loadZ8Dashboard(body)

            dias.value    = res.dias
            context.value = res.context
            loaded.value  = true
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? 'Error al cargar el dashboard Z8.'
        } finally {
            loading.value = false
        }
    }

    function toggleOC(num_pedido: string) {
        if (expandedOCs.value.has(num_pedido)) {
            expandedOCs.value.delete(num_pedido)
        } else {
            expandedOCs.value.add(num_pedido)
        }
    }

    function expandAllOCs() {
        for (const dia of dias.value) {
            for (const tienda of dia.tiendas) {
                for (const oc of tienda.ocs_z8) {
                    expandedOCs.value.add(oc.num_pedido)
                }
            }
        }
    }

    function collapseAllOCs() {
        expandedOCs.value.clear()
    }

    function reset() {
        dias.value    = []
        context.value = null
        loaded.value  = false
        error.value   = null
        expandedOCs.value.clear()
    }

    // ── Return ────────────────────────────────────────────────────────────────

    return {
        dias, context, loading, error, loaded,
        expandedOCs, totalSkusZ8, totalTiendas, hasData,
        loadZ8, toggleOC, expandAllOCs, collapseAllOCs, reset,
    }
})
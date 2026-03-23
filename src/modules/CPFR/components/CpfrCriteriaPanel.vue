<script setup lang="ts">
// src/modules/CPFR/components/CpfrCriteriaPanel.vue
// Panel de criterio global: slider + input numérico
// Al cambiar → store.recalculate() (no persiste, preview mode)
import { useCpfrStore } from '../stores/cpfrStore'

const store = useCpfrStore()

function onCriterioChange(val: number) {
    store.criterio_global = val
    store.recalculate()
}
</script>

<template>
  <div class="flex flex-col gap-3 p-1">

    <div>
      <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Criterio Global</p>
      <p class="text-[11px] text-slate-400 leading-snug">
        Semanas de inventario objetivo. Modifica los pedidos sugeridos de todas las tiendas.
      </p>
    </div>

    <!-- Valor actual -->
    <div class="flex items-center gap-2">
      <span class="text-2xl font-extrabold text-brand-600">{{ store.criterio_global.toFixed(1) }}</span>
      <span class="text-xs text-slate-400 font-medium">semanas</span>
    </div>

    <!-- Slider -->
    <input
      type="range"
      min="0.5" max="6.0" step="0.5"
      class="w-full accent-brand-600 cursor-pointer"
      :value="store.criterio_global"
      @input="onCriterioChange(Number(($event.target as HTMLInputElement).value))"
    />
    <div class="flex justify-between text-[9px] text-slate-300 font-bold">
      <span>0.5</span>
      <span>3.0</span>
      <span>6.0</span>
    </div>

    <!-- Botones rápidos -->
    <div class="flex flex-wrap gap-1 mt-1">
      <button
        v-for="v in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]"
        :key="v"
        class="text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors"
        :class="store.criterio_global === v
          ? 'bg-brand-600 border-brand-600 text-white'
          : 'border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'"
        @click="onCriterioChange(v)"
      >{{ v.toFixed(1) }}</button>
    </div>

    <!-- Banner preview -->
    <div
      v-if="store.preview"
      class="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
    >
      <i class="fa-solid fa-circle-exclamation text-amber-400 text-sm"></i>
      <p class="text-[11px] text-amber-600 font-medium leading-snug">
        Vista previa — los valores no han sido guardados. Ajusta los filtros para persistir.
      </p>
    </div>

  </div>
</template>
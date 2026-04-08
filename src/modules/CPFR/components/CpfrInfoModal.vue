<script setup lang="ts">
// src/modules/CPFR/components/CpfrInfoModal.vue
const emit = defineEmits(['close'])

function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
        emit('close')
    }
}
</script>

<template>
  <div 
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
    @click="handleBackdropClick"
  >
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
      
      <!-- Header -->
      <header class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <i class="fa-solid fa-circle-question text-xl"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800">Guía del Algoritmo CPFR</h2>
            <p class="text-xs text-slate-400 font-medium">Conceptos, reglas y simbología visual</p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        
        <!-- Conceptos Base -->
        <section class="mb-8">
            <h3 class="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                <i class="fa-solid fa-gears text-brand-500"></i>
                1. Algoritmo de Pedido Sugerido
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                    <p class="text-[10px] font-bold text-brand-600 uppercase mb-1">Múltiplo de Empaque</p>
                    <p class="text-[12px] text-slate-600 leading-relaxed italic">Todo pedido se redondea siempre a múltiplos de la <b>bolsa</b> del SKU.</p>
                </div>
                <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                    <p class="text-[10px] font-bold text-brand-600 uppercase mb-1">Criterio de Semanas</p>
                    <p class="text-[12px] text-slate-600 leading-relaxed italic">El objetivo de cobertura por defecto es de <b>2.5 semanas</b> (ajustable).</p>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Escenario A -->
                <div class="flex gap-4 p-4 rounded-xl bg-emerald-50/30 border border-emerald-100">
                    <div class="w-8 h-8 rounded-lg bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-600 font-bold">A</div>
                    <div>
                        <h4 class="text-[13px] font-bold text-emerald-800 mb-1">Escenario A: Cobertura Saludable (2-3 sem)</h4>
                        <p class="text-[12px] text-emerald-700/80 leading-relaxed">
                            Prioriza la demanda real de la tienda (pedido cadena). Se aplica redondeo aritmético pero con <b>piso de 1 bolsa</b>: si la cadena solicita producto, nunca sugeriremos 0.
                        </p>
                    </div>
                </div>

                <!-- Escenario B -->
                <div class="flex gap-4 p-4 rounded-xl bg-amber-50/30 border border-amber-100">
                    <div class="w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0 flex items-center justify-center text-amber-600 font-bold">B</div>
                    <div>
                        <h4 class="text-[13px] font-bold text-amber-800 mb-1">Escenario B: Ajuste de Inventario</h4>
                        <p class="text-[12px] text-amber-700/80 leading-relaxed">
                             Calcula matemáticamente el resurtido. Aplica <b>Anti-Timidez (CEIL)</b>: preferimos exceder ligeramente el objetivo que quedarnos cortos por efecto del redondeo.
                        </p>
                    </div>
                </div>

                <!-- Guardia Anti-Desabasto -->
                <div class="flex gap-4 p-4 rounded-xl bg-rose-50 border border-rose-100 shadow-sm relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-1 bg-rose-500 text-white text-[8px] font-black italic uppercase px-2 rounded-bl-lg">Seguridad</div>
                    <div class="w-8 h-8 rounded-lg bg-rose-100 flex-shrink-0 flex items-center justify-center text-rose-600">
                         <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <div>
                        <h4 class="text-[13px] font-bold text-rose-800 mb-1">Guardia Anti-Desabasto</h4>
                        <p class="text-[12px] text-rose-700/90 leading-relaxed font-medium">
                            Si el cálculo inicial no alcanza el criterio o deja un Fill Rate en 0% habiendo demanda, el algoritmo sube bolsas iterativamente hasta garantizar la cobertura mínima. <b>No permitimos el desabasto calculado.</b>
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <hr class="border-slate-100 mb-8" />

        <!-- Guía Visual -->
        <section>
            <h3 class="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                <i class="fa-solid fa-eye text-brand-500"></i>
                2. Guía Visual e Indicadores
            </h3>

            <div class="space-y-6">
                <!-- Fondos -->
                <div>
                    <h4 class="text-[12px] font-bold text-slate-500 mb-3 ml-1 uppercase tracking-tight">Semáforo de Filas</h4>
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                             <div class="flex items-center gap-3">
                                 <i class="fa-solid fa-seedling text-amber-400"></i>
                                 <span class="text-[12px] font-semibold text-amber-800">Producto sin histórico (Amarillo)</span>
                             </div>
                             <span class="text-[11px] text-amber-600/80 italic">Se usa pedido cadena</span>
                        </div>
                        <div class="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100">
                             <div class="flex items-center gap-3">
                                 <i class="fa-solid fa-ban text-orange-400"></i>
                                 <span class="text-[12px] font-semibold text-orange-800">Riesgo de Desabasto (Naranja)</span>
                             </div>
                             <span class="text-[11px] text-orange-600/80 italic">Fill Rate 0%</span>
                        </div>
                        <div class="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                             <div class="flex items-center gap-3">
                                 <i class="fa-solid fa-check-double text-emerald-400"></i>
                                 <span class="text-[12px] font-semibold text-emerald-800">Abastecimiento Óptimo (Verde)</span>
                             </div>
                             <span class="text-[11px] text-emerald-600/80 italic">FR entre 1 y 100%</span>
                        </div>
                        <div class="flex items-center justify-between p-3 rounded-lg bg-sky-50 border border-sky-100">
                             <div class="flex items-center gap-3">
                                 <i class="fa-solid fa-arrow-up text-sky-400"></i>
                                 <span class="text-[12px] font-semibold text-sky-800">Inyección Extra de Stock (Azul)</span>
                             </div>
                             <span class="text-[11px] text-sky-600/80 italic">Sobre-pedido (FR > 100%)</span>
                        </div>
                    </div>
                </div>

                <!-- Iconografía -->
                <div>
                    <h4 class="text-[12px] font-bold text-slate-500 mb-3 ml-1 uppercase tracking-tight">Alertas de Columna</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="p-3 border border-slate-100 rounded-lg flex items-start gap-3">
                            <i class="fa-solid fa-triangle-exclamation text-rose-500 text-xs mt-0.5"></i>
                            <div>
                                <p class="text-[11px] font-bold text-slate-700">Stock Crítico</p>
                                <p class="text-[10px] text-slate-400 leading-tight">Cobertura proyectada por debajo del objetivo.</p>
                            </div>
                        </div>
                        <div class="p-3 border border-slate-100 rounded-lg flex items-start gap-3">
                            <i class="fa-solid fa-arrow-trend-up text-orange-400 text-xs mt-0.5"></i>
                            <div>
                                <p class="text-[11px] font-bold text-slate-700">Sobre-inventario</p>
                                <p class="text-[10px] text-slate-400 leading-tight">Exceso de stock que supera el umbral de frescura.</p>
                            </div>
                        </div>
                        <div class="p-3 border border-slate-100 rounded-lg flex items-start gap-3">
                            <i class="fa-solid fa-ban text-rose-400 text-xs mt-0.5"></i>
                            <div>
                                <p class="text-[11px] font-bold text-slate-700">Sin Surtido</p>
                                <p class="text-[10px] text-slate-400 leading-tight">La cadena pide producto pero el sugerido es 0.</p>
                            </div>
                        </div>
                        <div class="p-3 border border-slate-100 rounded-lg flex items-start gap-3">
                            <i class="fa-solid fa-arrow-up text-sky-400 text-xs mt-0.5"></i>
                            <div>
                                <p class="text-[11px] font-bold text-slate-700">Inyección de Stock</p>
                                <p class="text-[10px] text-slate-400 leading-tight">El cálculo sugiere más de lo pedido para cubrir el criterio.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

      </div>

      <!-- Footer -->
      <footer class="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p class="text-[11px] text-slate-400 flex items-center gap-2">
              <i class="fa-solid fa-circle-info border border-slate-200 rounded-full w-4 h-4 flex items-center justify-center"></i>
              Tip: Pasa el ratón sobre cualquier icono de la tabla para ver más detalles.
          </p>
          <button 
            @click="$emit('close')"
            class="px-5 py-2 rounded-xl bg-slate-800 text-white text-[12px] font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
          >
            Entendido
          </button>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
}

@keyframes zoom-in {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
.animate-in {
    animation: zoom-in 0.2s ease-out forwards;
}
</style>

<script setup lang="ts">
import UiEChartPreview from './UiEChartPreview.vue';
import { chartQualityChecklist } from '../utils/uiStandardsCatalog';

const examples = [
  { type: 'line' as const, title: 'Tendencia temporal', purpose: 'Cambios, ritmo y comparación a través del tiempo.' },
  { type: 'bar' as const, title: 'Comparación por categoría', purpose: 'Magnitudes entre grupos discretos.' },
  { type: 'donut' as const, title: 'Participación', purpose: 'Composición con pocas categorías diferenciables.' },
  { type: 'heatmap' as const, title: 'Intensidad cruzada', purpose: 'Patrones entre dos dimensiones ordenadas.' },
];
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-pic-border bg-pic-nav p-5 text-pic-nav-text shadow-sm">
      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-nav-text-muted">Libertad analítica</p>
      <h2 class="mt-1 text-xl font-extrabold">La pregunta decide la gráfica</h2>
      <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-pic-nav-text-muted">
        Elige el tipo de gráfica según la comparación, el volumen de datos y la interacción requerida.
        Conserva unidades, leyendas y tooltips claros en cualquier composición.
      </p>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article v-for="example in examples" :key="example.type" class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm">
        <div class="mb-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">{{ example.title }}</p>
          <p class="mt-1 text-xs font-medium leading-5 text-pic-text-muted">{{ example.purpose }}</p>
        </div>
        <UiEChartPreview :type="example.type" :title="example.title" />
      </article>
    </section>

    <section class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <h2 class="text-lg font-extrabold text-pic-text-main">Mínimos de calidad</h2>
      <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div v-for="item in chartQualityChecklist" :key="item" class="flex items-start gap-2.5 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
          <i class="fa-solid fa-check mt-0.5 text-[10px] text-pic-success"></i>
          <p class="text-xs font-medium leading-5 text-pic-text-muted">{{ item }}</p>
        </div>
      </div>
      <div class="mt-4 rounded-xl border border-pic-brand-border bg-pic-brand-soft p-4">
        <p class="text-xs font-extrabold text-pic-text-main">Antes de elegir una visualización</p>
        <p class="mt-1 text-xs font-medium leading-5 text-pic-text-muted">
          Confirma qué pregunta debe responder, qué unidad compara y qué detalle necesita la persona al interactuar.
        </p>
      </div>
    </section>
  </div>
</template>

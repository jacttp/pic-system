<script setup lang="ts">
const levels = [
  {
    number: 1,
    title: 'Principios visuales',
    description: 'Jerarquía, densidad, responsive, accesibilidad y uso de los tokens existentes.',
    icon: 'fa-solid fa-compass-drafting',
  },
  {
    number: 2,
    title: 'Componentes compartidos',
    description: 'APIs estables que se reutilizan sin copiar markup ni lógica visual.',
    icon: 'fa-solid fa-cubes',
  },
  {
    number: 3,
    title: 'Patrones de vista',
    description: 'Composiciones que orientan la lectura sin imponer una pantalla rígida.',
    icon: 'fa-solid fa-diagram-project',
  },
  {
    number: 4,
    title: 'Ejemplos aplicados',
    description: 'Muestras completas para reconocer jerarquía, densidad, interacción y estados.',
    icon: 'fa-solid fa-code-branch',
  },
];

const reportFiles = [
  {
    title: 'PicDashboardView.vue',
    path: 'src/modules/PIC/views/PicDashboardView.vue',
    role: 'Consulta la composición general, los estados de resultado y la ubicación de las acciones.',
  },
  {
    title: 'PicFilters.vue',
    path: 'src/modules/PIC/components/PicFilters.vue',
    role: 'Consulta el panel colapsable, los grupos, las cascadas y las acciones de filtros.',
  },
  {
    title: 'PicGrid.vue',
    path: 'src/modules/PIC/components/PicGrid.vue',
    role: 'Consulta cómo conviven KPIs, gráficas, tablas y desgloses dentro del resultado.',
  },
];
</script>

<template>
  <div class="space-y-5">
    <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-nav text-pic-nav-text shadow-sm">
      <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-pic-nav-text-muted">Criterio de diseño</p>
          <h2 class="mt-2 max-w-3xl text-2xl font-extrabold tracking-tight sm:text-3xl">
            Diseñar con criterio compartido, sin neutralizar cada módulo.
          </h2>
          <p class="mt-3 max-w-3xl text-sm font-medium leading-6 text-pic-nav-text-muted">
            Empieza por la jerarquía de información, elige componentes adecuados y resuelve todos los estados.
            La consistencia debe facilitar el trabajo sin volver idénticas todas las pantallas.
          </p>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-nav-text-muted">Antes de diseñar</p>
          <p class="mt-2 text-lg font-extrabold">Ordena la experiencia</p>
          <p class="mt-1 text-xs font-medium leading-5 text-pic-nav-text-muted">
            Define qué necesita ver primero la persona, qué acciones espera encontrar y cómo responderá la vista ante carga, vacío y error.
          </p>
        </div>
      </div>
      <div class="h-1 bg-pic-brand"></div>
    </section>

    <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="level in levels"
        :key="level.number"
        class="group rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm transition hover:border-pic-brand-border hover:bg-pic-brand-soft"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft px-2 text-xs font-extrabold text-pic-brand transition group-hover:bg-pic-brand group-hover:text-white">
            {{ level.number }}
          </span>
          <i :class="level.icon" class="text-sm text-pic-text-muted transition group-hover:text-pic-brand"></i>
        </div>
        <h3 class="mt-4 text-sm font-extrabold text-pic-text-main">{{ level.title }}</h3>
        <p class="mt-1 text-xs font-medium leading-5 text-pic-text-muted">{{ level.description }}</p>
      </article>
    </section>

    <section class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <div class="flex flex-col gap-3 border-b border-pic-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Archivos relacionados</p>
          <h2 class="mt-1 text-lg font-extrabold text-pic-text-main">Qué consultar al construir un reporte</h2>
        </div>
        <span class="inline-flex w-fit items-center gap-2 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2 text-[11px] font-bold text-pic-text-muted">
          <i class="fa-solid fa-route text-pic-brand"></i>
          Ejemplos completos
        </span>
      </div>
      <div class="mt-4 divide-y divide-pic-border">
        <article v-for="source in reportFiles" :key="source.path" class="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p class="text-xs font-extrabold text-pic-text-main">{{ source.title }}</p>
            <p class="mt-0.5 break-all font-mono text-[10px] text-pic-text-muted">{{ source.path }}</p>
          </div>
          <p class="text-xs font-medium leading-5 text-pic-text-muted">{{ source.role }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

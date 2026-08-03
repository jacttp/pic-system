<script setup lang="ts">
const policies = [
  {
    title: 'Shared-first, no shared-only',
    description: 'Se reutiliza lo que encaja. La especificidad real permanece dentro del módulo y se justifica.',
    icon: 'fa-solid fa-share-nodes',
  },
  {
    title: 'Sin imports entre módulos',
    description: 'Un módulo de negocio no consume componentes internos de otro. Se extrae una API neutral o se mantiene local.',
    icon: 'fa-solid fa-shield-halved',
  },
  {
    title: 'Catálogo en el mismo cambio',
    description: 'Todo componente compartido nuevo se documenta, demuestra y clasifica al crearlo.',
    icon: 'fa-solid fa-book-open',
  },
  {
    title: 'Contratos globales congelados',
    description: 'Un rediseño no altera endpoints, tokens, Tailwind, persistencia ni la familia tipográfica del producto.',
    icon: 'fa-solid fa-lock',
  },
];

const migrationSteps = [
  'Auditar comportamiento, endpoints, store, componentes y breakpoints.',
  'Definir qué se conserva y qué entra al refactor.',
  'Implementar solamente el módulo autorizado.',
  'Validar estados, cascadas, permisos y responsive.',
  'Registrar componentes o excepciones descubiertas.',
  'Cerrar el módulo antes de iniciar otro.',
];

const briefFields = [
  'Tipo de vista y secciones del catálogo consultadas.',
  'Información primaria, secundaria y técnica.',
  'Componentes compartidos reutilizados.',
  'Componentes nuevos y componentes específicos justificados.',
  'Grupos, cascadas, dependencias y estados.',
  'Breakpoints: 1366×768, desktop, tablet y mobile.',
  'Endpoints existentes y tokens utilizados.',
  'Jerarquía tipográfica y usos técnicos de font-mono.',
  'Cambios explícitamente fuera de alcance.',
];
</script>

<template>
  <div class="space-y-5">
    <section class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <article v-for="policy in policies" :key="policy.title" class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
          <i :class="policy.icon"></i>
        </span>
        <h3 class="mt-3 text-sm font-extrabold text-pic-text-main">{{ policy.title }}</h3>
        <p class="mt-1 text-xs font-medium leading-5 text-pic-text-muted">{{ policy.description }}</p>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Migración controlada</p>
        <h2 class="mt-1 text-lg font-extrabold text-pic-text-main">Un módulo por vez</h2>
        <ol class="mt-4 space-y-2">
          <li v-for="(step, index) in migrationSteps" :key="step" class="flex items-start gap-3">
            <span class="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-pic-brand px-2 text-[10px] font-extrabold text-white">{{ index + 1 }}</span>
            <span class="pt-1 text-xs font-medium leading-5 text-pic-text-muted">{{ step }}</span>
          </li>
        </ol>
      </article>

      <article class="rounded-xl border border-pic-border bg-pic-nav p-4 text-pic-nav-text shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-nav-text-muted">Brief obligatorio</p>
        <h2 class="mt-1 text-lg font-extrabold">Antes de escribir UI</h2>
        <ul class="mt-4 space-y-2">
          <li v-for="field in briefFields" :key="field" class="flex items-start gap-2.5 text-xs font-medium leading-5 text-pic-nav-text-muted">
            <i class="fa-solid fa-check mt-1 text-[10px] text-pic-brand"></i>
            <span>{{ field }}</span>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

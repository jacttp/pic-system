<script setup lang="ts">
import { computed, ref } from 'vue';
import { uiCatalogEntries, viewPatterns } from '../utils/uiStandardsCatalog';

const selectedPatternId = ref(viewPatterns[0]?.id || '');
const selectedPattern = computed(() => viewPatterns.find(pattern => pattern.id === selectedPatternId.value) || viewPatterns[0]);
const recommendedEntries = computed(() => (
  selectedPattern.value?.recommendedEntries
    .map(id => uiCatalogEntries.find(entry => entry.id === id))
    .filter(Boolean) || []
));
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="space-y-2">
      <button
        v-for="pattern in viewPatterns"
        :key="pattern.id"
        type="button"
        class="group w-full rounded-xl border p-3 text-left transition"
        :class="selectedPatternId === pattern.id
          ? 'border-pic-brand-border bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))]'
          : 'border-pic-border bg-pic-surface hover:border-pic-brand-border hover:bg-pic-muted-surface'"
        @click="selectedPatternId = pattern.id"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted transition group-hover:text-pic-brand">
            <i :class="pattern.icon"></i>
          </span>
          <span>
            <span class="block text-xs font-extrabold text-pic-text-main">{{ pattern.name }}</span>
            <span class="mt-1 block text-[11px] font-medium leading-4 text-pic-text-muted">{{ pattern.description }}</span>
          </span>
        </div>
      </button>
    </aside>

    <section v-if="selectedPattern" class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Patrón de vista</p>
      <h2 class="mt-1 text-xl font-extrabold tracking-tight text-pic-text-main">{{ selectedPattern.name }}</h2>
      <p class="mt-2 text-sm font-medium leading-6 text-pic-text-muted">{{ selectedPattern.description }}</p>

      <div class="mt-5 rounded-xl border border-pic-brand-border bg-pic-brand-soft p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">Información primaria</p>
        <p class="mt-1 text-sm font-extrabold text-pic-text-main">{{ selectedPattern.primaryInformation }}</p>
      </div>

      <div class="mt-5">
        <h3 class="text-xs font-extrabold uppercase tracking-[0.12em] text-pic-text-muted">Recorrido de lectura</h3>
        <ol class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <li v-for="(section, index) in selectedPattern.sections" :key="section" class="flex items-center gap-3 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2.5">
            <span class="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-pic-brand px-2 text-[10px] font-extrabold text-white">
              {{ index + 1 }}
            </span>
            <span class="text-xs font-bold text-pic-text-main">{{ section }}</span>
          </li>
        </ol>
      </div>

      <div class="mt-5">
        <h3 class="text-xs font-extrabold uppercase tracking-[0.12em] text-pic-text-muted">Consulta recomendada</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <span v-for="entry in recommendedEntries" :key="entry!.id" class="rounded-lg border border-pic-border bg-pic-surface px-2.5 py-1.5 font-mono text-[10px] font-bold text-pic-text-muted">
            {{ entry!.name }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

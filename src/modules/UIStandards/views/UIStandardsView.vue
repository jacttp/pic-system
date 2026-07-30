<script setup lang="ts">
import { computed, ref } from 'vue';
import { StdPageHeader } from '@/modules/Shared/components/std';
import UiChartsCatalog from '../components/UiChartsCatalog.vue';
import UiComponentsCatalog from '../components/UiComponentsCatalog.vue';
import UiPatternsCatalog from '../components/UiPatternsCatalog.vue';
import UiPoliciesPanel from '../components/UiPoliciesPanel.vue';
import UiReportCatalog from '../components/UiReportCatalog.vue';
import UiStandardsHome from '../components/UiStandardsHome.vue';
import UiTablesCatalog from '../components/UiTablesCatalog.vue';
import UiThemeManager from '../components/UiThemeManager.vue';

type SectionId = 'home' | 'components' | 'reports' | 'patterns' | 'charts' | 'tables' | 'theme' | 'policies';

interface CatalogSection {
  id: SectionId;
  label: string;
  description: string;
  icon: string;
  component: object;
}

const sections: CatalogSection[] = [
  {
    id: 'home',
    label: 'Inicio',
    description: 'Principios y recorrido',
    icon: 'fa-solid fa-compass',
    component: UiStandardsHome,
  },
  {
    id: 'components',
    label: 'Componentes',
    description: 'Catálogo, API y demos',
    icon: 'fa-solid fa-cubes',
    component: UiComponentsCatalog,
  },
  {
    id: 'reports',
    label: 'Reportes',
    description: 'Anatomía y filtros PIC',
    icon: 'fa-solid fa-chart-column',
    component: UiReportCatalog,
  },
  {
    id: 'patterns',
    label: 'Patrones',
    description: 'Composiciones de vista',
    icon: 'fa-solid fa-diagram-project',
    component: UiPatternsCatalog,
  },
  {
    id: 'charts',
    label: 'Gráficas',
    description: 'Criterios, no plantillas',
    icon: 'fa-solid fa-chart-line',
    component: UiChartsCatalog,
  },
  {
    id: 'tables',
    label: 'Tablas',
    description: 'Densidad y estados',
    icon: 'fa-solid fa-table',
    component: UiTablesCatalog,
  },
  {
    id: 'theme',
    label: 'Tokens y tema',
    description: 'Paletas y usos semánticos',
    icon: 'fa-solid fa-palette',
    component: UiThemeManager,
  },
  {
    id: 'policies',
    label: 'Políticas',
    description: 'Promoción y migración',
    icon: 'fa-solid fa-scale-balanced',
    component: UiPoliciesPanel,
  },
];

const activeSectionId = ref<SectionId>('home');
const activeSection = computed(() => (
  sections.find((section) => section.id === activeSectionId.value) || sections[0]!
));
</script>

<template>
  <main class="min-h-full bg-pic-background px-3 py-4 sm:px-5 lg:px-7">
    <div class="mx-auto max-w-[1580px] space-y-4">
      <StdPageHeader
        eyebrow="Sistema / UI Standards"
        title="Sistema de diseño PIC"
        description="Catálogo práctico de componentes, patrones y criterios para construir interfaces claras, consistentes y fáciles de usar."
        icon="fa-solid fa-swatchbook"
        meta="Guía de interfaz"
      />

      <nav
        class="sticky top-0 z-20 -mx-3 overflow-x-auto border-y border-pic-border bg-pic-background/95 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:hidden"
        aria-label="Secciones de UI Standards"
      >
        <div class="flex min-w-max gap-2">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black transition-colors"
            :class="activeSectionId === section.id
              ? 'border-pic-brand bg-pic-brand text-white'
              : 'border-pic-border bg-pic-surface text-pic-text-muted hover:border-pic-brand-border hover:text-pic-brand'"
            @click="activeSectionId = section.id"
          >
            <i :class="section.icon"></i>
            {{ section.label }}
          </button>
        </div>
      </nav>

      <div class="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside class="sticky top-4 hidden rounded-xl border border-pic-border bg-pic-surface p-2 shadow-sm lg:block">
          <p class="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-pic-text-muted">
            Catálogo
          </p>
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="group mb-1 grid w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-2.5 text-left transition-colors last:mb-0"
            :class="activeSectionId === section.id
              ? 'bg-pic-brand text-white'
              : 'text-pic-text-main hover:bg-pic-brand-soft hover:text-pic-brand'"
            @click="activeSectionId = section.id"
          >
            <span
              class="grid h-8 w-8 place-items-center rounded-lg"
              :class="activeSectionId === section.id ? 'bg-white/15' : 'bg-pic-muted-surface group-hover:bg-pic-surface'"
            >
              <i :class="section.icon"></i>
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-black">{{ section.label }}</span>
              <span
                class="block truncate text-[11px]"
                :class="activeSectionId === section.id ? 'text-white/75' : 'text-pic-text-muted'"
              >
                {{ section.description }}
              </span>
            </span>
          </button>
        </aside>

        <section class="min-w-0" :aria-labelledby="`ui-section-${activeSection.id}`">
          <div class="mb-3 flex items-center gap-3 lg:hidden">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-pic-brand text-white">
              <i :class="activeSection.icon"></i>
            </span>
            <div>
              <h2 :id="`ui-section-${activeSection.id}`" class="text-base font-black text-pic-text-main">
                {{ activeSection.label }}
              </h2>
              <p class="text-xs text-pic-text-muted">{{ activeSection.description }}</p>
            </div>
          </div>
          <component :is="activeSection.component" />
        </section>
      </div>
    </div>
  </main>
</template>

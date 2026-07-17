<script setup lang="ts">
import { computed } from 'vue';
import type { ClassificationAuditEntry } from '../types/articleClassificationTypes';

interface Props {
  entries: ClassificationAuditEntry[];
}

const props = defineProps<Props>();

const decoratedEntries = computed(() => props.entries.map(entry => {
  const after = entry.After as { reason?: string } | null;
  const meta = {
    APPROVED: {
      label: 'Clasificado', icon: 'fa-solid fa-check',
      classes: 'bg-[hsl(var(--pic-success)/0.08)] text-pic-success border-[hsl(var(--pic-success)/0.28)]',
      description: 'Registro creado en ArticulosIC',
    },
    SKIPPED: {
      label: 'Pospuesto', icon: 'fa-solid fa-forward',
      classes: 'bg-[hsl(var(--pic-warning)/0.08)] text-pic-warning border-[hsl(var(--pic-warning)/0.28)]',
      description: after?.reason || 'Sin motivo registrado',
    },
    REOPENED: {
      label: 'Reabierto', icon: 'fa-solid fa-rotate-left',
      classes: 'bg-[hsl(var(--pic-info)/0.08)] text-pic-info border-[hsl(var(--pic-info)/0.28)]',
      description: 'Volvio a faltar en ArticulosIC y sigue presente en VentasIC',
    },
    RESOLVED_EXTERNALLY: {
      label: 'Resuelto externamente', icon: 'fa-solid fa-arrow-up-right-from-square',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'El concepto aparecio en ArticulosIC por otra via',
    },
  }[entry.Action];
  return {
    ...entry,
    label: meta.label,
    icon: meta.icon,
    iconClasses: meta.classes,
    description: meta.description,
    formattedDate: new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(entry.CreatedAt)),
  };
}));
</script>

<template>
  <aside class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <header class="border-b border-slate-200 px-4 py-4">
      <p class="text-[9px] font-black uppercase tracking-[0.22em] text-pic-brand">Trazabilidad</p>
      <h2 class="mt-1 text-sm font-black text-slate-900">Historial del concepto</h2>
    </header>
    <div v-if="decoratedEntries.length" class="divide-y divide-slate-100">
      <article v-for="entry in decoratedEntries" :key="entry.AuditId" class="grid grid-cols-[34px_minmax(0,1fr)] gap-3 px-4 py-4">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg border text-xs" :class="entry.iconClasses">
          <i :class="entry.icon"></i>
        </span>
        <div class="min-w-0">
          <div class="flex items-start justify-between gap-2">
            <p class="text-xs font-black text-slate-800">{{ entry.label }}</p>
            <span class="font-mono text-[9px] font-bold text-slate-400">#{{ entry.AuditId }}</span>
          </div>
          <p class="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{{ entry.description }}</p>
          <p class="mt-2 truncate text-[10px] font-black text-slate-600">{{ entry.ActorUsername }}</p>
          <p class="text-[9px] font-semibold text-slate-400">{{ entry.formattedDate }}</p>
        </div>
      </article>
    </div>
    <div v-else class="px-5 py-8 text-center">
      <i class="fa-solid fa-timeline text-xl text-slate-300"></i>
      <p class="mt-2 text-xs font-black text-slate-600">Sin movimientos previos</p>
      <p class="mt-1 text-[10px] font-semibold leading-4 text-slate-400">La primera decision quedara registrada aqui.</p>
    </div>
  </aside>
</template>

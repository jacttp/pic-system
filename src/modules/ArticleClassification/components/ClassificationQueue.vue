<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type {
  ClassificationQueueItem,
  QueueStatusFilter,
} from '../types/articleClassificationTypes';

interface Props {
  items: ClassificationQueueItem[];
  loading?: boolean;
  selectedId?: number | null;
  currentUserId?: number | null;
  search: string;
  status: QueueStatusFilter;
  page: number;
  totalPages: number;
  total: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedId: null,
  currentUserId: null,
  disabled: false,
});

const emit = defineEmits<{
  (event: 'select', conceptId: number): void;
  (event: 'search', value: string): void;
  (event: 'status', value: QueueStatusFilter): void;
  (event: 'page', value: number): void;
}>();

const localSearch = ref(props.search);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.search, value => { localSearch.value = value; });
watch(localSearch, value => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => emit('search', value.trim()), 350);
});
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer); });

const decoratedItems = computed(() => props.items.map(item => {
  const isMine = item.WorkflowStatus === 'IN_REVIEW' && item.ClaimedByUserId === props.currentUserId;
  const statusMeta = {
    PENDING: { label: 'Pendiente', classes: 'bg-[hsl(var(--pic-warning)/0.08)] text-pic-warning border-[hsl(var(--pic-warning)/0.28)]', icon: 'fa-regular fa-clock' },
    IN_REVIEW: isMine
      ? { label: 'En tus manos', classes: 'bg-pic-brand-soft text-pic-brand border-pic-brand-border', icon: 'fa-solid fa-hand' }
      : { label: 'En revision', classes: 'bg-[hsl(var(--pic-info)/0.08)] text-pic-info border-[hsl(var(--pic-info)/0.28)]', icon: 'fa-solid fa-user-lock' },
    SKIPPED: { label: 'Pospuesto', classes: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'fa-solid fa-forward' },
    APPROVED: { label: 'Aprobado', classes: 'bg-[hsl(var(--pic-success)/0.08)] text-pic-success border-[hsl(var(--pic-success)/0.28)]', icon: 'fa-solid fa-check' },
  }[item.WorkflowStatus];

  return { ...item, statusMeta, isMine };
}));

const statusOptions: Array<{ value: QueueStatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos los pendientes' },
  { value: 'PENDING', label: 'Sin tomar' },
  { value: 'IN_REVIEW', label: 'En revision' },
  { value: 'SKIPPED', label: 'Pospuestos' },
];

const skeletons = computed(() => Array.from({ length: 6 }, (_, index) => index));
</script>

<template>
  <aside class="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-235px)] lg:min-h-[560px]">
    <div class="border-b border-slate-200 bg-slate-900 px-4 py-4 text-white">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Bandeja operativa</p>
          <h2 class="mt-1 text-sm font-black">Conceptos por resolver</h2>
        </div>
        <span class="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-black tabular-nums">
          {{ total }}
        </span>
      </div>
      <div class="relative mt-3">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
        <input
          v-model="localSearch"
          type="search"
          placeholder="Buscar en SKUMuliix..."
          class="h-9 w-full rounded-lg border border-white/10 bg-white/10 pl-9 pr-3 text-xs font-semibold text-white outline-none placeholder:text-slate-400 focus:border-pic-brand focus:bg-white/15 focus:ring-2 focus:ring-pic-brand/20"
        >
      </div>
    </div>

    <div class="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
      <select
        :value="status"
        class="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 outline-none focus:border-pic-brand"
        @change="emit('status', ($event.target as HTMLSelectElement).value as QueueStatusFilter)"
      >
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>

    <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div v-if="loading" class="divide-y divide-slate-100">
        <div v-for="skeleton in skeletons" :key="skeleton" class="animate-pulse px-4 py-4">
          <div class="h-3 w-24 rounded bg-slate-100"></div>
          <div class="mt-3 h-4 w-full rounded bg-slate-100"></div>
          <div class="mt-2 h-4 w-4/5 rounded bg-slate-100"></div>
        </div>
      </div>

      <div v-else-if="decoratedItems.length === 0" class="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center">
        <span class="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
          <i class="fa-solid fa-inbox"></i>
        </span>
        <p class="mt-3 text-sm font-black text-slate-800">Bandeja despejada</p>
        <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">No hay conceptos para este filtro.</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <button
          v-for="item in decoratedItems"
          :key="item.ConceptId"
          type="button"
          class="group relative w-full px-4 py-3.5 text-left transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          :class="selectedId === item.ConceptId ? 'bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] hover:bg-pic-brand-soft' : ''"
          :disabled="disabled"
          @click="emit('select', item.ConceptId)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wide" :class="item.statusMeta.classes">
              <i :class="item.statusMeta.icon"></i>
              {{ item.statusMeta.label }}
            </span>
            <span class="font-mono text-[10px] font-bold text-slate-400">#{{ item.ConceptId }}</span>
          </div>
          <p class="mt-2 line-clamp-3 text-xs font-black leading-5 text-slate-800">{{ item.SKUMuliix }}</p>
          <p v-if="item.ClaimedByUsername && !item.isMine" class="mt-2 truncate text-[10px] font-bold text-pic-info">
            <i class="fa-solid fa-user-lock mr-1"></i>{{ item.ClaimedByUsername }}
          </p>
          <p v-else-if="item.SkipReason" class="mt-2 line-clamp-1 text-[10px] font-bold text-slate-500">
            <i class="fa-solid fa-forward mr-1"></i>{{ item.SkipReason }}
          </p>
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2.5">
      <button type="button" class="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 transition hover:border-pic-brand-border hover:text-pic-brand disabled:opacity-30" :disabled="page <= 1 || loading" @click="emit('page', page - 1)">
        <i class="fa-solid fa-chevron-left text-xs"></i>
      </button>
      <span class="text-[10px] font-black uppercase tracking-wide text-slate-500">Pagina {{ page }} de {{ totalPages }}</span>
      <button type="button" class="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 transition hover:border-pic-brand-border hover:text-pic-brand disabled:opacity-30" :disabled="page >= totalPages || loading" @click="emit('page', page + 1)">
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
</style>

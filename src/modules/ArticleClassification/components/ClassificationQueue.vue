<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
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
const queueScroller = ref<HTMLElement | null>(null);
const pendingScrollTop = ref<number | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.search, value => { localSearch.value = value; });
watch(localSearch, value => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => emit('search', value.trim()), 350);
});
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer); });

const handleSelect = (conceptId: number) => {
  pendingScrollTop.value = queueScroller.value?.scrollTop ?? null;
  emit('select', conceptId);
};

watch(() => props.selectedId, async (selectedId) => {
  if (!selectedId || pendingScrollTop.value === null) return;

  const scrollTop = pendingScrollTop.value;
  await nextTick();
  requestAnimationFrame(() => {
    if (queueScroller.value) queueScroller.value.scrollTop = scrollTop;
    pendingScrollTop.value = null;
  });
});

const decoratedItems = computed(() => props.items.map(item => {
  const isMine = item.WorkflowStatus === 'IN_REVIEW' && item.ClaimedByUserId === props.currentUserId;
  const statusMeta = {
    PENDING: {
      label: 'Pendiente',
      classes: 'border-[hsl(var(--pic-warning)/0.32)] bg-pic-surface text-pic-warning',
      icon: 'fa-regular fa-clock',
    },
    IN_REVIEW: isMine
      ? {
          label: 'En tus manos',
          classes: 'border-pic-brand-border bg-pic-surface text-pic-brand',
          icon: 'fa-solid fa-hand',
        }
      : {
          label: 'En revisión',
          classes: 'border-[hsl(var(--pic-info)/0.32)] bg-pic-surface text-pic-info',
          icon: 'fa-solid fa-user-lock',
        },
    SKIPPED: {
      label: 'Pospuesto',
      classes: 'border-pic-border bg-pic-surface text-pic-text-muted',
      icon: 'fa-solid fa-forward',
    },
    APPROVED: {
      label: 'Aprobado',
      classes: 'border-[hsl(var(--pic-success)/0.32)] bg-pic-surface text-pic-success',
      icon: 'fa-solid fa-check',
    },
  }[item.WorkflowStatus];

  return {
    ...item,
    statusMeta,
    isMine,
    isSelected: props.selectedId === item.ConceptId,
  };
}));

const statusOptions: Array<{ value: QueueStatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos los pendientes' },
  { value: 'PENDING', label: 'Sin tomar' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'SKIPPED', label: 'Pospuestos' },
];

const skeletons = computed(() => Array.from({ length: 6 }, (_, index) => index));
</script>

<template>
  <aside
    aria-label="Bandeja de conceptos por resolver"
    class="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm lg:h-[calc(100vh-235px)] lg:min-h-[560px]"
  >
    <header class="border-b border-pic-border bg-pic-muted-surface p-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[9px] font-semibold uppercase tracking-[0.12em] text-pic-brand">
            Bandeja operativa
          </p>
          <h2 class="mt-0.5 text-sm font-semibold tracking-tight text-pic-text-main">
            Conceptos por resolver
          </h2>
        </div>
        <span class="inline-flex min-w-8 items-center justify-center rounded-md bg-pic-brand px-2 py-1 text-[10px] font-semibold tabular-nums text-white">
          {{ total }}
        </span>
      </div>

      <label class="relative mt-3 block">
        <span class="sr-only">Buscar en SKUMuliix</span>
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-pic-text-muted" aria-hidden="true"></i>
        <input
          v-model="localSearch"
          type="search"
          placeholder="Buscar en SKUMuliix…"
          class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-xs font-medium text-pic-text-main outline-none transition placeholder:text-pic-text-muted hover:bg-pic-brand-soft focus:border-pic-brand focus:bg-pic-surface focus:ring-2 focus:ring-pic-brand-border"
        >
      </label>

      <label class="mt-2 block">
        <span class="sr-only">Filtrar por estado</span>
        <select
          :value="status"
          class="h-8 w-full rounded-lg border border-pic-border bg-pic-surface px-2.5 text-[11px] font-semibold text-pic-text-main outline-none transition hover:bg-pic-brand-soft focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
          @change="emit('status', ($event.target as HTMLSelectElement).value as QueueStatusFilter)"
        >
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </header>

    <div ref="queueScroller" class="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-pic-surface">
      <div v-if="loading" class="divide-y divide-pic-border" role="status" aria-live="polite">
        <span class="sr-only">Cargando conceptos</span>
        <div v-for="skeleton in skeletons" :key="skeleton" class="animate-pulse px-3 py-3.5">
          <div class="flex items-start gap-2.5">
            <div class="h-7 w-7 shrink-0 rounded-md bg-[hsl(var(--pic-text-muted)/0.12)]"></div>
            <div class="min-w-0 flex-1">
              <div class="h-3 w-full rounded bg-[hsl(var(--pic-text-muted)/0.12)]"></div>
              <div class="mt-2 h-3 w-4/5 rounded bg-[hsl(var(--pic-text-muted)/0.10)]"></div>
              <div class="mt-3 h-6 w-24 rounded-md bg-[hsl(var(--pic-text-muted)/0.10)]"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="decoratedItems.length === 0" class="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center" role="status">
        <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted">
          <i class="fa-solid fa-inbox" aria-hidden="true"></i>
        </span>
        <p class="mt-3 text-sm font-semibold text-pic-text-main">Bandeja despejada</p>
        <p class="mt-1 text-xs font-normal leading-5 text-pic-text-muted">No hay conceptos para este filtro.</p>
      </div>

      <div v-else class="divide-y divide-pic-border">
        <button
          v-for="item in decoratedItems"
          :key="item.ConceptId"
          type="button"
          class="group relative w-full p-3 text-left transition hover:bg-pic-brand-soft focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pic-brand-border disabled:cursor-wait disabled:opacity-70"
          :class="item.isSelected ? 'bg-pic-brand-soft shadow-[inset_3px_0_0_0_hsl(var(--pic-brand))] hover:bg-pic-brand-soft' : ''"
          :disabled="disabled"
          :aria-current="item.isSelected ? 'true' : undefined"
          @click="handleSelect(item.ConceptId)"
        >
          <div class="flex items-start gap-2.5">
            <span
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums transition-colors"
              :class="item.isSelected
                ? 'border-pic-brand bg-pic-brand text-white'
                : 'border-pic-brand-border bg-pic-surface text-pic-brand group-hover:border-pic-brand group-hover:bg-pic-brand group-hover:text-white'"
            >
              {{ item.ConceptId }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="line-clamp-3 text-xs font-semibold leading-[1.4] text-pic-text-main">
                {{ item.SKUMuliix }}
              </p>

              <div class="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-semibold"
                  :class="item.statusMeta.classes"
                >
                  <i :class="item.statusMeta.icon" aria-hidden="true"></i>
                  {{ item.statusMeta.label }}
                </span>
              </div>

              <p v-if="item.ClaimedByUsername && !item.isMine" class="mt-2 truncate text-[10px] font-normal text-pic-info">
                <i class="fa-solid fa-user-lock mr-1" aria-hidden="true"></i>{{ item.ClaimedByUsername }}
              </p>
              <p v-else-if="item.SkipReason" class="mt-2 line-clamp-2 text-[10px] font-normal leading-4 text-pic-text-muted">
                <i class="fa-solid fa-forward mr-1" aria-hidden="true"></i>{{ item.SkipReason }}
              </p>
            </div>

            <i
              class="fa-solid fa-chevron-right mt-1 text-[9px] text-pic-text-muted transition-colors group-hover:text-pic-brand"
              :class="item.isSelected ? 'text-pic-brand' : ''"
              aria-hidden="true"
            ></i>
          </div>
        </button>
      </div>
    </div>

    <footer class="flex items-center justify-between border-t border-pic-border bg-pic-muted-surface px-3 py-2.5">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-md border border-pic-border bg-pic-surface text-pic-text-muted transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="page <= 1 || loading"
        aria-label="Página anterior"
        @click="emit('page', page - 1)"
      >
        <i class="fa-solid fa-chevron-left text-[10px]" aria-hidden="true"></i>
      </button>

      <span class="text-[10px] font-medium text-pic-text-muted">
        Página <strong class="font-semibold text-pic-text-main">{{ page }}</strong> de {{ totalPages }}
      </span>

      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-md border border-pic-border bg-pic-surface text-pic-text-muted transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="page >= totalPages || loading"
        aria-label="Página siguiente"
        @click="emit('page', page + 1)"
      >
        <i class="fa-solid fa-chevron-right text-[10px]" aria-hidden="true"></i>
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-color: hsl(var(--pic-border)) hsl(var(--pic-surface));
  scrollbar-width: thin;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: hsl(var(--pic-surface));
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--pic-border));
  border-radius: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--pic-brand-border));
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

export interface StdTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

type StdTableAction = 'view' | 'edit';

interface Props {
  columns: StdTableColumn[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  selectable?: boolean;
  showActions?: boolean;
  actions?: StdTableAction[];
  selectedKeys?: Array<string | number>;
  rowKey?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyTitle?: string;
  emptyDescription?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectable: false,
  showActions: true,
  actions: () => ['view', 'edit'],
  rowKey: 'id',
  selectedKeys: () => [],
  emptyTitle: 'Sin resultados',
  emptyDescription: 'No hay registros para los filtros actuales.',
});

const emit = defineEmits<{
  (e: 'sort', key: string): void;
  (e: 'select-row', key: string | number): void;
  (e: 'row-action', action: 'view' | 'edit', row: Record<string, unknown>): void;
}>();

const selectedSet = computed(() => new Set(props.selectedKeys));

const tableColumns = computed(() => props.columns.map((column) => ({
  ...column,
  alignClass: {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  }[column.align || 'left'],
  sortIcon: props.sortKey === column.key
    ? props.sortDirection === 'desc' ? 'fa-solid fa-arrow-down-short-wide' : 'fa-solid fa-arrow-up-wide-short'
    : 'fa-solid fa-sort text-slate-300',
})));

const skeletonRows = computed(() => Array.from({ length: 4 }, (_, index) => index));

const getRowKey = (row: Record<string, unknown>) => String(row[props.rowKey] ?? '');
const getSelectableKey = (row: Record<string, unknown>) => row[props.rowKey] as string | number;

const handleSort = (column: StdTableColumn) => {
  if (!column.sortable) return;
  emit('sort', column.key);
};

const handleSelect = (row: Record<string, unknown>) => {
  emit('select-row', getSelectableKey(row));
};
</script>

<template>
  <div class="pic-report-table overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
    <div v-if="loading" class="divide-y divide-slate-100">
      <div v-for="row in skeletonRows" :key="row" class="grid grid-cols-4 gap-3 px-4 py-3">
        <span class="h-3 rounded bg-slate-100"></span>
        <span class="h-3 rounded bg-slate-100"></span>
        <span class="h-3 rounded bg-slate-100"></span>
        <span class="h-3 rounded bg-slate-100"></span>
      </div>
    </div>

    <div v-else-if="rows.length === 0" class="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        <i class="fa-regular fa-folder-open text-xl"></i>
      </span>
      <p class="mt-3 text-sm font-black text-slate-900">{{ emptyTitle }}</p>
      <p class="mt-1 text-xs font-semibold text-slate-500">{{ emptyDescription }}</p>
    </div>

    <div v-else>
      <div class="pic-report-table-scroll hidden overflow-x-auto md:block custom-scrollbar">
        <table class="w-full min-w-[680px] text-left">
          <thead class="sticky top-0 z-10 bg-slate-800 text-[10px] font-semibold uppercase text-white shadow-sm">
            <tr>
              <th v-if="selectable" class="w-10 border-r border-slate-700 bg-slate-900/50 px-4 py-3"></th>
              <th
                v-for="column in tableColumns"
                :key="column.key"
                class="border-r border-slate-700 px-4 py-3 last:border-r-0"
                :class="column.alignClass"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-2 rounded text-inherit transition hover:text-pic-brand-border"
                  @click="handleSort(column)"
                >
                  <span>{{ column.label }}</span>
                  <i :class="column.sortIcon"></i>
                </button>
                <span v-else>{{ column.label }}</span>
              </th>
              <th v-if="showActions" class="w-24 px-4 py-3 text-right text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr
              v-for="row in rows"
              :key="getRowKey(row)"
              class="transition hover:bg-slate-50"
              :class="selectedSet.has(getSelectableKey(row)) ? 'bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] hover:bg-pic-brand-soft' : ''"
            >
              <td v-if="selectable" class="border-r border-slate-100 px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-pic-brand focus:ring-pic-brand-border"
                  :checked="selectedSet.has(getSelectableKey(row))"
                  @change="handleSelect(row)"
                >
              </td>
              <td
                v-for="column in tableColumns"
                :key="column.key"
                class="border-r border-slate-100 px-4 py-3 font-semibold text-slate-700 last:border-r-0"
                :class="column.alignClass"
              >
                <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                  {{ row[column.key] }}
                </slot>
              </td>
              <td v-if="showActions" class="px-4 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button v-if="actions.includes('view')" type="button" class="h-8 w-8 rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-pic-brand" @click="emit('row-action', 'view', row)">
                    <i class="fa-regular fa-eye"></i>
                  </button>
                  <button v-if="actions.includes('edit')" type="button" class="h-8 w-8 rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-pic-brand" @click="emit('row-action', 'edit', row)">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 p-3 md:hidden">
        <article
          v-for="row in rows"
          :key="getRowKey(row)"
          class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
          :class="selectedSet.has(getSelectableKey(row)) ? 'bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] hover:bg-pic-brand-soft' : ''"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-black text-slate-900">{{ row[columns[0]?.key || rowKey] }}</p>
              <p class="mt-1 text-xs font-semibold text-slate-500">{{ row[columns[1]?.key || rowKey] }}</p>
            </div>
            <input
              v-if="selectable"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-pic-brand focus:ring-pic-brand-border"
              :checked="selectedSet.has(getSelectableKey(row))"
              @change="handleSelect(row)"
            >
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <div v-for="column in columns.slice(2)" :key="column.key" class="rounded-lg bg-slate-50 px-3 py-2">
              <p class="text-[10px] font-black uppercase text-slate-500">{{ column.label }}</p>
              <p class="mt-1 text-xs font-black text-slate-900">{{ row[column.key] }}</p>
            </div>
          </div>
          <div v-if="showActions" class="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
            <button v-if="actions.includes('view')" type="button" class="h-8 w-8 rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-pic-brand" @click="emit('row-action', 'view', row)">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button v-if="actions.includes('edit')" type="button" class="h-8 w-8 rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-pic-brand" @click="emit('row-action', 'edit', row)">
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>

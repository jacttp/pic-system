<script setup lang="ts">
import { computed } from 'vue';

export interface StdTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

interface Props {
  columns: StdTableColumn[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  selectable?: boolean;
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
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
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
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[680px] text-left">
          <thead class="bg-pic-brand-soft text-[10px] font-black uppercase text-pic-brand">
            <tr>
              <th v-if="selectable" class="w-10 px-4 py-3"></th>
              <th
                v-for="column in tableColumns"
                :key="column.key"
                class="px-4 py-3"
                :class="column.alignClass"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-2 rounded text-inherit transition hover:opacity-80"
                  @click="handleSort(column)"
                >
                  <span>{{ column.label }}</span>
                  <i :class="column.sortIcon"></i>
                </button>
                <span v-else>{{ column.label }}</span>
              </th>
              <th class="w-24 px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-for="row in rows" :key="getRowKey(row)" class="transition hover:bg-pic-brand-soft">
              <td v-if="selectable" class="px-4 py-3">
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
                class="px-4 py-3 font-semibold text-slate-700"
                :class="column.alignClass"
              >
                <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                  {{ row[column.key] }}
                </slot>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button type="button" class="h-8 w-8 rounded-lg text-slate-400 transition hover:bg-pic-brand-soft hover:text-pic-brand" @click="emit('row-action', 'view', row)">
                    <i class="fa-regular fa-eye"></i>
                  </button>
                  <button type="button" class="h-8 w-8 rounded-lg text-slate-400 transition hover:bg-pic-brand-soft hover:text-pic-brand" @click="emit('row-action', 'edit', row)">
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
          class="rounded-lg border border-slate-200 bg-white p-3 transition hover:border-pic-brand-border hover:bg-pic-brand-soft"
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
        </article>
      </div>
    </div>
  </div>
</template>

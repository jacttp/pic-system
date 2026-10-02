<script setup lang="ts">
import StdDataTable, { type StdTableColumn } from '@/modules/Shared/components/std/StdDataTable.vue';
withDefaults(defineProps<{ columns: StdTableColumn[]; rows: Record<string, unknown>[]; loading?: boolean; selectedKeys?: (string | number)[]; emptyTitle?: string; emptyDescription?: string }>(), { selectedKeys: () => [], emptyTitle: 'Sin resultados', emptyDescription: 'No hay registros para los filtros actuales.' });
</script>
<template>
  <div>
    <div v-if="loading" class="ts-empty" role="status" aria-live="polite">Cargando…</div>
    <div v-else-if="!rows.length" class="ts-empty"><p class="ts-name">{{ emptyTitle }}</p><p class="mt-2 text-sm">{{ emptyDescription }}</p></div>
    <template v-else>
      <StdDataTable class="ts-table hidden md:block" :columns="columns" :rows="rows" :selected-keys="selectedKeys" :show-actions="false">
        <template v-for="(_, name) in $slots" #[name]="scope"><slot :name="name" v-bind="scope" /></template>
      </StdDataTable>
      <div class="ts-mobile-list md:hidden"><article v-for="row in rows" :key="String(row.id)" class="ts-mobile-row" :class="selectedKeys.includes(String(row.id)) ? 'ts-selection-row' : ''"><slot name="mobile" :row="row" /></article></div>
    </template>
  </div>
</template>

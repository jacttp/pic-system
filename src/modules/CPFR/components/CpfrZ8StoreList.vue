<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Z8ManagerStore } from '../types/cpfrZ8ManagerTypes'

const props = defineProps<{ stores: Z8ManagerStore[]; selectedId?: string | null; loading?: boolean; selectedDate?: string }>()
const emit = defineEmits<{ (e: 'select', store: Z8ManagerStore): void; (e: 'back'): void }>()
defineSlots<{ details(props: { store: Z8ManagerStore }): any }>()
const search = ref('')
const visible = computed(() => props.stores.filter(item => `${item.nombre_tienda} ${item.id_cliente} ${item.Jefatura || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const selectedStore = computed(() => props.stores.find(item => item.id_cliente === props.selectedId) || null)
const labels = { pedido_creado: 'Pedido creado', fin_embarque: 'Fin de embarque', atencion_oficial: 'Atención oficial' }
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface font-sans" aria-label="Tiendas y órdenes de la semana">
    <header v-if="!selectedStore" class="flex flex-col gap-3 border-b border-pic-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div>
        <h3 class="text-sm font-bold text-pic-text-main">Tiendas del día <span class="font-mono text-pic-text-muted">{{ visible.length }}/{{ stores.length }}</span></h3>
        <p class="text-xs text-pic-text-muted">{{ selectedDate ? `Órdenes de la semana · Día ${selectedDate}` : 'Selecciona una tienda para ver sus órdenes' }}</p>
      </div>
      <label class="relative block w-full sm:max-w-xs">
        <span class="sr-only">Buscar tienda o ID</span>
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted" aria-hidden="true" />
        <input v-model="search" type="search" placeholder="Buscar tienda o ID" class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface pl-8 pr-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" />
      </label>
    </header>

    <template v-if="selectedStore">
      <header class="flex flex-wrap items-center gap-3 border-b border-pic-border bg-pic-muted-surface/60 p-3 sm:p-4">
        <button type="button" class="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-bold text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand focus-visible:outline-2 focus-visible:outline-pic-brand" @click="emit('back')">
          <i class="fa-solid fa-arrow-left" aria-hidden="true" />
          <span>Tiendas</span>
        </button>
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-pic-brand">Detalle de tienda</p>
          <h3 class="truncate text-base font-extrabold text-pic-text-main">{{ selectedStore.nombre_tienda || selectedStore.id_cliente }}</h3>
          <p class="text-xs text-pic-text-muted"><span class="font-mono">{{ selectedStore.id_cliente }}</span><span class="mx-1.5">·</span>{{ selectedStore.fecha_atencion ? `Atención ${selectedStore.fecha_atencion}` : 'Sin día configurado' }}</p>
        </div>
        <span class="shrink-0 text-right"><span class="block font-mono text-sm font-bold text-pic-text-main">{{ selectedStore.pedidos.length }}</span><span class="block text-[10px] text-pic-text-muted">OC semanales</span></span>
      </header>
      <div class="p-3 sm:p-4">
        <p v-if="selectedStore.motivos_en_fecha.length" class="mb-3 text-xs text-pic-text-muted">En este día: {{ selectedStore.motivos_en_fecha.map(reason => labels[reason]).join(' · ') }}</p>
        <slot name="details" :store="selectedStore" />
      </div>
    </template>

    <template v-else>
    <p v-if="loading" class="p-4 text-sm text-pic-text-muted" role="status">Cargando tiendas…</p>
    <p v-else-if="!visible.length" class="p-4 text-sm text-pic-text-muted">{{ stores.length ? 'No hay tiendas que coincidan con la búsqueda.' : 'No hay tiendas relacionadas con este día.' }}</p>

    <div v-else class="divide-y divide-pic-border">
      <article v-for="store in visible" :key="store.id_cliente" class="bg-pic-surface">
        <button
          type="button"
          class="group flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-pic-brand-soft focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-pic-brand sm:px-4"
          @click="emit('select', store)"
        >
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pic-muted-surface text-pic-text-muted transition group-hover:bg-pic-brand group-hover:text-white" aria-hidden="true"><i class="fa-solid fa-shop" /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold leading-5 text-pic-text-main">{{ store.nombre_tienda || store.id_cliente }}</span>
            <span class="mt-0.5 block text-xs text-pic-text-muted"><span class="font-mono">{{ store.id_cliente }}</span><span class="mx-1.5">·</span>{{ store.fecha_atencion ? `Atención ${store.fecha_atencion}` : 'Sin día configurado' }}</span>
            <span v-if="store.motivos_en_fecha.length" class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-pic-text-muted">
              <span v-for="reason in store.motivos_en_fecha" :key="reason">{{ labels[reason] }}</span>
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block font-mono text-sm font-bold text-pic-text-main">{{ store.pedidos.length }}</span>
            <span class="block text-[10px] text-pic-text-muted">OC</span>
          </span>
          <span class="shrink-0 text-xs font-bold text-pic-text-muted transition group-hover:text-pic-brand">Ver detalle <i class="fa-solid fa-arrow-right ml-1" aria-hidden="true" /></span>
        </button>
      </article>
    </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { Approval } from '../types/approval.types';

interface ApprovalCardRow {
   approval: Approval
   typeIcon: string
   typeLabel: string
   typeToneClass: string
   statusLabel: string
   statusIcon: string
   statusToneClass: string
   requestedDate: string
   requestedTime: string
   meta: string
   storeName: string
   orderLabel: string
   embarqueLabel: string
   embarqueToneClass: string
   embarqueStatusLabel: string
   actionLabel: string
   actionClass: string
   canResolve: boolean
}

const props = defineProps<{
   row: ApprovalCardRow
   canDelete: boolean
}>();

const emit = defineEmits<{
   (e: 'view', id: number): void
   (e: 'delete', approval: Approval, event: Event): void
}>();
</script>

<template>
   <article class="group overflow-hidden rounded-lg border border-pic-border bg-pic-surface transition hover:border-pic-brand-border hover:bg-pic-muted-surface hover:shadow-sm">
      <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_176px]">
         <button type="button" class="min-w-0 p-3 text-left sm:p-4" @click="emit('view', props.row.approval.id)">
            <div class="flex min-w-0 items-start gap-3">
               <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--pic-danger)/0.20)] bg-[hsl(var(--pic-danger)/0.07)] text-pic-danger">
                  <i :class="props.row.typeIcon"></i>
               </span>

               <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                     <div class="min-w-0">
                        <span class="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase" :class="props.row.embarqueToneClass">
                           <i class="fa-regular fa-calendar-check"></i>
                           <span class="truncate">Fin embarque: {{ props.row.embarqueLabel }}</span>
                        </span>

                        <h3 class="mt-2 truncate text-sm font-black text-pic-text-main group-hover:text-pic-brand">
                           {{ props.row.storeName }}
                        </h3>
                        <p class="mt-0.5 line-clamp-1 text-xs font-semibold text-pic-text-muted">
                           {{ props.row.approval.title }}
                        </p>
                        <p class="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase text-pic-text-muted">
                           <i :class="[props.row.typeIcon, props.row.typeToneClass]"></i>
                           {{ props.row.typeLabel }}
                        </p>
                     </div>

                     <div class="flex shrink-0 flex-wrap items-center gap-1.5">
                        <span class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase" :class="props.row.statusToneClass">
                           <i :class="props.row.statusIcon"></i>
                           {{ props.row.statusLabel }}
                        </span>
                     </div>
                  </div>

                  <div class="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-[minmax(128px,1fr)_minmax(180px,1fr)_minmax(170px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
                     <div class="min-w-0 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2">
                        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">Pedido</p>
                        <p class="mt-0.5 truncate font-black text-pic-text-main">{{ props.row.orderLabel }}</p>
                     </div>
                     <div class="min-w-0 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2">
                        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">Detalle</p>
                        <p class="mt-0.5 truncate font-bold text-pic-text-muted">{{ props.row.meta }}</p>
                     </div>
                     <div class="min-w-0 rounded-lg border px-3 py-2" :class="props.row.embarqueToneClass">
                        <p class="text-[10px] font-black uppercase tracking-[0.14em]">Fin de embarque</p>
                        <p class="mt-0.5 truncate font-black">{{ props.row.embarqueLabel }}</p>
                        <p class="truncate text-[10px] font-semibold">{{ props.row.embarqueStatusLabel }}</p>
                     </div>
                     <div class="min-w-0 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2">
                        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">Solicitante</p>
                        <p class="mt-0.5 truncate font-bold text-pic-text-main">{{ props.row.approval.requestedBy }}</p>
                     </div>
                     <div class="min-w-0 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2">
                        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">Fecha</p>
                        <p class="truncate text-[11px] font-semibold text-pic-text-muted">{{ props.row.requestedDate }}, {{ props.row.requestedTime }}</p>
                     </div>
                  </div>
               </div>
            </div>
         </button>

         <div class="flex items-center gap-2 border-t border-pic-border bg-pic-surface px-3 py-3 lg:flex-col lg:items-stretch lg:justify-center lg:border-l lg:border-t-0">
            <button
               type="button"
               class="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black uppercase transition lg:flex-none"
               :class="props.row.canResolve
                  ? 'border-pic-brand-border bg-pic-surface text-pic-brand hover:bg-pic-muted-surface'
                  : props.row.actionClass"
               @click="emit('view', props.row.approval.id)"
            >
               <i :class="props.row.canResolve ? 'fa-solid fa-check' : props.row.statusIcon"></i>
               {{ props.row.canResolve ? 'Resolver' : props.row.actionLabel }}
            </button>

            <button
               v-if="canDelete"
               type="button"
               class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--pic-danger)/0.22)] bg-pic-surface text-pic-danger transition hover:bg-[hsl(var(--pic-danger)/0.08)] lg:w-full"
               title="Borrar solicitud cancelada"
               @click="emit('delete', props.row.approval, $event)"
            >
               <i class="fa-solid fa-xmark"></i>
            </button>
         </div>
      </div>
   </article>
</template>

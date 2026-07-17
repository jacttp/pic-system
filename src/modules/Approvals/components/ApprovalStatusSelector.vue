<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApprovalStatusBadge from './ApprovalStatusBadge.vue';
import {
   APPROVAL_STATUS_CONFIG,
   type ApprovalStatus,
} from '../types/approval.types';

interface Props {
   status: ApprovalStatus
   options: ApprovalStatus[]
   disabled?: boolean
   dark?: boolean
   align?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
   disabled: false,
   dark: false,
   align: 'right',
});

const emit = defineEmits<{
   (event: 'select', status: ApprovalStatus): void
}>();

const isOpen = ref(false);
const availableOptions = computed(() => props.options.filter(option => option !== props.status));

const optionDescriptions: Partial<Record<ApprovalStatus, string>> = {
   CANCELLED: 'Cancela la solicitud y revierte su flujo operativo.',
};

const close = () => {
   isOpen.value = false;
};

const toggle = () => {
   if (props.disabled || availableOptions.value.length === 0) return;
   isOpen.value = !isOpen.value;
};

const selectStatus = (status: ApprovalStatus) => {
   close();
   emit('select', status);
};

const handleDocumentClick = () => close();

watch(() => props.status, close);

onMounted(() => document.addEventListener('click', handleDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick));
</script>

<template>
   <div class="relative z-30 inline-flex" @click.stop>
      <button
         type="button"
         class="rounded-lg transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-pic-brand-border disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-none"
         :class="isOpen ? 'ring-2 ring-pic-brand-border ring-offset-1' : ''"
         :disabled="disabled || availableOptions.length === 0"
         :aria-expanded="isOpen"
         aria-haspopup="listbox"
         :title="availableOptions.length ? 'Cambiar estado' : 'Estado de la solicitud'"
         @click="toggle"
      >
         <ApprovalStatusBadge :status="status" :dark="dark" />
      </button>

      <div
         v-if="isOpen"
         class="absolute top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-pic-brand-border bg-pic-surface text-left shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150"
         :class="align === 'right' ? 'right-0' : 'left-0'"
         role="listbox"
      >
         <div class="border-b border-pic-brand-border bg-pic-brand-soft px-3 py-2.5">
            <p class="text-[9px] font-black uppercase tracking-[0.2em] text-pic-brand">Cambiar estado</p>
            <p class="mt-0.5 text-[10px] font-semibold text-pic-text-muted">Selecciona el nuevo estado de la solicitud.</p>
         </div>

         <button
            v-for="option in availableOptions"
            :key="option"
            type="button"
            class="flex w-full items-start gap-2.5 px-3 py-3 text-left transition hover:bg-[hsl(var(--pic-danger)/0.08)] focus:bg-[hsl(var(--pic-danger)/0.08)] focus:outline-none"
            role="option"
            @click="selectStatus(option)"
         >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pic-danger)/0.10)] text-pic-danger">
               <i :class="APPROVAL_STATUS_CONFIG[option].icon" class="text-[11px]"></i>
            </span>
            <span class="min-w-0">
               <span class="block text-[11px] font-black text-pic-danger">{{ APPROVAL_STATUS_CONFIG[option].label }}</span>
               <span class="mt-0.5 block text-[9px] font-semibold leading-snug text-pic-text-muted">
                  {{ optionDescriptions[option] || 'Actualiza el estado de la solicitud.' }}
               </span>
            </span>
         </button>
      </div>
   </div>
</template>

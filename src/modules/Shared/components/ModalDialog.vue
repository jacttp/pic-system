<!-- src/modules/Shared/components/ModalDialog.vue -->
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
    modelValue: boolean; // Controla si está abierto o cerrado
    title: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}>();

const emit = defineEmits(['update:modelValue', 'close']);
const panel = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const handleKeydown = (e: KeyboardEvent) => {
    if (!props.modelValue) return;
    if (e.key === 'Escape') {
        close();
        return;
    }
    if (e.key !== 'Tab' || !panel.value) return;
    const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>(focusableSelector));
    if (!focusable.length) {
        e.preventDefault();
        panel.value.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
    }
};

watch(() => props.modelValue, async open => {
    if (open) {
        previouslyFocused = document.activeElement as HTMLElement | null;
        await nextTick();
        const first = panel.value?.querySelector<HTMLElement>(focusableSelector);
        (first || panel.value)?.focus();
        return;
    }
    previouslyFocused?.focus();
    previouslyFocused = null;
});

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));

const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '4xl': 'sm:max-w-4xl'
};
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue" class="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <!-- Backdrop oscuro -->
                <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" @click="close"></div>

                <div class="fixed inset-0 z-10 overflow-y-auto">
                    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        
                        <!-- Panel del Modal -->
                        <div ref="panel" tabindex="-1"
                            class="relative w-full transform overflow-hidden rounded-xl border border-pic-border bg-pic-surface text-left shadow-xl outline-none transition-all sm:my-8"
                            :class="sizeClasses[size || 'md']"
                        >
                            <!-- Header -->
                            <div class="flex items-center justify-between border-b border-pic-border bg-pic-surface px-4 py-3">
                                <h3 class="text-lg font-semibold leading-6 text-pic-text-main" id="modal-title">{{ title }}</h3>
                                <button type="button" aria-label="Cerrar diálogo" @click="close" class="rounded-md p-1 text-pic-text-muted transition-colors hover:bg-pic-brand-soft hover:text-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border">
                                    <i class="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>

                            <!-- Slot para el contenido del formulario -->
                            <div class="px-4 py-5 sm:p-6 max-h-[80vh] overflow-y-auto">
                                <slot></slot>
                            </div>

                            <!-- Slot para botones de acción (Footer) -->
                            <div v-if="$slots.footer" class="border-t border-pic-border bg-pic-muted-surface px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <slot name="footer"></slot>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
    transition: all 0.3s ease-out;
}

.modal-enter-from .relative, 
.modal-leave-to .relative {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
}
</style>

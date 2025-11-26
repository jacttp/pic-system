<!-- src/modules/Shared/components/ModalDialog.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    modelValue: boolean; // Controla si está abierto o cerrado
    title: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}>();

const emit = defineEmits(['update:modelValue', 'close']);

const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

// Cerrar con la tecla ESC
const handleKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) close();
};

onMounted(() => document.addEventListener('keyup', handleKeyup));
onUnmounted(() => document.removeEventListener('keyup', handleKeyup));

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
                <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="close"></div>

                <div class="fixed inset-0 z-10 overflow-y-auto">
                    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        
                        <!-- Panel del Modal -->
                        <div 
                            class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 w-full"
                            :class="sizeClasses[size || 'md']"
                        >
                            <!-- Header -->
                            <div class="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                <h3 class="text-lg font-semibold leading-6 text-slate-800" id="modal-title">{{ title }}</h3>
                                <button @click="close" class="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-1 rounded-md transition-colors">
                                    <i class="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>

                            <!-- Slot para el contenido del formulario -->
                            <div class="px-4 py-5 sm:p-6 max-h-[80vh] overflow-y-auto">
                                <slot></slot>
                            </div>

                            <!-- Slot para botones de acción (Footer) -->
                            <div v-if="$slots.footer" class="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-slate-100">
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
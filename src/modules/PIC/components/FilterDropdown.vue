<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
    label: string;
    options: string[];
    modelValue: string[]; // v-model
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchTerm = ref('');

// Filtrado local para el buscador interno
const filteredOptions = computed(() => {
    if (!searchTerm.value) return props.options;
    return props.options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
});

// Texto del botón (ej: "3 seleccionados")
const buttonText = computed(() => {
    if (props.modelValue.length === 0) return 'Todos';
    if (props.modelValue.length === 1) return props.modelValue[0];
    return `${props.modelValue.length} seleccionados`;
});

const toggleSelection = (option: string) => {
    const newValue = [...props.modelValue];
    if (newValue.includes(option)) {
        newValue.splice(newValue.indexOf(option), 1);
    } else {
        newValue.push(option);
    }
    emit('update:modelValue', newValue);
    emit('change'); // Avisar que hubo cambio (para disparar cascada)
};

const selectAll = () => {
    if (props.modelValue.length === props.options.length) {
        emit('update:modelValue', []); // Deseleccionar todo
    } else {
        emit('update:modelValue', [...props.options]); // Seleccionar todo
    }
    emit('change');
};
</script>

<template>
    <div class="relative w-full">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            {{ label }}
        </label>
        
        <button 
            @click="!disabled && (isOpen = !isOpen)"
            class="w-full text-left bg-white border rounded-lg py-2 px-3 flex justify-between items-center text-sm transition-all"
            :class="[
                disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-brand-400 focus:ring-2 focus:ring-brand-100',
                isOpen ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
            ]"
            :disabled="disabled"
        >
            <span class="truncate text-slate-700 font-medium">{{ buttonText }}</span>
            <i class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform" :class="{'rotate-180': isOpen}"></i>
        </button>

        <div v-if="isOpen" class="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-64">
            
            <div class="p-2 border-b border-slate-100 bg-slate-50">
                <input 
                    v-model="searchTerm" 
                    type="text" 
                    placeholder="Buscar..." 
                    class="w-full text-xs px-2 py-1.5 rounded border border-slate-200 focus:border-brand-500 outline-none"
                >
            </div>

            <div class="overflow-y-auto flex-1 p-1">
                <div 
                    v-for="opt in filteredOptions" 
                    :key="opt"
                    class="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer group"
                    @click="toggleSelection(opt)"
                >
                    <div class="w-4 h-4 border border-slate-300 rounded mr-2 flex items-center justify-center transition-colors"
                         :class="modelValue.includes(opt) ? 'bg-brand-500 border-brand-500' : 'group-hover:border-brand-400'">
                        <i v-if="modelValue.includes(opt)" class="fa-solid fa-check text-white text-[10px]"></i>
                    </div>
                    <span class="text-xs text-slate-600 truncate">{{ opt }}</span>
                </div>
                <div v-if="filteredOptions.length === 0" class="p-3 text-center text-xs text-slate-400">
                    Sin resultados
                </div>
            </div>

            <div class="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button @click="selectAll" class="text-xs text-brand-600 hover:underline font-medium">
                    {{ modelValue.length === options.length ? 'Deseleccionar todo' : 'Seleccionar todo' }}
                </button>
            </div>
        </div>

        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-40 cursor-default"></div>
    </div>
</template>
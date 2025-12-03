<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onClickOutside } from '@vueuse/core'; // *Nota 1 abajo

interface Option {
    label: string;
    value: string | number;
}

const props = defineProps<{
    modelValue: (string | number)[]; // Array de valores seleccionados
    options: string[] | Option[];    // Soporta array de strings o de objetos
    label: string;
    disabled?: boolean;
    placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue']);

// --- Estado ---
const isOpen = ref(false);
const searchTerm = ref('');
const dropdownRef = ref(null);

// Cerrar al hacer click fuera
// *Nota 1: Si no tienes @vueuse/core, implementamos un listener nativo simple
// pero idealmente instala: npm i @vueuse/core
const closeDropdown = () => isOpen.value = false;

// --- Normalización de Opciones ---
// Convierte strings simples a objetos {label, value} para consistencia
const normalizedOptions = computed(() => {
    return props.options.map(opt => {
        if (typeof opt === 'object') return opt;
        return { label: String(opt), value: opt };
    });
});

// --- Filtrado (Buscador Interno) ---
const filteredOptions = computed(() => {
    if (!searchTerm.value) return normalizedOptions.value;
    const term = searchTerm.value.toLowerCase();
    return normalizedOptions.value.filter(opt => 
        String(opt.label).toLowerCase().includes(term)
    );
});

// --- Texto del Botón ---
const buttonText = computed(() => {
    if (props.modelValue.length === 0) return 'Todos';
    if (props.modelValue.length === normalizedOptions.value.length) return 'Todos (Seleccionados)';
    if (props.modelValue.length === 1) {
        const selected = normalizedOptions.value.find(o => o.value === props.modelValue[0]);
        return selected ? selected.label : '1 seleccionado';
    }
    return `${props.modelValue.length} seleccionados`;
});

// --- Lógica de Selección ---
const toggleOption = (value: string | number) => {
    const newValue = [...props.modelValue];
    const index = newValue.indexOf(value);
    
    if (index === -1) {
        newValue.push(value);
    } else {
        newValue.splice(index, 1);
    }
    emit('update:modelValue', newValue);
};

const toggleAll = () => {
    // Si ya están todos seleccionados (filtrados o totales), deseleccionar
    // Si no, seleccionar todos los VISIBLES (respeta el buscador)
    const allVisibleValues = filteredOptions.value.map(o => o.value);
    const areAllVisibleSelected = allVisibleValues.every(val => props.modelValue.includes(val));

    let newValue = [...props.modelValue];

    if (areAllVisibleSelected) {
        // Remover los visibles de la selección
        newValue = newValue.filter(val => !allVisibleValues.includes(val));
    } else {
        // Agregar los visibles que falten
        allVisibleValues.forEach(val => {
            if (!newValue.includes(val)) newValue.push(val);
        });
    }
    emit('update:modelValue', newValue);
};

// Listener click outside (Implementación manual simple si no usas VueUse)
import { onMounted, onUnmounted } from 'vue';
const handleClickOutside = (event: Event) => {
    if (dropdownRef.value && !(dropdownRef.value as any).contains(event.target)) {
        isOpen.value = false;
    }
};
onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

</script>

<template>
    <div class="relative w-full" ref="dropdownRef">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            {{ label }}
        </label>
        
        <button 
            type="button"
            @click="!disabled && (isOpen = !isOpen)"
            :disabled="disabled"
            class="w-full text-left bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 flex justify-between items-center text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            :class="{'opacity-60 cursor-not-allowed bg-slate-50': disabled, 'border-brand-500 ring-1 ring-brand-500': isOpen}"
        >
            <span class="truncate text-slate-700 font-medium">{{ buttonText }}</span>
            <i class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform" :class="{'rotate-180': isOpen}"></i>
        </button>

        <div v-show="isOpen" class="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            <div class="p-2 border-b border-slate-100 bg-slate-50">
                <div class="relative">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input 
                        v-model="searchTerm"
                        type="text" 
                        class="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        placeholder="Buscar..."
                    >
                </div>
            </div>

            <div class="px-2 py-1.5 border-b border-slate-100 flex justify-end">
                <button @click="toggleAll" class="text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline">
                    Seleccionar/Deseleccionar visibles
                </button>
            </div>

            <ul class="max-h-60 overflow-y-auto p-1 space-y-0.5">
                <li v-if="filteredOptions.length === 0" class="text-xs text-slate-400 text-center py-2">
                    No hay resultados
                </li>
                
                <li v-for="opt in filteredOptions" :key="opt.value">
                    <label class="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group transition-colors">
                        <input 
                            type="checkbox" 
                            :value="opt.value"
                            :checked="modelValue.includes(opt.value)"
                            @change="toggleOption(opt.value)"
                            class="form-checkbox h-4 w-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 transition duration-150 ease-in-out"
                        >
                        <span class="ml-2 text-sm text-slate-600 group-hover:text-slate-900 truncate">
                            {{ opt.label }}
                        </span>
                    </label>
                </li>
            </ul>
        </div>
    </div>
</template>
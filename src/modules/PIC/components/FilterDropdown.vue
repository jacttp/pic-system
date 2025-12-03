<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
    label?: string; // Hacemos el label opcional para casos inline
    options: string[];
    modelValue: string[]; 
    disabled?: boolean;
    placeholder?: string; // Nuevo: Texto por defecto personalizado
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchTerm = ref('');

const filteredOptions = computed(() => {
    if (!searchTerm.value) return props.options;
    return props.options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
});

const buttonText = computed(() => {
    if (props.modelValue.length === 0) return props.placeholder || 'Todos';
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
    emit('change');
};

const selectAll = () => {
    if (props.modelValue.length === props.options.length) {
        emit('update:modelValue', []);
    } else {
        emit('update:modelValue', [...props.options]);
    }
    emit('change');
};
</script>

<template>
    <div class="relative w-full group">
        <label v-if="label" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
            {{ label }}
        </label>
        
        <button 
            @click="!disabled && (isOpen = !isOpen)"
            class="w-full text-left bg-white border rounded-lg px-3 h-[38px] flex justify-between items-center text-xs transition-all shadow-sm"
            :class="[
                disabled 
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' 
                    : 'hover:border-brand-400 hover:shadow-md focus:ring-2 focus:ring-brand-100',
                isOpen ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
            ]"
            :disabled="disabled"
        >
            <span class="truncate font-medium" :class="modelValue.length > 0 ? 'text-brand-700' : 'text-slate-600'">
                {{ buttonText }}
            </span>
            <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200" :class="{'rotate-180': isOpen}"></i>
        </button>

        <div 
            v-if="isOpen" 
            class="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-100"
        >
            <div class="p-2 border-b border-slate-100 bg-slate-50">
                <div class="relative">
                    <i class="fa-solid fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                    <input 
                        v-model="searchTerm" 
                        type="text" 
                        placeholder="Buscar..." 
                        class="w-full text-xs pl-6 pr-2 py-1.5 rounded border border-slate-200 focus:border-brand-500 outline-none transition-colors"
                        ref="searchInput"
                    >
                </div>
            </div>

            <div class="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div 
                    v-for="opt in filteredOptions" 
                    :key="opt"
                    class="flex items-center px-2 py-1.5 hover:bg-brand-50 rounded cursor-pointer group/item transition-colors"
                    @click="toggleSelection(opt)"
                >
                    <div 
                        class="w-3.5 h-3.5 border rounded mr-2 flex items-center justify-center transition-all"
                        :class="modelValue.includes(opt) 
                            ? 'bg-brand-500 border-brand-500 shadow-sm' 
                            : 'border-slate-300 bg-white group-hover/item:border-brand-400'"
                    >
                        <i v-if="modelValue.includes(opt)" class="fa-solid fa-check text-white text-[8px]"></i>
                    </div>
                    <span class="text-xs text-slate-600 truncate group-hover/item:text-brand-700">{{ opt }}</span>
                </div>
                <div v-if="filteredOptions.length === 0" class="p-4 text-center text-xs text-slate-400 italic">
                    Sin resultados
                </div>
            </div>

            <div class="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button @click="selectAll" class="text-[10px] font-bold text-brand-600 hover:text-brand-800 uppercase tracking-wide transition-colors">
                    {{ modelValue.length === options.length ? 'Ninguno' : 'Todos' }}
                </button>
            </div>
        </div>

        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-[90] cursor-default"></div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
    label?: string;
    options: string[];
    modelValue: string[];
    disabled?: boolean;
    placeholder?: string;
    loading?: boolean;
    density?: 'default' | 'compact';
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void;
    (e: 'change'): void;
    (e: 'open-change', value: boolean): void;
}>();

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

const isEffectiveDisabled = computed(() => props.disabled || props.loading);
const isCompact = computed(() => props.density === 'compact');

const setOpen = (value: boolean) => {
    isOpen.value = value;
    emit('open-change', value);
};

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
        <label
            v-if="label"
            class="block font-bold text-pic-text-muted uppercase tracking-wider ml-1"
            :class="isCompact ? 'text-[9px] mb-1' : 'text-[10px] mb-1.5'"
        >
            {{ label }}
        </label>

        <button
            @click="!isEffectiveDisabled && setOpen(!isOpen)"
            class="w-full text-left bg-pic-surface border rounded-lg flex justify-between items-center text-xs transition-all shadow-sm"
            :class="[
                isCompact ? 'h-8 px-2.5' : 'h-[38px] px-3',
                isEffectiveDisabled
                    ? 'opacity-50 cursor-not-allowed bg-pic-muted-surface border-pic-border'
                    : 'hover:border-pic-brand-border hover:shadow-md focus:ring-2 focus:ring-pic-brand-border',
                isOpen ? 'border-pic-brand ring-2 ring-pic-brand-border' : 'border-pic-border'
            ]"
            :disabled="isEffectiveDisabled"
        >
            <div class="flex min-w-0 items-center gap-2 truncate">
                <i v-if="loading" class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
                <span class="truncate font-medium" :class="modelValue.length > 0 ? 'text-pic-brand' : 'text-pic-text-muted'">
                    {{ loading ? 'Cargando...' : buttonText }}
                </span>
            </div>
            <i class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform duration-200" :class="{ 'rotate-180': isOpen }"></i>
        </button>

        <div
            v-if="isOpen"
            class="absolute top-full left-0 w-full mt-1 bg-pic-surface border border-pic-border rounded-lg shadow-xl z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
            :class="isCompact ? 'max-h-52' : 'max-h-60'"
        >
            <div class="border-b border-pic-border bg-pic-muted-surface" :class="isCompact ? 'p-1.5' : 'p-2'">
                <div class="relative">
                    <i class="fa-solid fa-search absolute left-2 top-1/2 -translate-y-1/2 text-pic-text-muted text-[10px]"></i>
                    <input
                        v-model="searchTerm"
                        type="text"
                        placeholder="Buscar..."
                        class="w-full text-xs pl-6 pr-2 rounded border border-pic-border bg-pic-surface text-pic-text-main placeholder:text-pic-text-muted focus:border-pic-brand outline-none transition-colors"
                        :class="isCompact ? 'py-1' : 'py-1.5'"
                    >
                </div>
            </div>

            <div class="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-[hsl(var(--pic-border))] scrollbar-track-transparent">
                <div
                    v-for="opt in filteredOptions"
                    :key="opt"
                    class="flex items-center px-2 py-1.5 hover:bg-pic-brand-soft rounded cursor-pointer group/item transition-colors"
                    @click="toggleSelection(opt)"
                >
                    <div
                        class="w-3.5 h-3.5 border rounded mr-2 flex items-center justify-center transition-all"
                        :class="modelValue.includes(opt)
                            ? 'bg-pic-brand border-pic-brand shadow-sm'
                            : 'border-pic-border bg-pic-surface group-hover/item:border-pic-brand-border'"
                    >
                        <i v-if="modelValue.includes(opt)" class="fa-solid fa-check text-white text-[8px]"></i>
                    </div>
                    <span class="text-xs text-pic-text-muted truncate group-hover/item:text-pic-brand">{{ opt }}</span>
                </div>
                <div v-if="filteredOptions.length === 0" class="p-4 text-center text-xs text-pic-text-muted italic">
                    Sin resultados
                </div>
            </div>

            <div class="p-2 border-t border-pic-border bg-pic-muted-surface text-center">
                <button @click="selectAll" class="text-[10px] font-bold text-pic-brand hover:brightness-90 uppercase tracking-wide transition-colors">
                    {{ modelValue.length === options.length ? 'Ninguno' : 'Todos' }}
                </button>
            </div>
        </div>

        <div v-if="isOpen" @click="setOpen(false)" class="fixed inset-0 z-[9998] cursor-default"></div>
    </div>
</template>

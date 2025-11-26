<!-- src/modules/Shared/components/FormSelect.vue -->
<script setup lang="ts">
defineProps<{
    modelValue: string | number | null;
    label?: string;
    options: { value: string | number; label: string }[];
    required?: boolean;
    disabled?: boolean;
    error?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const updateValue = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value);
};
</script>

<template>
    <div class="w-full">
        <label v-if="label" class="block text-sm font-medium text-slate-700 mb-1">
            {{ label }} <span v-if="required" class="text-red-500">*</span>
        </label>
        
        <select
            :value="modelValue"
            @change="updateValue"
            :disabled="disabled"
            class="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
            :class="{'border-red-300 focus:border-red-500 focus:ring-red-500': error}"
        >
            <option value="" disabled selected>Seleccionar...</option>
            <option v-for="opt in options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>
        
        <p v-if="error" class="mt-1 text-xs text-red-600 flex items-center gap-1">
            <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
        </p>
    </div>
</template>
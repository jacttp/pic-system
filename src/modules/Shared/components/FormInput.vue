<!-- src/modules/Shared/components/FormInput.vue -->
<script setup lang="ts">
defineProps<{
    modelValue: string | number | null;
    label?: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    icon?: string; // Clase de FontAwesome (ej: fa-solid fa-user)
}>();

const emit = defineEmits(['update:modelValue']);

const updateValue = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.value);
};
</script>

<template>
    <div class="w-full">
        <label v-if="label" class="block text-sm font-medium text-slate-700 mb-1">
            {{ label }} <span v-if="required" class="text-red-500">*</span>
        </label>
        
        <div class="relative">
            <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i :class="[icon, 'text-slate-400 text-sm']"></i>
            </div>
            
            <input
                :type="type || 'text'"
                :value="modelValue"
                @input="updateValue"
                :placeholder="placeholder"
                :disabled="disabled"
                class="block w-full rounded-lg border-slate-300 text-sm shadow-sm placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                :class="{'pl-10': icon, 'border-red-300 focus:border-red-500 focus:ring-red-500': error}"
            />
        </div>
        
        <p v-if="error" class="mt-1 text-xs text-red-600 flex items-center gap-1">
            <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
        </p>
    </div>
</template>
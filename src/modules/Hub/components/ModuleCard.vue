<!-- src/modules/Hub/components/ModuleCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    description: string;
    icon: string; // Clase de FontAwesome (ej: "fa-solid fa-users")
    to?: string;  // Ruta interna
    href?: string; // Ruta externa (Legacy)
    active?: boolean;
    colorClass?: string; // Clase de color para el icono (ej: "text-blue-600")
    bgClass?: string;    // Clase de fondo para el icono (ej: "bg-blue-50")
}>();

// Decidir si es un link externo o interno
const isExternal = computed(() => !!props.href);
</script>

<template>
    <!-- Opción A: Link Externo (Dashboard Legacy) -->
    <a 
        v-if="isExternal" 
        :href="href" 
        target="_blank"
        class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden block"
    >
        <div class="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div 
            class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"
            :class="[bgClass || 'bg-slate-50', colorClass || 'text-slate-500']"
        >
            <i :class="icon"></i>
        </div>
        
        <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-brand-600 transition-colors">
            {{ title }}
        </h3>
        <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            {{ description }}
        </p>
        
        <div class="flex items-center justify-end pt-4 border-t border-slate-50">
            <span class="text-xs text-slate-300 group-hover:text-brand-500 font-medium flex items-center gap-1 transition-colors">
                Abrir <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </span>
        </div>
    </a>

    <!-- Opción B: Router Link (Módulos Vue) -->
    <router-link 
        v-else 
        :to="to || '#'"
        class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden block"
    >
        <div class="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div 
            class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"
            :class="[bgClass || 'bg-slate-50', colorClass || 'text-slate-500']"
        >
            <i :class="icon"></i>
        </div>
        
        <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-brand-600 transition-colors">
            {{ title }}
        </h3>
        <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            {{ description }}
        </p>
        
        <div class="flex items-center justify-end pt-4 border-t border-slate-50">
            <i class="fa-solid fa-arrow-right text-slate-300 group-hover:text-brand-500 transition-colors"></i>
        </div>
    </router-link>
</template>
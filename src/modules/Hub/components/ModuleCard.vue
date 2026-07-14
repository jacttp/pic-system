<!-- src/modules/Hub/components/ModuleCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    description: string;
    icon: string;
    to?: string;
    href?: string;
    active?: boolean;
    colorClass?: string;
    bgClass?: string;
    accentClass?: string;
}>();

const isExternal = computed(() => !!props.href);
const linkLabel = computed(() => `Abrir módulo: ${props.title}`);
</script>

<template>
    <a
        v-if="isExternal"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="linkLabel"
        class="group flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-pic-border bg-pic-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:border-pic-brand-border hover:shadow-lg hover:shadow-slate-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pic-brand-border"
    >
        <div class="flex flex-1 flex-col items-center justify-center px-5 pb-6 pt-7 text-center sm:px-6 sm:pt-8">
            <span
                class="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm transition duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-4xl"
                :class="[bgClass || 'bg-pic-module-soft', colorClass || 'text-pic-module']"
            >
                <i :class="icon"></i>
            </span>
            <h3 class="mt-5 text-lg font-black leading-tight transition-colors sm:text-xl" :class="colorClass || 'text-pic-module'">
                {{ title }}
            </h3>
            <p class="mt-2 max-w-[17rem] text-sm font-medium leading-5 text-pic-text-muted sm:text-[15px]">
                {{ description }}
            </p>
        </div>

        <div class="flex h-14 shrink-0 items-center justify-end border-t border-pic-border px-5 transition-colors sm:px-6" :class="accentClass || bgClass || 'bg-pic-module-soft'">
            <span class="flex h-8 w-8 items-center justify-center rounded-full transition duration-200 group-hover:translate-x-0.5 group-hover:bg-pic-surface" :class="colorClass || 'text-pic-module'">
                <i class="fa-solid fa-chevron-right text-sm"></i>
            </span>
        </div>
    </a>

    <router-link
        v-else
        :to="to || '#'"
        :aria-label="linkLabel"
        class="group flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-pic-border bg-pic-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:border-pic-brand-border hover:shadow-lg hover:shadow-slate-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pic-brand-border"
    >
        <div class="flex flex-1 flex-col items-center justify-center px-5 pb-6 pt-7 text-center sm:px-6 sm:pt-8">
            <span
                class="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm transition duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-4xl"
                :class="[bgClass || 'bg-pic-module-soft', colorClass || 'text-pic-module']"
            >
                <i :class="icon"></i>
            </span>
            <h3 class="mt-5 text-lg font-black leading-tight transition-colors sm:text-xl" :class="colorClass || 'text-pic-module'">
                {{ title }}
            </h3>
            <p class="mt-2 max-w-[17rem] text-sm font-medium leading-5 text-pic-text-muted sm:text-[15px]">
                {{ description }}
            </p>
        </div>

        <div class="flex h-14 shrink-0 items-center justify-end border-t border-pic-border px-5 transition-colors sm:px-6" :class="accentClass || bgClass || 'bg-pic-module-soft'">
            <span class="flex h-8 w-8 items-center justify-center rounded-full transition duration-200 group-hover:translate-x-0.5 group-hover:bg-pic-surface" :class="colorClass || 'text-pic-module'">
                <i class="fa-solid fa-chevron-right text-sm"></i>
            </span>
        </div>
    </router-link>
</template>

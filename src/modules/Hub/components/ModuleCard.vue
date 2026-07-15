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
        class="group flex min-h-[242px] flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:border-pic-brand-border hover:shadow-md hover:shadow-slate-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pic-brand-border sm:min-h-[252px]"
    >
        <div class="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center sm:px-6 sm:py-7">
            <span
                class="flex h-16 w-16 items-center justify-center rounded-2xl border border-pic-border/60 text-3xl shadow-sm transition duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-4xl"
                :class="[bgClass || 'bg-pic-module-bg', colorClass || 'text-pic-module']"
            >
                <i :class="icon"></i>
            </span>
            <h3 class="mt-4 font-sans text-base font-bold leading-tight tracking-tight text-pic-module-text transition-colors sm:text-lg">
                {{ title }}
            </h3>
            <p class="mt-1.5 max-w-[18rem] font-sans text-[13px] font-medium leading-[1.35] text-pic-text-muted sm:text-sm">
                {{ description }}
            </p>
        </div>

        <div class="flex h-10 shrink-0 items-center justify-end border-t border-pic-border px-4 transition-colors sm:px-5" :class="accentClass || bgClass || 'bg-pic-module-soft'">
            <span class="flex h-7 w-7 items-center justify-center rounded-md text-pic-module-text transition duration-200 group-hover:translate-x-0.5 group-hover:bg-[hsl(var(--pic-module-text)/0.08)]">
                <i class="fa-solid fa-chevron-right text-xs"></i>
            </span>
        </div>
    </a>

    <router-link
        v-else
        :to="to || '#'"
        :aria-label="linkLabel"
        class="group flex min-h-[242px] flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:border-pic-brand-border hover:shadow-md hover:shadow-slate-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pic-brand-border sm:min-h-[252px]"
    >
        <div class="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center sm:px-6 sm:py-7">
            <span
                class="flex h-16 w-16 items-center justify-center rounded-2xl border border-pic-border/60 text-3xl shadow-sm transition duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-4xl"
                :class="[bgClass || 'bg-pic-module-bg', colorClass || 'text-pic-module']"
            >
                <i :class="icon"></i>
            </span>
            <h3 class="mt-4 font-sans text-base font-bold leading-tight tracking-tight text-pic-module-text transition-colors sm:text-lg">
                {{ title }}
            </h3>
            <p class="mt-1.5 max-w-[18rem] font-sans text-[13px] font-medium leading-[1.35] text-pic-text-muted sm:text-sm">
                {{ description }}
            </p>
        </div>

        <div class="flex h-10 shrink-0 items-center justify-end border-t border-pic-border px-4 transition-colors sm:px-5" :class="accentClass || bgClass || 'bg-pic-module-soft'">
            <span class="flex h-7 w-7 items-center justify-center rounded-md text-pic-module-text transition duration-200 group-hover:translate-x-0.5 group-hover:bg-[hsl(var(--pic-module-text)/0.08)]">
                <i class="fa-solid fa-chevron-right text-xs"></i>
            </span>
        </div>
    </router-link>
</template>

<script setup lang="ts">
interface NoticeItem {
    id: string;
    title: string;
    detail: string;
    time: string;
    icon: string;
    iconClass: string;
    badgeClass: string;
}

const props = withDefaults(defineProps<{
    title?: string;
    notices?: NoticeItem[];
    historyRoute?: string;
}>(), {
    title: 'Avisos',
    historyRoute: '/admin/profile',
    notices: () => [
        {
            id: 'notice-rejected-cpfr',
            title: 'Solicitud rechazada: Pedido CPFR #1145',
            detail: 'SuperAdmin rechazo tu solicitud. Motivo: Prueba de rechazo.',
            time: '17 D',
            icon: 'fa-solid fa-xmark',
            iconClass: 'text-rose-600',
            badgeClass: 'bg-rose-50 text-rose-700',
        },
        {
            id: 'notice-approved-cpfr',
            title: 'Solicitud aprobada: Pedido CPFR #1144',
            detail: 'SuperAdmin aprobo tu solicitud.',
            time: '17 D',
            icon: 'fa-solid fa-check',
            iconClass: 'text-emerald-600',
            badgeClass: 'bg-emerald-50 text-emerald-700',
        },
    ],
});
</script>

<template>
    <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center gap-3 border-b border-slate-100 p-4">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
                <i class="fa-solid fa-bell text-sm"></i>
            </span>
            <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{{ title }}</p>
                <h2 class="truncate text-sm font-extrabold text-slate-900">Senales recientes</h2>
            </div>
        </div>

        <div class="divide-y divide-slate-100">
            <article
                v-for="notice in props.notices"
                :key="notice.id"
                class="grid grid-cols-[32px_minmax(0,1fr)_32px] gap-3 p-4"
            >
                <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="notice.badgeClass">
                    <i :class="[notice.icon, notice.iconClass, 'text-xs']"></i>
                </span>
                <div class="min-w-0">
                    <p class="truncate text-xs font-black text-slate-800">{{ notice.title }}</p>
                    <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{{ notice.detail }}</p>
                </div>
                <time class="pt-0.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {{ notice.time }}
                </time>
            </article>
        </div>

        <router-link
            :to="historyRoute"
            class="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-50 hover:text-brand-600"
        >
            Ver historial
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </router-link>
    </section>
</template>

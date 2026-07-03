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
    <section class="overflow-hidden rounded-xl border border-pic-border bg-white shadow-sm">
        <div class="flex items-center justify-between gap-3 border-b border-pic-border px-4 py-4 sm:px-5">
            <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand shadow-sm">
                <i class="fa-solid fa-bell text-sm"></i>
            </span>
            <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-pic-brand">{{ title }}</p>
                <h2 class="truncate text-sm font-black text-pic-text-main">Senales recientes</h2>
            </div>
            </div>
            <span class="rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 py-1 text-[10px] font-black uppercase text-pic-text-muted">
                {{ props.notices.length }} avisos
            </span>
        </div>

        <div class="divide-y divide-pic-border">
            <article
                v-for="notice in props.notices"
                :key="notice.id"
                class="grid grid-cols-[40px_minmax(0,1fr)_42px] gap-3 px-4 py-4 transition hover:bg-pic-muted-surface sm:px-5"
            >
                <span class="flex h-10 w-10 items-center justify-center rounded-lg shadow-sm" :class="notice.badgeClass">
                    <i :class="[notice.icon, notice.iconClass, 'text-xs']"></i>
                </span>
                <div class="min-w-0">
                    <p class="truncate text-sm font-black text-pic-text-main">{{ notice.title }}</p>
                    <p class="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-pic-text-muted">{{ notice.detail }}</p>
                </div>
                <time class="pt-1 text-right text-[10px] font-black uppercase tracking-wide text-pic-text-muted">
                    {{ notice.time }}
                </time>
            </article>
        </div>

        <router-link
            :to="historyRoute"
            class="flex items-center justify-center gap-2 border-t border-pic-border px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-pic-text-muted transition hover:bg-pic-brand-soft hover:text-pic-brand"
        >
            Ver historial
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </router-link>
    </section>
</template>

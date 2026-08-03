<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';

const router = useRouter();
const store = useClientStore();
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;
const filterCanal = ref('');
const filterGerencia = ref('');

const loadData = () => {
    const extraFilters: Record<string, string> = {};
    if (filterCanal.value) extraFilters.canal = filterCanal.value;
    if (filterGerencia.value) extraFilters.gerencia = filterGerencia.value;
    store.fetchClients(currentPage.value, itemsPerPage, searchTerm.value, extraFilters);
};

onMounted(() => {
    store.fetchCanales();
    store.fetchGerencias();
    loadData();
});

let debounce: ReturnType<typeof setTimeout>;
watch(searchTerm, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { currentPage.value = 1; loadData(); }, 400);
});
watch([filterCanal, filterGerencia], () => { currentPage.value = 1; loadData(); });

const totalPages = computed(() => Math.ceil(store.totalRecords / itemsPerPage));
const filtersActive = computed(() => Boolean(filterCanal.value || filterGerencia.value || searchTerm.value));
const getClientId = (item: Client) => item.Id || (item as any).id || (item as any).IdCliente || (item as any).clienteid;
const initials = (name: string) => name?.trim().split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';

const handlePageChange = (page: number) => { currentPage.value = page; loadData(); };
const handleCreate = () => router.push('/admin/clients/new');
const handleEdit = (item: Client) => {
    const id = getClientId(item);
    if (id) router.push(`/admin/clients/${id}`);
    else console.error('Client ID missing:', item);
};
const handleDelete = async (item: Client) => {
    if (!confirm(`¿Eliminar cliente "${item.Nombre}"?`)) return;
    try { await store.deleteClient(item.Id); loadData(); }
    catch { alert('Error al eliminar'); }
};
const clearFilters = () => { filterCanal.value = ''; filterGerencia.value = ''; searchTerm.value = ''; };
</script>

<template>
    <main class="min-h-full bg-pic-background font-sans text-pic-text-main">
        <header class="border-b border-pic-border bg-pic-surface">
            <div class="w-full px-4 py-4 sm:px-6 lg:px-10">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div class="flex items-start gap-3">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand">
                            <i class="fa-solid fa-store text-sm" aria-hidden="true"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">Administración comercial</p>
                            <h1 class="mt-0.5 text-xl font-bold leading-tight tracking-tight">Cartera de clientes</h1>
                            <p class="mt-1 text-xs font-medium text-pic-text-muted">Directorio, segmentación y clasificación comercial.</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between gap-3 sm:justify-end">
                        <span class="text-xs font-semibold text-pic-text-muted">
                            {{ store.isLoading ? 'Cargando…' : `${store.totalRecords.toLocaleString()} registros` }}
                        </span>
                        <button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-pic-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-pic-brand-hover focus:outline-none focus:ring-2 focus:ring-pic-brand-border disabled:opacity-50" @click="handleCreate">
                            <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i> Nuevo cliente
                        </button>
                    </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(240px,1fr)_minmax(180px,240px)_minmax(180px,240px)_auto]">
                    <label class="relative block">
                        <span class="sr-only">Buscar clientes</span>
                        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted" aria-hidden="true"></i>
                        <input v-model="searchTerm" type="search" placeholder="Buscar cliente, ID o ciudad…" class="min-h-10 w-full rounded-lg border border-pic-border bg-pic-muted-surface py-2 pl-9 pr-3 text-sm text-pic-text-main placeholder:text-pic-text-muted focus:border-pic-brand focus:bg-pic-surface focus:outline-none focus:ring-2 focus:ring-pic-brand-border" />
                    </label>
                    <label>
                        <span class="sr-only">Filtrar por canal</span>
                        <select v-model="filterCanal" class="min-h-10 w-full rounded-lg border border-pic-border bg-pic-muted-surface px-3 text-sm text-pic-text-main focus:border-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border">
                            <option value="">Todos los canales</option>
                            <option v-for="canal in store.canales" :key="canal" :value="canal">{{ canal }}</option>
                        </select>
                    </label>
                    <label>
                        <span class="sr-only">Filtrar por gerencia</span>
                        <select v-model="filterGerencia" class="min-h-10 w-full rounded-lg border border-pic-border bg-pic-muted-surface px-3 text-sm text-pic-text-main focus:border-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border">
                            <option value="">Todas las gerencias</option>
                            <option v-for="gerencia in store.gerencias" :key="gerencia" :value="gerencia">{{ gerencia }}</option>
                        </select>
                    </label>
                    <button v-if="filtersActive" type="button" class="min-h-10 rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-bold text-pic-text-muted transition hover:border-pic-brand-border hover:text-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border" @click="clearFilters">
                        <i class="fa-solid fa-xmark mr-1" aria-hidden="true"></i> Limpiar
                    </button>
                </div>
            </div>
        </header>

        <section class="w-full px-4 py-5 sm:px-6 lg:px-10" aria-label="Listado de clientes">
            <div class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
                <div v-if="store.isLoading" class="flex min-h-56 flex-col items-center justify-center gap-3 text-pic-text-muted">
                    <i class="fa-solid fa-circle-notch fa-spin text-xl text-pic-brand" aria-hidden="true"></i>
                    <p class="text-sm font-semibold">Cargando clientes…</p>
                </div>
                <div v-else-if="!store.clients.length" class="flex min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted"><i class="fa-solid fa-store-slash" aria-hidden="true"></i></div>
                    <p class="text-sm font-bold">No hay clientes para mostrar</p>
                    <p class="text-xs text-pic-text-muted">Ajusta los filtros o registra un nuevo cliente.</p>
                </div>
                <template v-else>
                    <div class="hidden overflow-x-auto md:block">
                        <table class="w-full min-w-[900px] border-collapse text-left text-sm">
                            <thead class="border-b border-pic-border bg-pic-muted-surface text-[10px] font-bold uppercase tracking-[0.12em] text-pic-text-muted">
                                <tr><th class="px-4 py-3">Cliente</th><th class="px-3 py-3">ID</th><th class="px-3 py-3">Canal</th><th class="px-3 py-3">Gerencia</th><th class="px-3 py-3">Ruta</th><th class="px-3 py-3">Ubicación</th><th class="px-4 py-3 text-right">Acciones</th></tr>
                            </thead>
                            <tbody class="divide-y divide-pic-border">
                                <tr v-for="client in store.clients" :key="getClientId(client)" class="transition hover:bg-pic-muted-surface/60">
                                    <td class="px-4 py-3"><div class="flex items-center gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-xs font-bold text-pic-brand">{{ initials(client.Nombre) }}</span><span class="max-w-[260px] font-semibold text-pic-text-main">{{ client.Nombre }}</span></div></td>
                                    <td class="px-3 py-3"><span class="rounded-md bg-pic-muted-surface px-1.5 py-1 font-mono text-xs font-semibold text-pic-text-muted">{{ client.clienteid || '—' }}</span></td>
                                    <td class="px-3 py-3"><span v-if="client.Canal" class="inline-flex rounded-md border border-pic-brand-border bg-pic-brand-soft px-2 py-1 text-xs font-semibold text-pic-brand">{{ client.Canal }}</span><span v-else class="text-pic-text-muted">—</span></td>
                                    <td class="px-3 py-3 text-xs font-medium">{{ client.Gerencia || '—' }}</td>
                                    <td class="px-3 py-3 font-mono text-xs font-semibold">{{ client.Ruta || '—' }}</td>
                                    <td class="px-3 py-3 text-xs text-pic-text-muted">{{ [client.Ciudad, client.Estado].filter(Boolean).join(', ') || '—' }}</td>
                                    <td class="px-4 py-3"><div class="flex justify-end gap-1"><button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-pic-text-muted transition hover:bg-pic-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-pic-brand-border" aria-label="Editar cliente" @click="handleEdit(client)"><i class="fa-solid fa-pen text-xs" aria-hidden="true"></i></button><button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-pic-text-muted transition hover:bg-pic-danger hover:text-white focus:outline-none focus:ring-2 focus:ring-pic-brand-border" aria-label="Eliminar cliente" @click="handleDelete(client)"><i class="fa-solid fa-trash text-xs" aria-hidden="true"></i></button></div></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="divide-y divide-pic-border md:hidden">
                        <article v-for="client in store.clients" :key="getClientId(client)" class="p-4">
                            <div class="flex items-start gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-xs font-bold text-pic-brand">{{ initials(client.Nombre) }}</span><div class="min-w-0 flex-1"><h2 class="text-sm font-bold">{{ client.Nombre }}</h2><p class="mt-1 font-mono text-xs text-pic-text-muted">{{ client.clienteid || 'Sin ID' }}</p></div><div class="flex gap-1"><button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-pic-text-muted hover:bg-pic-brand hover:text-white" aria-label="Editar cliente" @click="handleEdit(client)"><i class="fa-solid fa-pen text-xs"></i></button><button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-pic-text-muted hover:bg-pic-danger hover:text-white" aria-label="Eliminar cliente" @click="handleDelete(client)"><i class="fa-solid fa-trash text-xs"></i></button></div></div>
                            <dl class="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"><div><dt class="font-bold uppercase tracking-wide text-pic-text-muted">Canal</dt><dd class="mt-0.5 font-semibold">{{ client.Canal || '—' }}</dd></div><div><dt class="font-bold uppercase tracking-wide text-pic-text-muted">Gerencia</dt><dd class="mt-0.5 font-semibold">{{ client.Gerencia || '—' }}</dd></div><div><dt class="font-bold uppercase tracking-wide text-pic-text-muted">Ruta</dt><dd class="mt-0.5 font-mono font-semibold">{{ client.Ruta || '—' }}</dd></div><div><dt class="font-bold uppercase tracking-wide text-pic-text-muted">Ubicación</dt><dd class="mt-0.5">{{ [client.Ciudad, client.Estado].filter(Boolean).join(', ') || '—' }}</dd></div></dl>
                        </article>
                    </div>
                </template>

                <footer v-if="store.clients.length" class="flex flex-col gap-3 border-t border-pic-border bg-pic-muted-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-xs font-medium text-pic-text-muted">Página <span class="font-mono text-pic-text-main">{{ currentPage }}</span> de <span class="font-mono text-pic-text-main">{{ Math.max(totalPages, 1) }}</span></p>
                    <div class="flex items-center gap-2"><button type="button" class="min-h-8 rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-bold text-pic-text-main disabled:cursor-not-allowed disabled:opacity-40" :disabled="currentPage <= 1" @click="handlePageChange(currentPage - 1)">Anterior</button><button type="button" class="min-h-8 rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-bold text-pic-text-main disabled:cursor-not-allowed disabled:opacity-40" :disabled="currentPage >= totalPages" @click="handlePageChange(currentPage + 1)">Siguiente</button></div>
                </footer>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import { useUserStore } from '@/modules/Users/stores/userStore';
import type { UserFull, UserRole } from '@/modules/Users/types/user.types';
import { StdDataTable, type StdTableColumn } from '@/modules/Shared/components/std';

type TabKey = 'perfil' | 'tiendas' | 'actividad' | 'acceso';

const profileStore = useProfileStore();
const userStore = useUserStore();
const activeTab = ref<TabKey>('perfil');
const storeSearch = ref('');
const storeSortKey = ref('nombre');
const storeSortDirection = ref<'asc' | 'desc'>('asc');
const selectedStore = ref<Record<string, unknown> | null>(null);
const newPassword = ref('');
const passwordError = ref('');
const isSavingPassword = ref(false);

const isPrivilegedUser = computed(() => (profileStore.profile?.accessLevel ?? 0) >= 3);

const tabs = computed(() => {
   const base: { key: TabKey; label: string; icon: string }[] = [
      { key: 'perfil' as const, label: 'Perfil', icon: 'fa-regular fa-user' },
      { key: 'tiendas' as const, label: 'Mis tiendas', icon: 'fa-solid fa-store' },
      { key: 'actividad' as const, label: 'Actividad', icon: 'fa-regular fa-clock' }
   ];

   if (isPrivilegedUser.value) {
      base.push({ key: 'acceso', label: 'Acceso', icon: 'fa-solid fa-key' });
   }

   return base;
});

const currentUser = computed<UserFull | null>(() => {
   const profile = profileStore.profile;
   if (!profile) return null;

   return {
      IdUser: profile.id,
      Usuario: profile.username,
      TipoUser: profile.role as UserRole,
      jefatura: profile.jefatura,
      Gerencia: profile.Gerencia,
      Zona: profile.Zona,
      AccessLevel: profile.accessLevel,
      ServerUser: profile.serverUser,
      Status: profile.presenceStatus === 'offline' ? 'inactive' : 'active',
      LastActivity: profile.lastActivity,
      CreatedAt: '',
      nombre: profile.nombre,
      no_emp: profile.no_emp
   };
});

const roleLabel = computed(() => {
   const labels: Record<string, string> = {
      SuperAdmin: 'Super administrador',
      Admin: 'Administrador',
      Gerente: 'Gerente',
      Jefe: 'Jefe'
   };
   return labels[profileStore.profile?.role || ''] || 'Sin rol asignado';
});

const initials = computed(() => {
   const value = profileStore.profile?.nombre || profileStore.profile?.username || '';
   return value.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'US';
});

const isOnline = computed(() => {
   const lastActivity = profileStore.profile?.lastActivity;
   if (!lastActivity) return false;
   const elapsed = Date.now() - new Date(lastActivity).getTime();
   return elapsed >= 0 && elapsed <= 15 * 60 * 1000;
});

const formatDateTime = (value: string | null | undefined) => {
   if (!value) return 'Sin registro';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return 'Sin registro';
   return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
   }).format(date);
};

const profileItems = computed(() => {
   const profile = profileStore.profile;
   if (!profile) return [];
   return [
      { label: 'Nombre completo', value: profile.nombre || profile.username, icon: 'fa-regular fa-id-card' },
      { label: 'No. de empleado', value: profile.no_emp || 'Sin dato', icon: 'fa-solid fa-hashtag' },
      { label: 'Usuario', value: `@${profile.username}`, icon: 'fa-regular fa-user' },
      { label: 'Servidor / dominio', value: profile.serverUser || 'Sin ID de servidor', icon: 'fa-solid fa-server' }
   ];
});

const organizationItems = computed(() => {
   const profile = profileStore.profile;
   if (!profile) return [];
   return [
      { label: 'Gerencia', value: profile.Gerencia || 'Corporativo', icon: 'fa-solid fa-building' },
      { label: 'Jefatura', value: profile.jefatura || 'Corporativo', icon: 'fa-solid fa-user-tie' },
      { label: 'Zona', value: profile.Zona || 'Corporativo', icon: 'fa-solid fa-location-dot' }
   ];
});

const assignedStores = computed(() => currentUser.value ? userStore.assignedStores[currentUser.value.IdUser] || [] : []);
const isLoadingStores = computed(() => currentUser.value ? userStore.assignedStoresLoading[currentUser.value.IdUser] || false : false);
const assignedStoresError = computed(() => currentUser.value ? userStore.assignedStoresError[currentUser.value.IdUser] || '' : '');
const filteredStores = computed(() => {
   const query = storeSearch.value.trim().toLowerCase();
   if (!query) return assignedStores.value;
   return assignedStores.value.filter(store => [store.matriz, store.Nombre, store.Ruta, store.Zona]
      .some(value => String(value || '').toLowerCase().includes(query)));
});
const storeSummary = computed(() => ({
   stores: assignedStores.value.length,
   matrices: new Set(assignedStores.value.map(store => store.matriz).filter(Boolean)).size,
   routes: new Set(assignedStores.value.map(store => store.Ruta).filter(Boolean)).size
}));
const storeColumns: StdTableColumn[] = [
   { key: 'matriz', label: 'Matriz', sortable: true },
   { key: 'nombre', label: 'Nombre', sortable: true },
   { key: 'ruta', label: 'Ruta', sortable: true },
   { key: 'zona', label: 'Zona', sortable: true }
];
const storeRows = computed<Record<string, unknown>[]>(() => {
   const rows = filteredStores.value.map((store, index) => ({
      id: `${store.matriz || 'sin-matriz'}-${store.Nombre || 'sin-nombre'}-${store.Ruta || 'sin-ruta'}-${index}`,
      matriz: store.matriz || 'Sin matriz',
      nombre: store.Nombre || 'Sin nombre',
      ruta: store.Ruta || 'Sin ruta',
      zona: store.Zona || 'Sin zona'
   }));

   return rows.sort((first, second) => {
      const comparison = String(first[storeSortKey.value] || '').localeCompare(String(second[storeSortKey.value] || ''), 'es-MX');
      return storeSortDirection.value === 'asc' ? comparison : -comparison;
   });
});
const handleStoreSort = (key: string) => {
   if (storeSortKey.value === key) {
      storeSortDirection.value = storeSortDirection.value === 'asc' ? 'desc' : 'asc';
      return;
   }
   storeSortKey.value = key;
   storeSortDirection.value = 'asc';
};
const handleStoreAction = (action: 'view' | 'edit', row: Record<string, unknown>) => {
   if (action === 'view') selectedStore.value = row;
};

const activityItems = computed(() => {
   const profile = profileStore.profile;
   if (!profile) return [];
   return [
      {
         title: isOnline.value ? 'Sesión activa' : 'Última actividad registrada',
         description: formatDateTime(profile.lastActivity),
         icon: isOnline.value ? 'fa-solid fa-circle-check' : 'fa-regular fa-clock',
         tone: isOnline.value ? 'text-pic-success bg-[hsl(var(--pic-success)/0.10)]' : 'text-pic-text-muted bg-pic-muted-surface'
      },
      {
         title: 'Cuenta habilitada',
         description: `Rol: ${roleLabel.value}. Nivel de acceso ${profile.accessLevel}.`,
         icon: 'fa-solid fa-shield-halved',
         tone: 'text-pic-info bg-[hsl(var(--pic-info)/0.10)]'
      },
      {
         title: 'Alcance comercial',
         description: [profile.Gerencia, profile.jefatura, profile.Zona].filter(Boolean).join(' · ') || 'Corporativo',
         icon: 'fa-solid fa-route',
         tone: 'text-pic-brand bg-pic-brand-soft'
      }
   ];
});

watch(activeTab, async tab => {
   if (tab === 'tiendas' && currentUser.value) {
      await userStore.fetchAssignedStores(currentUser.value);
   }
});

const changePassword = async () => {
   if (!currentUser.value || !isPrivilegedUser.value) return;
   if (newPassword.value.length < 4) {
      passwordError.value = 'La nueva contraseña debe tener al menos 4 caracteres.';
      return;
   }

   isSavingPassword.value = true;
   passwordError.value = '';
   try {
      await userStore.changePassword(currentUser.value.IdUser, newPassword.value);
      newPassword.value = '';
   } catch (error: any) {
      passwordError.value = error.response?.data?.message || 'No se pudo actualizar la contraseña.';
   } finally {
      isSavingPassword.value = false;
   }
};

onMounted(() => profileStore.fetchProfile());
</script>

<template>
   <div class="min-h-full bg-pic-background px-4 py-5 text-pic-text-main sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1280px] space-y-5">
         <header class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
            <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
               <div class="flex min-w-0 items-center gap-4">
                  <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pic-brand text-lg font-black text-white shadow-lg shadow-pic-brand/20">
                     {{ initials }}
                     <span class="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-pic-surface" :class="isOnline ? 'bg-pic-success' : 'bg-pic-text-muted'"></span>
                  </div>
                  <div class="min-w-0">
                     <p class="text-[10px] font-black uppercase tracking-widest text-pic-brand">Cuenta personal</p>
                     <h1 class="truncate text-xl font-black tracking-tight text-pic-text-main sm:text-2xl">{{ profileStore.profile?.nombre || 'Mi perfil' }}</h1>
                     <p class="mt-1 truncate text-xs font-semibold text-pic-text-muted">{{ roleLabel }} · {{ profileStore.profile?.Gerencia || 'Sin gerencia asignada' }}</p>
                  </div>
               </div>

               <RouterLink to="/admin/pic" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-pic-brand-border bg-pic-brand-soft px-4 text-xs font-black text-pic-brand transition hover:bg-pic-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-pic-brand-border">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  Abrir Asistente PIC  
               </RouterLink>
            </div>

            <nav class="flex overflow-x-auto border-t border-pic-border px-2" aria-label="Secciones del perfil">
               <button v-for="tab in tabs" :key="tab.key" type="button" class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition" :class="activeTab === tab.key ? 'border-pic-brand bg-pic-brand-soft text-pic-brand' : 'border-transparent text-pic-text-muted hover:bg-pic-muted-surface hover:text-pic-text-main'" @click="activeTab = tab.key">
                  <i :class="tab.icon"></i>{{ tab.label }}
               </button>
            </nav>
         </header>

         <div v-if="profileStore.isLoading && !profileStore.profile" class="flex min-h-[300px] items-center justify-center rounded-xl border border-pic-border bg-pic-surface text-sm font-bold text-pic-text-muted">
            <i class="fa-solid fa-circle-notch fa-spin mr-2 text-pic-brand"></i>Cargando perfil...
         </div>

         <template v-else-if="profileStore.profile">
            <section v-if="activeTab === 'perfil'" class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
               <article class="relative overflow-hidden rounded-xl border border-pic-border bg-pic-surface p-5 shadow-sm sm:p-6">
                  <div class="absolute inset-y-0 left-0 w-1 bg-pic-brand"></div>
                  <div class="pl-1">
                     <p class="text-[10px] font-black uppercase tracking-widest text-pic-brand">Perfil</p>
                     <h2 class="mt-1 text-base font-black text-pic-text-main">Información de la cuenta</h2>
                  </div>
                  <dl class="mt-5 grid gap-3 sm:grid-cols-2">
                     <div v-for="item in profileItems" :key="item.label" class="rounded-lg border border-pic-border bg-pic-muted-surface p-4">
                        <dt class="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-pic-text-muted"><i :class="item.icon" class="text-pic-brand"></i>{{ item.label }}</dt>
                        <dd class="mt-2 break-words text-sm font-black text-pic-text-main">{{ item.value }}</dd>
                     </div>
                  </dl>
               </article>

               <article class="relative overflow-hidden rounded-xl border border-pic-border bg-pic-surface p-5 shadow-sm sm:p-6">
                  <div class="absolute inset-y-0 left-0 w-1 bg-pic-brand"></div>
                  <div class="pl-1"><p class="text-[10px] font-black uppercase tracking-widest text-pic-brand">Estructura</p><h2 class="mt-1 text-base font-black text-pic-text-main">Alcance comercial</h2></div>
                  <dl class="mt-5 space-y-3">
                     <div v-for="item in organizationItems" :key="item.label" class="flex items-center gap-3 rounded-lg border border-pic-border bg-pic-muted-surface p-3.5">
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand"><i :class="item.icon"></i></span>
                        <div class="min-w-0"><dt class="text-[10px] font-black uppercase text-pic-text-muted">{{ item.label }}</dt><dd class="mt-1 truncate text-sm font-black text-pic-text-main">{{ item.value }}</dd></div>
                     </div>
                  </dl>
               </article>
            </section>

            <section v-else-if="activeTab === 'tiendas'" class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
               <div class="flex flex-col gap-4 border-b border-pic-border p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
                  <div><p class="text-[10px] font-black uppercase tracking-widest text-pic-brand">Mis tiendas</p><h2 class="mt-1 text-base font-black text-pic-text-main">Cobertura asignada</h2><p class="mt-1 text-xs font-semibold text-pic-text-muted">Consulta las tiendas disponibles según tu estructura comercial.</p></div>
                  <div class="grid grid-cols-3 gap-2 text-center"><div class="rounded-lg bg-pic-muted-surface px-3 py-2"><b class="block text-lg text-pic-text-main">{{ storeSummary.stores }}</b><span class="text-[9px] font-black uppercase text-pic-text-muted">Tiendas</span></div><div class="rounded-lg bg-pic-muted-surface px-3 py-2"><b class="block text-lg text-pic-text-main">{{ storeSummary.matrices }}</b><span class="text-[9px] font-black uppercase text-pic-text-muted">Matrices</span></div><div class="rounded-lg bg-pic-muted-surface px-3 py-2"><b class="block text-lg text-pic-text-main">{{ storeSummary.routes }}</b><span class="text-[9px] font-black uppercase text-pic-text-muted">Rutas</span></div></div>
               </div>
               <div class="border-b border-pic-border p-4"><label class="relative block max-w-md"><i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i><input v-model="storeSearch" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-sm font-semibold text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" placeholder="Buscar por tienda, matriz, ruta o zona"></label></div>
               <div v-if="assignedStoresError" class="m-4 rounded-lg border border-[hsl(var(--pic-warning)/0.30)] bg-[hsl(var(--pic-warning)/0.10)] p-4 text-sm font-semibold text-pic-warning">{{ assignedStoresError }}</div>
               <StdDataTable
                  v-else
                  class="m-4"
                  :columns="storeColumns"
                  :rows="storeRows"
                  :loading="isLoadingStores"
                  :sort-key="storeSortKey"
                  :sort-direction="storeSortDirection"
                  :actions="['view']"
                  empty-title="Sin tiendas para mostrar"
                  empty-description="No hay coincidencias con la búsqueda actual."
                  @sort="handleStoreSort"
                  @row-action="handleStoreAction"
               />
               <aside v-if="selectedStore" class="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pic-brand-border bg-pic-brand-soft px-4 py-3">
                  <div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-wide text-pic-brand">Tienda seleccionada</p><p class="mt-1 truncate text-sm font-black text-pic-text-main">{{ selectedStore.nombre }} · {{ selectedStore.matriz }}</p><p class="mt-1 text-xs font-semibold text-pic-text-muted">Ruta {{ selectedStore.ruta }} · {{ selectedStore.zona }}</p></div>
                  <button type="button" class="h-8 w-8 rounded-lg text-pic-text-muted transition hover:bg-pic-surface hover:text-pic-brand" aria-label="Cerrar detalle de tienda" @click="selectedStore = null"><i class="fa-solid fa-xmark"></i></button>
               </aside>
            </section>

            <section v-else-if="activeTab === 'actividad'" class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm"><div class="border-b border-pic-border p-5 sm:p-6"><p class="text-[10px] font-black uppercase tracking-widest text-pic-brand">Actividad</p><h2 class="mt-1 text-base font-black text-pic-text-main">Estado de la cuenta</h2></div><ol class="divide-y divide-pic-border"><li v-for="item in activityItems" :key="item.title" class="flex gap-4 p-5 sm:px-6"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="item.tone"><i :class="item.icon"></i></span><div><h3 class="text-sm font-black text-pic-text-main">{{ item.title }}</h3><p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">{{ item.description }}</p></div></li></ol></section>

            <section v-else-if="activeTab === 'acceso' && isPrivilegedUser" class="mx-auto max-w-2xl overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm"><div class="border-b border-pic-border p-5 sm:p-6"><p class="text-[10px] font-black uppercase tracking-widest text-pic-brand">Acceso</p><h2 class="mt-1 text-base font-black text-pic-text-main">Cambiar contraseña</h2><p class="mt-1 text-xs font-semibold text-pic-text-muted">Esta es la única acción editable disponible en tu perfil.</p></div><form class="space-y-4 p-5 sm:p-6" @submit.prevent="changePassword"><label class="block"><span class="text-[10px] font-black uppercase text-pic-text-muted">Nueva contraseña</span><input v-model="newPassword" type="password" autocomplete="new-password" class="mt-2 h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm font-semibold text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" placeholder="Mínimo 4 caracteres"></label><p v-if="passwordError" class="rounded-lg border border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] px-3 py-2 text-xs font-bold text-pic-danger">{{ passwordError }}</p><button type="submit" class="inline-flex h-10 items-center justify-center rounded-lg bg-pic-brand px-4 text-xs font-black text-white transition hover:bg-pic-brand/90 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSavingPassword"><i v-if="isSavingPassword" class="fa-solid fa-circle-notch fa-spin mr-2"></i><i v-else class="fa-solid fa-key mr-2"></i>Actualizar contraseña</button></form></section>
         </template>

         <div v-else class="rounded-xl border border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] p-5 text-sm font-semibold text-pic-danger">No fue posible cargar la información del perfil.</div>
      </div>
   </div>
</template>

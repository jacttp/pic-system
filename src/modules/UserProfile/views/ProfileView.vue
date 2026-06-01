<!-- src/modules/UserProfile/views/ProfileView.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore';
import { useProfileStore } from '../stores/profileStore';
import ProfileCard from '../components/ProfileCard.vue';
import NotificationCenter from '../components/NotificationCenter.vue';
import PendingApprovals from '../components/PendingApprovals.vue';
import BroadcastMessageModal from '@/modules/Users/components/BroadcastMessageModal.vue';

const profileStore = useProfileStore();
const approvalsStore = useApprovalsStore();
const showBroadcastModal = ref(false);

let pollInterval: ReturnType<typeof setInterval> | null = null;

const assignedPendingLabel = computed(() => {
   const count = approvalsStore.assignedPendingCount;
   if (count === 0) return 'Sin pedidos esperando respuesta';
   if (count === 1) return '1 solicitud requiere respuesta';
   return `${count} solicitudes requieren respuesta`;
});

const latestSignal = computed(() => {
   const notification = profileStore.unreadNotifications[0] || profileStore.notifications[0];
   return notification?.title || 'Sin avisos nuevos';
});

onMounted(async () => {
   await Promise.all([
      profileStore.fetchProfile(),
      profileStore.fetchNotifications(),
      approvalsStore.fetchAssignedApprovals(),
      approvalsStore.fetchApprovals(),
   ]);

   // Mantiene fresco el centro de trabajo sin exigir recarga manual.
   pollInterval = setInterval(() => {
      profileStore.fetchNotifications();
      approvalsStore.fetchAssignedApprovals();
   }, 120_000);
});

onUnmounted(() => {
   if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
   }
});
</script>

<template>
   <div class="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1380px] space-y-6">

         <!-- Header operativo -->
         <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
               <div class="px-6 py-6 sm:px-8">
                  <div class="mb-5 flex flex-wrap items-center gap-2">
                     <span class="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                        <i class="fa-solid fa-truck-fast text-[10px]"></i>
                        CPFR
                     </span>
                     <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Centro de gestion
                     </span>
                  </div>

                  <div class="max-w-3xl">
                     <h1 class="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        Perfil operativo
                     </h1>
                     <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                        Revisa solicitudes de aprobacion, avisos relevantes y el estado de tu operacion desde un solo lugar.
                     </p>
                  </div>
               </div>

               <div class="border-t border-slate-200 bg-slate-950 p-5 text-white lg:border-l lg:border-t-0">
                  <div class="grid h-full grid-cols-3 gap-3">
                     <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Por resolver</p>
                        <p class="mt-2 text-3xl font-black text-amber-300">{{ approvalsStore.assignedPendingCount }}</p>
                     </div>
                     <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Enviadas</p>
                        <p class="mt-2 text-3xl font-black text-white">{{ approvalsStore.pendingCount }}</p>
                     </div>
                     <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Avisos</p>
                        <p class="mt-2 text-3xl font-black text-sky-300">{{ profileStore.unreadCount }}</p>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <!-- Resumen de foco -->
         <section class="grid gap-4 md:grid-cols-3">
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
               <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                     <i class="fa-solid fa-clipboard-check text-sm"></i>
                  </div>
                  <div class="min-w-0">
                     <p class="text-[10px] font-black uppercase tracking-widest text-amber-700">Siguiente accion</p>
                     <p class="truncate text-sm font-black text-slate-900">{{ assignedPendingLabel }}</p>
                  </div>
               </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-5 py-4">
               <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                     <i class="fa-solid fa-bell text-sm"></i>
                  </div>
                  <div class="min-w-0">
                     <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ultima senal</p>
                     <p class="truncate text-sm font-black text-slate-800">{{ latestSignal }}</p>
                  </div>
               </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-5 py-4">
               <button
                  @click="showBroadcastModal = true"
                  class="flex h-full min-h-[56px] w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-left text-white transition-all hover:bg-slate-800 active:scale-[0.99]"
               >
                  <span>
                     <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Comms Hub</span>
                     <span class="block text-sm font-black">Nueva transmision</span>
                  </span>
                  <i class="fa-solid fa-paper-plane text-sm text-sky-300"></i>
               </button>
            </div>
         </section>

         <!-- Layout principal -->
         <div class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside class="space-y-6">
               <ProfileCard
                  :profile="profileStore.profile"
                  :loading="profileStore.isLoading"
               />

               <NotificationCenter mode="summary" :max-items="4" />
            </aside>

            <main class="min-w-0">
               <PendingApprovals />
            </main>
         </div>

         <section class="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Proximamente</p>
                  <h2 class="mt-1 text-base font-black text-slate-900">Scorecard de avance comercial</h2>
                  <p class="mt-1 text-sm font-medium text-slate-500">Este espacio queda reservado para metas, avance por zona y reportes clave.</p>
               </div>
               <div class="grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-xl bg-slate-100 px-4 py-3">
                     <p class="text-lg font-black text-slate-400">--</p>
                     <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Meta</p>
                  </div>
                  <div class="rounded-xl bg-slate-100 px-4 py-3">
                     <p class="text-lg font-black text-slate-400">--</p>
                     <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Avance</p>
                  </div>
                  <div class="rounded-xl bg-slate-100 px-4 py-3">
                     <p class="text-lg font-black text-slate-400">--</p>
                     <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Zona</p>
                  </div>
               </div>
            </div>
         </section>
      </div>

      <BroadcastMessageModal
         v-model="showBroadcastModal"
         @sent="profileStore.fetchNotifications()"
      />
   </div>
</template>

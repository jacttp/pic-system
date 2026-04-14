<!-- src/modules/UserProfile/views/ProfileView.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import ProfileCard from '../components/ProfileCard.vue';
import NotificationCenter from '../components/NotificationCenter.vue';
import PendingApprovals from '../components/PendingApprovals.vue';
import BroadcastMessageModal from '@/modules/Users/components/BroadcastMessageModal.vue';

const profileStore = useProfileStore();
const showBroadcastModal = ref(false);

let pollInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
   await Promise.all([
      profileStore.fetchProfile(),
      profileStore.fetchNotifications()
   ]);

   // Polling de notificaciones cada 2 minutos
   pollInterval = setInterval(() => {
      profileStore.fetchNotifications();
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
   <div class="p-6 lg:p-8 max-w-[1200px] mx-auto">

      <!-- Header -->
      <div class="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
         <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
               <i class="fa-solid fa-user-shield text-blue-400"></i>
            </div>
            <div>
               <h1 class="text-3xl font-black text-slate-900 tracking-tight">Mi Perfil</h1>
               <p class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Centro de Control y Presencia</p>
            </div>
         </div>
      </div>

      <!-- Layout Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

         <!-- Columna izquierda (1/3): Identidad y Herramientas -->
         <div class="lg:col-span-1 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both">
            <ProfileCard 
               :profile="profileStore.profile" 
               :loading="profileStore.isLoading" 
            />

            <!-- PIC Comms Hub Widget (Movido a la barra lateral) -->
            <div class="bg-slate-900 rounded-[2rem] p-8 flex flex-col items-center text-center relative overflow-hidden group shadow-2xl shadow-slate-200 transition-all hover:scale-[1.01]">
               <div class="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/20 transition-colors"></div>
               
               <div class="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 mb-6 shadow-inner transition-transform group-hover:rotate-12">
                  <i class="fa-solid fa-paper-plane text-2xl"></i>
               </div>
               
               <h3 class="text-base font-black text-white mb-2 uppercase tracking-wide">Comms Hub</h3>
               <p class="text-[10px] text-slate-400 mb-8 leading-relaxed px-2 font-medium">Transmite avisos globales o locales a usuarios del sistema.</p>
               
               <button 
                  @click="showBroadcastModal = true"
                  class="w-full py-4 bg-white hover:bg-blue-50 text-slate-900 font-extrabold rounded-2xl text-[10px] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
               >
                  <i class="fa-solid fa-bolt text-blue-600"></i> Nueva Transmisión
               </button>
            </div>
         </div>

         <!-- Columna derecha (2/3): Centro Operativo (PURA FILA / NO COLUMNAS) -->
         <div class="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-300 fill-mode-both">
            
            <!-- Fila 1: Notificaciones (Ancho Completo) -->
            <div class="w-full">
               <NotificationCenter mode="full" />
            </div>

            <!-- Fila 2: Aprobaciones (Ancho Completo) -->
            <div class="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
               <PendingApprovals />
            </div>

            <!-- Modal de envío de mensajes -->
            <BroadcastMessageModal 
               v-model="showBroadcastModal" 
               @sent="profileStore.fetchNotifications()"
            />
         </div>
      </div>
   </div>
</template>

<!-- src/modules/UserProfile/views/ProfileView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import ProfileCard from '../components/ProfileCard.vue';
import NotificationCenter from '../components/NotificationCenter.vue';
import PendingApprovals from '../components/PendingApprovals.vue';
import PicChatHistory from '../components/PicChatHistory.vue';

const profileStore = useProfileStore();

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
      <div class="mb-6">
         <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-user-circle text-indigo-500"></i>
            Mi Perfil
         </h1>
         <p class="text-slate-500 text-sm mt-1">Gestiona tu perfil, presencia y notificaciones.</p>
      </div>

      <!-- Layout 2 columnas -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

         <!-- Columna izquierda (1/3) -->
         <div class="lg:col-span-1 space-y-6">
            <ProfileCard 
               :profile="profileStore.profile" 
               :loading="profileStore.isLoading" 
            />
         </div>

         <!-- Columna derecha (2/3) -->
         <div class="lg:col-span-2 space-y-6">
            <NotificationCenter mode="full" />
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
               <PendingApprovals />
               <PicChatHistory />
            </div>
         </div>
      </div>
   </div>
</template>

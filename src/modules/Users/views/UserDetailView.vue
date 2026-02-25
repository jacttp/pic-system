<!-- src/modules/Users/views/UserDetailView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { ROLE_LEVELS } from '@/modules/Setup/types/setupTypes';
import UserStatusBadge from '../components/UserStatusBadge.vue';
import UserForm from '../components/UserForm.vue';
import UserPermissionsForm from '../components/UserPermissionsForm.vue';
import BroadcastMessageModal from '../components/BroadcastMessageModal.vue';
import { ROLE_OPTIONS } from '../types/user.types';
import type { UserFull } from '../types/user.types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();

const showEditModal = ref(false);
const showPermissionsModal = ref(false);
const showMessageModal = ref(false);

const userId = computed(() => Number(route.params.id));

const user = computed<UserFull | undefined>(() => {
   return userStore.getUserById(userId.value);
});

const currentUserLevel = computed(() => {
   return authStore.user?.accessLevel || ROLE_LEVELS[authStore.user?.role || 'User'] || 1;
});
const canManage = computed(() => currentUserLevel.value >= 3);

// Labels de rol
const roleLabel = computed(() => {
   if (!user.value) return '';
   const opt = ROLE_OPTIONS.find(r => r.value === user.value!.TipoUser);
   return opt?.label || user.value.TipoUser;
});

// Formateo de fechas
const formatDate = (dateStr: string | null) => {
   if (!dateStr) return '—';
   return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
   });
};

const formatRelative = (dateStr: string | null) => {
   if (!dateStr) return 'Sin actividad registrada';
   const d = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - d.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   if (diffMins < 1) return 'Justo ahora';
   if (diffMins < 60) return `Hace ${diffMins} minutos`;
   const diffHours = Math.floor(diffMins / 60);
   if (diffHours < 24) return `Hace ${diffHours} horas`;
   const diffDays = Math.floor(diffHours / 24);
   return `Hace ${diffDays} días`;
};

onMounted(async () => {
   if (userStore.users.length === 0) {
      await userStore.fetchUsers();
   }
});

// Handlers
const handleBlock = async () => {
   if (!user.value) return;
   const currentlyBlocked = user.value.Status === 'blocked';
   const action = currentlyBlocked ? 'desbloquear' : 'bloquear';
   if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} al usuario "${user.value.Usuario}"?`)) return;
   await userStore.toggleBlock(user.value.IdUser, currentlyBlocked);
};

const handleDelete = async () => {
   if (!user.value) return;
   if (!confirm(`¿Eliminar al usuario "${user.value.Usuario}"? Esta acción no se puede deshacer.`)) return;
   await userStore.deleteUser(user.value.IdUser);
   router.push({ name: 'user-management' });
};

const handleUserSaved = () => {
   userStore.fetchUsers();
};

const goBack = () => {
   router.push({ name: 'user-management' });
};
</script>

<template>
   <div class="p-6 lg:p-8 max-w-4xl mx-auto">
      
      <!-- Back button -->
      <button 
         @click="goBack" 
         class="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors"
      >
         <i class="fa-solid fa-arrow-left"></i> Volver a usuarios
      </button>

      <!-- Loading -->
      <div v-if="userStore.loading && !user" class="flex items-center justify-center py-20">
         <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-500"></i>
      </div>

      <!-- Not found -->
      <div v-else-if="!user" class="text-center py-20">
         <i class="fa-solid fa-user-slash text-4xl text-slate-300 mb-4"></i>
         <p class="text-slate-500">Usuario no encontrado</p>
         <button @click="goBack" class="mt-4 text-sm text-brand-600 hover:underline">Volver al listado</button>
      </div>

      <!-- User detail -->
      <template v-else>
         <!-- Header con avatar y acciones -->
         <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <!-- Banner gradient -->
            <div class="h-24 bg-gradient-to-r from-purple-500 via-brand-500 to-blue-500"></div>
            
            <div class="px-6 pb-6 -mt-10">
               <div class="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <!-- Avatar -->
                  <div class="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-white text-2xl font-bold">
                     {{ user.Usuario.substring(0, 2).toUpperCase() }}
                  </div>
                  
                  <!-- Info -->
                  <div class="flex-1 pt-2">
                     <div class="flex items-center gap-3 flex-wrap">
                        <h1 class="text-xl font-bold text-slate-800">{{ user.Usuario }}</h1>
                        <UserStatusBadge :status="user.Status || 'active'" />
                     </div>
                     <p v-if="user.ServerUser" class="text-sm text-slate-400 font-mono mt-1">{{ user.ServerUser }}</p>
                  </div>

                  <!-- Acciones -->
                  <div v-if="canManage" class="flex items-center gap-2 flex-wrap">
                     <button @click="showEditModal = true" class="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                        <i class="fa-solid fa-pen-to-square text-xs"></i> Editar
                     </button>
                     <button @click="showPermissionsModal = true" class="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1.5">
                        <i class="fa-solid fa-key text-xs"></i> Permisos
                     </button>
                     <button @click="showMessageModal = true" class="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                        <i class="fa-solid fa-paper-plane text-xs"></i> Mensaje
                     </button>
                     <button 
                        @click="handleBlock"
                        class="px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                        :class="user.Status === 'blocked' 
                           ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' 
                           : 'text-orange-700 bg-orange-50 hover:bg-orange-100'"
                     >
                        <i :class="user.Status === 'blocked' ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'" class="text-xs"></i>
                        {{ user.Status === 'blocked' ? 'Desbloquear' : 'Bloquear' }}
                     </button>
                     <button @click="handleDelete" class="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5">
                        <i class="fa-solid fa-trash-can text-xs"></i> Eliminar
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <!-- Grid de info -->
         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Info básica -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Información General</h3>
               <div class="space-y-4">
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">ID</span>
                     <span class="text-sm font-mono text-slate-700">{{ user.IdUser }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Rol</span>
                     <span class="text-sm font-semibold text-slate-700">{{ roleLabel }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Nivel de acceso</span>
                     <div class="flex items-center gap-1">
                        <template v-for="i in 4" :key="i">
                           <div 
                              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                              :class="i <= (user.AccessLevel || 1)
                                 ? 'bg-purple-600 text-white' 
                                 : 'bg-purple-100 text-purple-300'"
                           >
                              {{ i }}
                           </div>
                        </template>
                     </div>
                  </div>
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Zona</span>
                     <span class="text-sm text-slate-700">{{ user.Zona }}</span>
                  </div>
                  <div v-if="user.ServerUser" class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Server User</span>
                     <span class="text-sm font-mono text-slate-600">{{ user.ServerUser }}</span>
                  </div>
               </div>
            </div>

            <!-- Actividad -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Actividad</h3>
               <div class="space-y-4">
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Última actividad</span>
                     <div class="text-right">
                        <p class="text-sm font-medium text-slate-700">{{ formatRelative(user.LastActivity) }}</p>
                        <p class="text-xs text-slate-400">{{ formatDate(user.LastActivity) }}</p>
                     </div>
                  </div>
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Creado</span>
                     <span class="text-sm text-slate-700">{{ formatDate(user.CreatedAt) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                     <span class="text-sm text-slate-500">Estado</span>
                     <UserStatusBadge :status="user.Status || 'active'" />
                  </div>
               </div>
            </div>
         </div>
      </template>

      <!-- Modals -->
      <UserForm 
         v-model="showEditModal" 
         :user-to-edit="user || null"
         @saved="handleUserSaved" 
      />

      <UserPermissionsForm
         v-model="showPermissionsModal"
         :user="user || null"
         @saved="handleUserSaved"
      />

      <BroadcastMessageModal
         v-model="showMessageModal"
         mode="single"
         :target-user="user || null"
      />
   </div>
</template>

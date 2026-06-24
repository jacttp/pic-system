<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { useProfileStore } from '@/modules/UserProfile/stores/profileStore';
import { useRouter, useRoute } from 'vue-router';
import NotificationCenter from '@/modules/UserProfile/components/NotificationCenter.vue';
import coronaLogo from '@/assets/logo.png';

const SIDEBAR_COLLAPSE_KEY = 'pic_admin_sidebar_collapsed';

const auth = useAuthStore();
const setupStore = useSetupStore();
const profileStore = useProfileStore();
const router = useRouter();
const route = useRoute();

const isCollapsed = ref(false);
const showNotifDropdown = ref(false);
const showUserMenu = ref(false);
const showMobileSidebar = ref(false);

let notifPoll: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
   isCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true';
   await setupStore.fetchModules();
   setupStore.fetchHubConfig();
   profileStore.fetchProfile();
   profileStore.fetchNotifications();
   notifPoll = setInterval(() => {
      profileStore.fetchNotifications();
   }, 120_000);
});

onUnmounted(() => {
   if (notifPoll) clearInterval(notifPoll);
});

const handleLogout = () => {
   showUserMenu.value = false;
   auth.logout();
};

const isActive = (path: string) => {
   if (path === '/') return route.path === '/';
   return route.path.startsWith(path);
};

const closeFloatingMenus = () => {
   showNotifDropdown.value = false;
   showUserMenu.value = false;
};

const toggleNotifications = () => {
   showNotifDropdown.value = !showNotifDropdown.value;
   showUserMenu.value = false;
   if (showNotifDropdown.value) {
      profileStore.fetchNotifications();
   }
};

const toggleUserMenu = () => {
   showUserMenu.value = !showUserMenu.value;
   showNotifDropdown.value = false;
};

const toggleSidebar = () => {
   isCollapsed.value = !isCollapsed.value;
   localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(isCollapsed.value));
};

const goToProfile = () => {
   showUserMenu.value = false;
   showMobileSidebar.value = false;
   router.push({ name: 'user-profile' });
};

const goToSetup = () => {
   showUserMenu.value = false;
   router.push({ name: 'setup' });
};

const displayName = computed(() => profileStore.profile?.nombre || auth.user?.nombre || auth.user?.username || 'Usuario');
const displayUser = computed(() => auth.user?.username || '');
const displayRole = computed(() => auth.user?.role || 'Usuario');
const presenceLabel = computed(() => {
   const status = profileStore.profile?.presenceStatus;
   if (status === 'online') return 'Activo';
   if (status === 'busy') return 'Ocupado';
   return 'Sin conexion';
});

const userInitials = computed(() => {
   const name = displayName.value || 'SU';
   return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'SU';
});
</script>

<template>
   <div class="flex h-screen flex-col overflow-hidden bg-slate-50">
      <header class="relative z-[120] flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-5 lg:px-6">
         <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 md:hidden"
            title="Abrir menu"
            @click="showMobileSidebar = true"
         >
            <i class="fa-solid fa-bars text-lg"></i>
         </button>

         <router-link
            to="/"
            class="flex min-w-0 shrink-0 items-center gap-3 rounded-lg px-1 py-1 transition hover:bg-red-50/30"
            @click="closeFloatingMenus"
         >
            <img :src="coronaLogo" alt="Corona" class="h-9 w-auto object-contain sm:h-10" />
            <span class="hidden text-base font-black tracking-tight text-slate-900 sm:block">PIC System</span>
         </router-link>

         <div class="hidden flex-1 justify-center lg:flex">
            <label class="relative w-full max-w-2xl">
               <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
               <input
                  type="search"
                  aria-label="Buscar en PIC System"
                  placeholder="Buscar modulos, reportes o datos..."
                  class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-20 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
               />
               <span class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-400">Ctrl + K</span>
            </label>
         </div>

         <div class="ml-auto flex items-center gap-2">
            <button
               type="button"
               class="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50/70 hover:text-red-700 focus:outline-none"
               :class="showNotifDropdown ? 'bg-red-50 text-red-700' : ''"
               title="Notificaciones"
               @click="toggleNotifications"
            >
               <i class="fa-solid fa-bell text-base"></i>
               <span
                  v-if="profileStore.unreadCount > 0"
                  class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm"
               >
                  {{ profileStore.unreadCount > 9 ? '9+' : profileStore.unreadCount }}
               </span>
            </button>

            <div>
               <button
                  type="button"
                  class="flex items-center gap-3 rounded-lg border border-transparent px-1.5 py-1.5 transition hover:border-red-100 hover:bg-red-50/30"
                  :class="showUserMenu ? 'border-red-100 bg-red-50/30' : ''"
                  title="Menu de usuario"
                  @click="toggleUserMenu"
               >
                  <span class="hidden text-right xl:block">
                     <span class="block max-w-40 truncate text-xs font-bold leading-tight text-slate-700">{{ displayName }}</span>
                     <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ displayRole }}</span>
                  </span>
                  <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-sm font-black text-white shadow-sm shadow-red-100">
                     {{ userInitials }}
                     <span
                        class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                        :class="{
                           'bg-emerald-500': profileStore.profile?.presenceStatus === 'online',
                           'bg-amber-500': profileStore.profile?.presenceStatus === 'busy',
                           'bg-slate-400': !profileStore.profile || profileStore.profile?.presenceStatus === 'offline'
                        }"
                     ></span>
                  </span>
                  <i class="hidden fa-solid fa-chevron-down text-[10px] text-slate-400 sm:block"></i>
               </button>
            </div>
         </div>
      </header>

      <transition name="header-panel">
         <div
            v-if="showNotifDropdown || showUserMenu"
            class="fixed right-3 top-16 z-[110] w-[min(400px,calc(100vw-1.5rem))] sm:right-5"
         >
            <NotificationCenter
               v-if="showNotifDropdown"
               mode="dropdown"
               :max-items="8"
               @navigate="showNotifDropdown = false"
            />

            <div
               v-else
               class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100"
            >
               <div class="relative border-b border-slate-100 px-4 py-4">
                  <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
                  <div class="flex items-start gap-3 pl-1">
                     <span class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-600 text-sm font-black text-white shadow-sm shadow-red-100">
                        {{ userInitials }}
                        <span
                           class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                           :class="{
                              'bg-emerald-500': profileStore.profile?.presenceStatus === 'online',
                              'bg-amber-500': profileStore.profile?.presenceStatus === 'busy',
                              'bg-slate-400': !profileStore.profile || profileStore.profile?.presenceStatus === 'offline'
                           }"
                        ></span>
                     </span>
                     <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-black uppercase text-red-600">Cuenta</p>
                        <p class="truncate text-sm font-black text-slate-900">{{ displayName }}</p>
                        <p class="mt-0.5 truncate text-xs font-semibold text-slate-500">{{ displayUser }}</p>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                           <span class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase leading-none text-slate-500">
                              {{ displayRole }}
                           </span>
                           <span class="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase leading-none text-red-700">
                              {{ presenceLabel }}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div class="bg-slate-50/50 p-2.5">
                  <button
                     type="button"
                     class="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-red-100 hover:bg-red-50/20"
                     @click="goToProfile"
                  >
                     <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-red-50 group-hover:text-red-700">
                        <i class="fa-solid fa-user text-sm"></i>
                     </span>
                     <span class="min-w-0 flex-1">
                        <span class="block text-sm font-black leading-5 text-slate-800 group-hover:text-red-700">Mi perfil</span>
                        <span class="block truncate text-xs font-semibold leading-4 text-slate-500">Datos personales y preferencias</span>
                     </span>
                     <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 transition group-hover:text-red-600"></i>
                  </button>
                  <button
                     v-if="auth.isAdmin"
                     type="button"
                     class="group mt-2 flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-red-100 hover:bg-red-50/20"
                     @click="goToSetup"
                  >
                     <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-red-50 group-hover:text-red-700">
                        <i class="fa-solid fa-sliders text-sm"></i>
                     </span>
                     <span class="min-w-0 flex-1">
                        <span class="block text-sm font-black leading-5 text-slate-800 group-hover:text-red-700">Configuracion</span>
                        <span class="block truncate text-xs font-semibold leading-4 text-slate-500">Modulos, permisos y visibilidad</span>
                     </span>
                     <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 transition group-hover:text-red-600"></i>
                  </button>
               </div>

               <div class="border-t border-slate-100 bg-white p-2.5">
                  <button
                     type="button"
                     class="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-xs font-black uppercase text-white transition hover:bg-red-700"
                     @click="handleLogout"
                  >
                     <i class="fa-solid fa-right-from-bracket"></i>
                     Cerrar sesion
                  </button>
               </div>
            </div>
         </div>
      </transition>

      <div
         v-if="showNotifDropdown || showUserMenu"
         class="fixed inset-0 z-[100]"
         @click="closeFloatingMenus"
      ></div>

      <transition name="mobile-sidebar">
         <div v-if="showMobileSidebar" class="fixed inset-0 z-[130] md:hidden">
            <div class="absolute inset-0 bg-slate-900/40" @click="showMobileSidebar = false"></div>
            <aside class="relative flex h-full w-[min(84vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl">
               <div class="flex h-16 items-center justify-between border-b border-slate-100 px-4">
                  <router-link to="/" class="flex items-center gap-3" @click="showMobileSidebar = false">
                     <img :src="coronaLogo" alt="Corona" class="h-9 w-auto object-contain" />
                     <span class="text-base font-black text-slate-900">PIC System</span>
                  </router-link>
                  <button
                     type="button"
                     class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                     title="Cerrar menu"
                     @click="showMobileSidebar = false"
                  >
                     <i class="fa-solid fa-xmark text-lg"></i>
                  </button>
               </div>

               <nav class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
                  <div v-if="setupStore.isLoading" class="space-y-4 p-2">
                     <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="mb-2 h-3 w-20 rounded bg-slate-100"></div>
                        <div class="h-10 rounded-lg bg-slate-100"></div>
                        <div class="mt-1 h-10 rounded-lg bg-slate-100"></div>
                     </div>
                  </div>

                  <template v-else v-for="(modules, category) in setupStore.groupedMenu" :key="category">
                     <p class="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 first:mt-2">
                        {{ category }}
                     </p>
                     <router-link
                        v-for="mod in modules"
                        :key="mod.ModuleId"
                        :to="mod.Route"
                        class="flex items-center gap-3 rounded-lg px-4 py-2.5 font-medium transition-all"
                        :class="isActive(mod.Route) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                        @click="showMobileSidebar = false"
                     >
                        <i :class="[mod.Icon, 'w-5 text-center text-lg']"></i>
                        <span class="whitespace-nowrap">{{ mod.Label }}</span>
                     </router-link>
                  </template>
               </nav>
            </aside>
         </div>
      </transition>

      <div class="flex min-h-0 flex-1">
         <aside
            class="relative z-40 hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out md:flex"
            :class="isCollapsed ? 'w-20' : 'w-64'"
         >
            <div
               class="flex h-12 shrink-0 items-center border-b border-slate-100 px-3"
               :class="isCollapsed ? 'justify-center' : 'justify-end'"
            >
               <button
                  type="button"
                  class="group flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm shadow-slate-100 transition hover:border-red-100 hover:bg-red-50/40 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-50"
                  :title="isCollapsed ? 'Expandir menu' : 'Contraer menu'"
                  :aria-label="isCollapsed ? 'Expandir menu lateral' : 'Contraer menu lateral'"
                  :aria-pressed="isCollapsed"
                  @click="toggleSidebar"
               >
                  <i
                     class="fa-solid text-[11px] transition-transform group-hover:scale-110"
                     :class="isCollapsed ? 'fa-angles-right' : 'fa-angles-left'"
                  ></i>
               </button>
            </div>

            <nav class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
               <div v-if="setupStore.isLoading" class="space-y-4 p-2">
                  <div v-for="i in 3" :key="i" class="animate-pulse">
                     <div v-if="!isCollapsed" class="mb-2 h-3 w-20 rounded bg-slate-100"></div>
                     <div class="h-10 rounded-lg bg-slate-100"></div>
                     <div class="mt-1 h-10 rounded-lg bg-slate-100"></div>
                  </div>
               </div>

               <template v-else v-for="(modules, category) in setupStore.groupedMenu" :key="category">
                  <p v-if="!isCollapsed" class="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 fade-in first:mt-2">
                     {{ category }}
                  </p>
                  <div v-else class="mx-2 my-4 h-px bg-slate-100"></div>

                  <router-link
                     v-for="mod in modules"
                     :key="mod.ModuleId"
                     :to="mod.Route"
                     class="group relative flex items-center gap-3 rounded-lg py-2.5 font-medium transition-all"
                     :class="[
                        isActive(mod.Route) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                     ]"
                  >
                     <i :class="[mod.Icon, 'w-5 text-center text-lg']"></i>
                     <span v-show="!isCollapsed" class="whitespace-nowrap">{{ mod.Label }}</span>
                     <div v-if="isCollapsed" class="tooltip">{{ mod.Label }}</div>
                  </router-link>
               </template>
            </nav>
         </aside>

         <main class="flex min-w-0 flex-1 flex-col">
            <section class="min-h-0 flex-1 overflow-y-auto">
               <router-view></router-view>
            </section>
         </main>
      </div>
   </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

.fade-in {
   animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
   from { opacity: 0; }
   to { opacity: 1; }
}

.tooltip {
   position: absolute;
   left: 100%;
   top: 50%;
   transform: translateY(-50%);
   margin-left: 10px;
   background-color: #1e293b;
   color: white;
   font-size: 0.75rem;
   padding: 0.25rem 0.5rem;
   border-radius: 0.25rem;
   opacity: 0;
   pointer-events: none;
   transition: opacity 0.2s;
   white-space: nowrap;
   z-index: 100;
   box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.group:hover .tooltip {
   opacity: 1;
}

.header-panel-enter-active,
.header-panel-leave-active {
   transition: opacity 0.16s ease, transform 0.16s ease;
}

.header-panel-enter-from,
.header-panel-leave-to {
   opacity: 0;
   transform: translateY(-6px);
}

.mobile-sidebar-enter-active,
.mobile-sidebar-leave-active {
   transition: opacity 0.18s ease;
}

.mobile-sidebar-enter-from,
.mobile-sidebar-leave-to {
   opacity: 0;
}

.mobile-sidebar-enter-active aside,
.mobile-sidebar-leave-active aside {
   transition: transform 0.18s ease;
}

.mobile-sidebar-enter-from aside,
.mobile-sidebar-leave-to aside {
   transform: translateX(-100%);
}
</style>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { useProfileStore } from '@/modules/UserProfile/stores/profileStore';
import { useUiThemeStore } from '@/modules/Shared/stores/uiThemeStore';
import { useRouter, useRoute } from 'vue-router';
import NotificationCenter from '@/modules/UserProfile/components/NotificationCenter.vue';
import coronaLogo from '@/assets/logo.png';
import coronaLogoMobile from '@/assets/logo_movil.png';

const SIDEBAR_COLLAPSE_KEY = 'pic_admin_sidebar_collapsed';
const SIDEBAR_CATEGORY_COLLAPSE_KEY = 'pic_admin_sidebar_category_collapsed';

const auth = useAuthStore();
const setupStore = useSetupStore();
const profileStore = useProfileStore();
const uiThemeStore = useUiThemeStore();
const router = useRouter();
const route = useRoute();

const isCollapsed = ref(false);
const showNotifDropdown = ref(false);
const showUserMenu = ref(false);
const showMobileSidebar = ref(false);
const collapsedSidebarCategories = ref<Record<string, boolean>>({});

let notifPoll: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
   isCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true';
   loadSidebarCategoryState();
   uiThemeStore.loadThemeCatalog();
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

const loadSidebarCategoryState = () => {
   try {
      const storedState = localStorage.getItem(SIDEBAR_CATEGORY_COLLAPSE_KEY);
      collapsedSidebarCategories.value = storedState ? JSON.parse(storedState) : {};
   } catch {
      collapsedSidebarCategories.value = {};
   }
};

const persistSidebarCategoryState = () => {
   localStorage.setItem(SIDEBAR_CATEGORY_COLLAPSE_KEY, JSON.stringify(collapsedSidebarCategories.value));
};

const isSidebarCategoryCollapsed = (category: string) => Boolean(collapsedSidebarCategories.value[category]);

const toggleSidebarCategory = (category: string) => {
   collapsedSidebarCategories.value = {
      ...collapsedSidebarCategories.value,
      [category]: !isSidebarCategoryCollapsed(category),
   };
   persistSidebarCategoryState();
};

const categoryHasActiveModule = (modules: Array<{ Route: string }>) => modules.some(mod => isActive(mod.Route));

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

const sidebarLogo = computed(() => isCollapsed.value ? coronaLogoMobile : coronaLogo);
</script>

<template>
   <div class="flex h-screen overflow-hidden bg-pic-background text-pic-text-main">
      <aside
         class="relative z-40 hidden shrink-0 flex-col border-r border-white/10 bg-pic-nav text-pic-nav-text shadow-2xl transition-all duration-300 ease-in-out md:flex"
         :class="isCollapsed ? 'w-20' : 'w-64'"
      >
         <div class="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-3" :class="isCollapsed ? 'justify-center' : 'justify-between'">
            <button
               v-if="isCollapsed"
               type="button"
               class="sidebar-logo-toggle group relative flex h-12 w-12 items-center justify-center rounded-xl transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-white/10"
               title="Expandir menu"
               aria-label="Expandir menu lateral"
               :aria-pressed="isCollapsed"
               @click="toggleSidebar"
            >
               <transition name="sidebar-logo" mode="out-in">
                  <img
                     key="mobile-logo"
                     :src="sidebarLogo"
                     alt="Corona"
                     class="sidebar-logo h-9 w-9 object-contain transition duration-200 group-hover:scale-95 group-hover:opacity-25"
                  />
               </transition>
               <span class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl text-white opacity-0 transition duration-200 group-hover:opacity-100">
                  <i class="fa-solid fa-angles-right text-sm"></i>
               </span>
            </button>

            <router-link
               v-else
               to="/"
               class="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 transition hover:bg-white/5"
               @click="closeFloatingMenus"
            >
               <transition name="sidebar-logo" mode="out-in">
                  <img
                     key="full-logo"
                     :src="coronaLogo"
                     alt="Corona"
                     class="sidebar-logo h-9 w-auto max-w-24 object-contain"
                  />
               </transition>
               <span v-show="!isCollapsed" class="truncate text-base font-black tracking-tight text-white">PIC System</span>
            </router-link>
            <button
               v-if="!isCollapsed"
               type="button"
               class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-pic-nav-text-muted transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/10"
               :title="isCollapsed ? 'Expandir menu' : 'Contraer menu'"
               :aria-label="isCollapsed ? 'Expandir menu lateral' : 'Contraer menu lateral'"
               :aria-pressed="isCollapsed"
               @click="toggleSidebar"
            >
               <i class="fa-solid text-[11px]" :class="isCollapsed ? 'fa-angles-right' : 'fa-angles-left'"></i>
            </button>
         </div>

         <nav class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar nav-scrollbar">
            <div v-if="setupStore.isLoading" class="space-y-4 p-2">
               <div v-for="i in 3" :key="i" class="animate-pulse">
                  <div v-if="!isCollapsed" class="mb-2 h-3 w-20 rounded bg-white/10"></div>
                  <div class="h-10 rounded-lg bg-white/10"></div>
                  <div class="mt-1 h-10 rounded-lg bg-white/10"></div>
               </div>
            </div>

            <template v-else v-for="(modules, category) in setupStore.groupedMenu" :key="category">
               <button
                  v-if="!isCollapsed"
                  type="button"
                  class="group mb-2 mt-5 flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-pic-nav-text-muted transition hover:bg-white/5 hover:text-white first:mt-1"
                  :class="categoryHasActiveModule(modules) ? 'text-white' : ''"
                  :aria-expanded="!isSidebarCategoryCollapsed(String(category))"
                  @click="toggleSidebarCategory(String(category))"
               >
                  <span class="min-w-0 flex-1 truncate">{{ category }}</span>
                  <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] leading-none text-pic-nav-text-muted group-hover:text-white">
                     {{ modules.length }}
                  </span>
                  <i
                     class="fa-solid fa-chevron-down text-[9px] transition-transform"
                     :class="isSidebarCategoryCollapsed(String(category)) ? '-rotate-90' : 'rotate-0'"
                  ></i>
               </button>
               <div v-else class="mx-2 my-4 h-px bg-white/10"></div>

               <div v-show="isCollapsed || !isSidebarCategoryCollapsed(String(category))" class="space-y-1">
                  <router-link
                     v-for="mod in modules"
                     :key="mod.ModuleId"
                     :to="mod.Route"
                     class="group relative flex h-10 items-center gap-3 rounded-lg text-sm font-bold transition-all"
                     :class="[
                        isActive(mod.Route)
                           ? 'bg-pic-brand text-white shadow-lg shadow-black/15'
                           : 'text-pic-nav-text-muted hover:bg-white/10 hover:text-white',
                        isCollapsed ? 'justify-center px-0' : 'px-3'
                     ]"
                  >
                     <i :class="[mod.Icon, 'w-5 text-center text-base']"></i>
                     <span v-show="!isCollapsed" class="truncate">{{ mod.Label }}</span>
                     <div v-if="isCollapsed" class="tooltip">{{ mod.Label }}</div>
                  </router-link>
               </div>
            </template>
         </nav>

      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
         <header class="relative z-[120] flex h-[72px] shrink-0 items-center gap-2 border-b border-pic-border bg-white/95 px-4 shadow-sm shadow-slate-200/50 backdrop-blur sm:h-16 sm:px-5 lg:px-6">
            <button
               type="button"
               class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-pic-text-muted transition hover:bg-pic-brand-soft hover:text-pic-brand md:hidden"
               title="Abrir menu"
               @click="showMobileSidebar = true"
            >
               <i class="fa-solid fa-bars text-xl"></i>
            </button>

            <router-link to="/" class="flex min-w-0 shrink-0 items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-pic-brand-soft md:hidden" @click="closeFloatingMenus">
               <img :src="coronaLogo" alt="Corona" class="h-9 w-auto object-contain" />
               <span class="text-base font-black tracking-tight text-pic-text-main">PIC System</span>
            </router-link>

            <div class="hidden flex-1 justify-center lg:flex">
               <label class="relative w-full max-w-2xl">
                  <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                  <input
                     type="search"
                     aria-label="Buscar en PIC System"
                     placeholder="Buscar modulos, reportes o datos..."
                     class="h-10 w-full rounded-lg border border-pic-border bg-white pl-11 pr-20 text-sm font-semibold text-pic-text-main shadow-sm outline-none transition placeholder:text-slate-400 focus:border-pic-brand-border focus:ring-4 focus:ring-pic-brand-border/60"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-pic-border bg-pic-muted-surface px-2 py-1 text-[11px] font-bold text-pic-text-muted">Ctrl + K</span>
               </label>
            </div>

            <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
               <button
                  type="button"
                  class="relative flex h-10 w-10 items-center justify-center rounded-lg text-pic-text-muted transition hover:bg-pic-brand-soft hover:text-pic-brand focus:outline-none"
                  :class="showNotifDropdown ? 'bg-pic-brand-soft text-pic-brand' : ''"
                  title="Notificaciones"
                  @click="toggleNotifications"
               >
                  <i class="fa-solid fa-bell text-base"></i>
                  <span
                     v-if="profileStore.unreadCount > 0"
                     class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pic-brand px-1 text-[10px] font-bold text-white shadow-sm"
                  >
                     {{ profileStore.unreadCount > 9 ? '9+' : profileStore.unreadCount }}
                  </span>
               </button>

               <div>
                  <button
                     type="button"
                     class="flex items-center gap-2 rounded-full border border-transparent px-1 py-1 transition hover:border-pic-brand-border hover:bg-pic-brand-soft sm:gap-3 sm:rounded-lg sm:px-1.5 sm:py-1.5"
                     :class="showUserMenu ? 'border-pic-brand-border bg-pic-brand-soft' : ''"
                     title="Menu de usuario"
                     @click="toggleUserMenu"
                  >
                     <span class="hidden text-right xl:block">
                        <span class="block max-w-40 truncate text-xs font-bold leading-tight text-pic-text-main">{{ displayName }}</span>
                        <span class="block text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">{{ displayRole }}</span>
                     </span>
                     <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pic-brand text-sm font-black text-white shadow-sm shadow-pic-brand/20 sm:rounded-lg">
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
                     <i class="hidden fa-solid fa-chevron-down text-[10px] text-pic-text-muted sm:block"></i>
                  </button>
               </div>
            </div>
         </header>

         <main class="flex min-h-0 min-w-0 flex-1 flex-col">
            <section class="min-h-0 flex-1 overflow-y-auto">
               <router-view></router-view>
            </section>
         </main>
      </div>

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

            <div v-else class="overflow-hidden rounded-xl border border-pic-border bg-white shadow-xl shadow-slate-200/70">
               <div class="relative border-b border-slate-100 px-4 py-4">
                  <div class="absolute inset-y-0 left-0 w-1 bg-pic-brand"></div>
                  <div class="flex items-start gap-3 pl-1">
                     <span class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-pic-brand text-sm font-black text-white shadow-sm shadow-pic-brand/20">
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
                        <p class="text-[10px] font-black uppercase text-pic-brand">Cuenta</p>
                        <p class="truncate text-sm font-black text-pic-text-main">{{ displayName }}</p>
                        <p class="mt-0.5 truncate text-xs font-semibold text-pic-text-muted">{{ displayUser }}</p>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                           <span class="rounded-md border border-pic-border bg-pic-muted-surface px-2 py-1 text-[10px] font-black uppercase leading-none text-pic-text-muted">
                              {{ displayRole }}
                           </span>
                           <span class="rounded-md border border-pic-brand-border bg-pic-brand-soft px-2 py-1 text-[10px] font-black uppercase leading-none text-pic-brand">
                              {{ presenceLabel }}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div class="bg-pic-muted-surface/70 p-2.5">
                  <button
                     type="button"
                     class="group flex w-full items-center gap-3 rounded-lg border border-pic-border bg-white px-3 py-3 text-left transition hover:border-pic-brand-border hover:bg-pic-brand-soft"
                     @click="goToProfile"
                  >
                     <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted transition group-hover:bg-white group-hover:text-pic-brand">
                        <i class="fa-solid fa-user text-sm"></i>
                     </span>
                     <span class="min-w-0 flex-1">
                        <span class="block text-sm font-black leading-5 text-pic-text-main group-hover:text-pic-brand">Mi perfil</span>
                        <span class="block truncate text-xs font-semibold leading-4 text-pic-text-muted">Datos personales y preferencias</span>
                     </span>
                     <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 transition group-hover:text-pic-brand"></i>
                  </button>
                  <button
                     v-if="auth.isAdmin"
                     type="button"
                     class="group mt-2 flex w-full items-center gap-3 rounded-lg border border-pic-border bg-white px-3 py-3 text-left transition hover:border-pic-brand-border hover:bg-pic-brand-soft"
                     @click="goToSetup"
                  >
                     <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted transition group-hover:bg-white group-hover:text-pic-brand">
                        <i class="fa-solid fa-sliders text-sm"></i>
                     </span>
                     <span class="min-w-0 flex-1">
                        <span class="block text-sm font-black leading-5 text-pic-text-main group-hover:text-pic-brand">Configuracion</span>
                        <span class="block truncate text-xs font-semibold leading-4 text-pic-text-muted">Modulos, permisos y visibilidad</span>
                     </span>
                     <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 transition group-hover:text-pic-brand"></i>
                  </button>
               </div>

               <div class="border-t border-slate-100 bg-white p-2.5">
                  <button
                     type="button"
                     class="flex w-full items-center justify-center gap-2 rounded-lg bg-pic-brand px-4 py-3 text-xs font-black uppercase text-white transition hover:brightness-95"
                     @click="handleLogout"
                  >
                     <i class="fa-solid fa-right-from-bracket"></i>
                     Cerrar sesion
                  </button>
               </div>
            </div>
         </div>
      </transition>

      <div v-if="showNotifDropdown || showUserMenu" class="fixed inset-0 z-[100]" @click="closeFloatingMenus"></div>

      <transition name="mobile-sidebar">
         <div v-if="showMobileSidebar" class="fixed inset-0 z-[130] md:hidden">
            <div class="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" @click="showMobileSidebar = false"></div>
            <aside class="relative flex h-full w-[min(86vw,320px)] flex-col border-r border-white/10 bg-pic-nav text-pic-nav-text shadow-2xl">
               <div class="flex h-16 items-center justify-between border-b border-white/10 px-4">
                  <router-link to="/" class="flex min-w-0 items-center gap-3 rounded-lg py-1" @click="showMobileSidebar = false">
                     <img :src="coronaLogo" alt="Corona" class="h-9 w-auto object-contain" />
                     <span class="truncate text-base font-black text-white">PIC System</span>
                  </router-link>
                  <button
                     type="button"
                     class="flex h-9 w-9 items-center justify-center rounded-lg text-pic-nav-text-muted transition hover:bg-white/10 hover:text-white"
                     title="Cerrar menu"
                     @click="showMobileSidebar = false"
                  >
                     <i class="fa-solid fa-xmark text-lg"></i>
                  </button>
               </div>

               <nav class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar nav-scrollbar">
                  <div v-if="setupStore.isLoading" class="space-y-4 p-2">
                     <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="mb-2 h-3 w-20 rounded bg-white/10"></div>
                        <div class="h-10 rounded-lg bg-white/10"></div>
                        <div class="mt-1 h-10 rounded-lg bg-white/10"></div>
                     </div>
                  </div>

                  <template v-else v-for="(modules, category) in setupStore.groupedMenu" :key="category">
                     <button
                        type="button"
                        class="group mb-2 mt-5 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-pic-nav-text-muted transition hover:bg-white/5 hover:text-white first:mt-1"
                        :class="categoryHasActiveModule(modules) ? 'text-white' : ''"
                        :aria-expanded="!isSidebarCategoryCollapsed(String(category))"
                        @click="toggleSidebarCategory(String(category))"
                     >
                        <span class="min-w-0 flex-1 truncate">{{ category }}</span>
                        <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] leading-none text-pic-nav-text-muted group-hover:text-white">
                           {{ modules.length }}
                        </span>
                        <i
                           class="fa-solid fa-chevron-down text-[9px] transition-transform"
                           :class="isSidebarCategoryCollapsed(String(category)) ? '-rotate-90' : 'rotate-0'"
                        ></i>
                     </button>
                     <div v-show="!isSidebarCategoryCollapsed(String(category))" class="space-y-1">
                        <router-link
                           v-for="mod in modules"
                           :key="mod.ModuleId"
                           :to="mod.Route"
                           class="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition-all"
                           :class="isActive(mod.Route) ? 'bg-pic-brand text-white shadow-lg shadow-black/15' : 'text-pic-nav-text-muted hover:bg-white/10 hover:text-white'"
                           @click="showMobileSidebar = false"
                        >
                           <i :class="[mod.Icon, 'w-5 text-center text-base']"></i>
                           <span class="min-w-0 truncate">{{ mod.Label }}</span>
                        </router-link>
                     </div>
                  </template>
               </nav>
            </aside>
         </div>
      </transition>
   </div>
</template>

<style scoped>
.custom-scrollbar {
   scrollbar-width: thin;
   scrollbar-color: rgba(148, 163, 184, 0.28) transparent;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.28); border-radius: 999px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(203, 213, 225, 0.42); }

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

.sidebar-logo {
   filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.16));
   transform-origin: center;
}

.sidebar-logo-enter-active {
   transition: opacity 420ms cubic-bezier(.34,1.56,.64,1), transform 420ms cubic-bezier(.34,1.56,.64,1);
}

.sidebar-logo-leave-active {
   transition: opacity 220ms ease-out, transform 220ms ease-out;
}

.sidebar-logo-enter-from {
   opacity: 0;
   transform: scale(0.6);
}

.sidebar-logo-enter-to {
   opacity: 1;
   transform: scale(1);
}

.sidebar-logo-leave-to {
   opacity: 0;
   transform: scale(1.15);
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

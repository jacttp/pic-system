<!-- src/modules/Users/components/BroadcastMessageModal.vue -->
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useUserStore } from '../stores/userStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';
import { Input } from '@/components/ui/input';
import type { UserFull } from '../types/user.types';
import { cn } from '@/lib/utils';

const props = defineProps<{
   modelValue: boolean
   mode?: 'single' | 'zone' | 'broadcast'
   targetUser?: UserFull | null
}>();

const emit = defineEmits(['update:modelValue', 'sent']);

const userStore = useUserStore();

// Estado del formulario
const form = reactive({
   targetType: 'broadcast' as 'user' | 'zone' | 'broadcast',
   targetValue: '' as string,
   content: ''
});

// Búsqueda local de usuario
const searchUserQuery = ref('');
const selectedUserFromSearch = ref<UserFull | null>(null);

const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const modeOptions = [
   { value: 'broadcast', label: '📢 Todos los usuarios' },
   { value: 'zone', label: '🗺️ Por Zona de Operación' },
   { value: 'user', label: '👤 Usuario específico' }
];

const zonaOptions = computed(() => {
    return userStore.jefaturas.map(z => ({ value: z, label: z }));
});

// Filtrar usuarios para el buscador
const userSearchResults = computed(() => {
    if (!searchUserQuery.value || searchUserQuery.value.length < 2) return [];
    const q = searchUserQuery.value.toLowerCase();
    return userStore.users.filter(u => 
        u.Usuario.toLowerCase().includes(q) || 
        (u.nombre && u.nombre.toLowerCase().includes(q)) ||
        (u.no_emp && u.no_emp.toLowerCase().includes(q))
    ).slice(0, 5); // Limitar a 5 resultados
});

// Configurar modo inicial
watch(() => props.modelValue, (open) => {
   if (open) {
      if (props.mode) {
         form.targetType = props.mode === 'single' ? 'user' : props.mode;
      }
      if (props.targetUser && props.mode === 'single') {
         form.targetType = 'user';
         selectedUserFromSearch.value = props.targetUser;
         form.targetValue = String(props.targetUser.IdUser);
      } else {
          selectedUserFromSearch.value = null;
          form.targetValue = '';
          searchUserQuery.value = '';
      }
      successMessage.value = '';
      errorMessage.value = '';
   }
});

const selectUser = (user: UserFull) => {
    selectedUserFromSearch.value = user;
    form.targetValue = String(user.IdUser);
    searchUserQuery.value = '';
};

const targetLabel = computed(() => {
   if (form.targetType === 'broadcast') return 'Todos los usuarios (Global)';
   if (form.targetType === 'zone') return `Zona: ${form.targetValue || '(selecciona)'}`;
   if (form.targetType === 'user') {
       if (selectedUserFromSearch.value) return `Usuario: ${selectedUserFromSearch.value.nombre || selectedUserFromSearch.value.Usuario}`;
       return '(selecciona un usuario)';
   }
   return 'Selecciona un destino';
});

const closeModal = () => {
   emit('update:modelValue', false);
   form.content = '';
   form.targetValue = '';
   form.targetType = 'broadcast';
   searchUserQuery.value = '';
   selectedUserFromSearch.value = null;
   errorMessage.value = '';
   successMessage.value = '';
};

const handleSubmit = async () => {
   if (!form.content.trim()) {
      errorMessage.value = 'El mensaje no puede estar vacío.';
      return;
   }

   if (form.targetType === 'zone' && !form.targetValue) {
      errorMessage.value = 'Selecciona una zona.';
      return;
   }

   if (form.targetType === 'user' && !form.targetValue) {
      errorMessage.value = 'Busca y selecciona un usuario.';
      return;
   }

   isSubmitting.value = true;
   errorMessage.value = '';

   try {
      await userStore.sendMessage({
         targetType: form.targetType,
         targetValue: form.targetValue || undefined,
         content: form.content,
      });
      successMessage.value = '✅ Mensaje enviado exitosamente';
      emit('sent');
      setTimeout(() => closeModal(), 1500);
   } catch (e: any) {
      errorMessage.value = e.response?.data?.message || 'Error al enviar mensaje.';
   } finally {
      isSubmitting.value = false;
   }
};
</script>

<template>
   <ModalDialog
      :model-value="modelValue"
      title="Enviar Mensaje en Red"
      size="md"
      @close="closeModal"
   >
      <form @submit.prevent="handleSubmit" class="space-y-5">

         <!-- Errores / Éxito -->
         <div v-if="errorMessage" class="p-4 bg-red-50 text-red-700 rounded-2xl text-sm flex items-center gap-3 border border-red-100 italic">
            <i class="fa-solid fa-circle-exclamation text-lg"></i> {{ errorMessage }}
         </div>
         <div v-if="successMessage" class="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm flex items-center gap-3 border border-emerald-100 font-bold animate-pulse">
            <i class="fa-solid fa-check-double text-lg"></i> {{ successMessage }}
         </div>

         <!-- Modo de envío -->
         <FormSelect
            v-model="form.targetType"
            label="¿A quién deseas notificar?"
            :options="modeOptions"
         />

         <!-- Selector de zona (solo si mode=zone) -->
         <FormSelect
            v-if="form.targetType === 'zone'"
            v-model="form.targetValue"
            label="Zona destino"
            :options="zonaOptions"
         />

         <!-- Buscador de usuario (solo si mode=user) -->
         <div v-if="form.targetType === 'user'" class="space-y-3">
             <div v-if="selectedUserFromSearch" class="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm relative">
                <div class="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-100">
                   {{ (selectedUserFromSearch.nombre || selectedUserFromSearch.Usuario).substring(0, 2).toUpperCase() }}
                </div>
                <div>
                   <p class="font-black text-slate-900 leading-tight">{{ selectedUserFromSearch.nombre || selectedUserFromSearch.Usuario }}</p>
                   <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">@{{ selectedUserFromSearch.Usuario }} · #{{ selectedUserFromSearch.no_emp || 'S/N' }}</p>
                </div>
                <button @click="selectedUserFromSearch = null; form.targetValue = ''" class="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors">
                    <i class="fa-solid fa-circle-xmark"></i>
                </button>
             </div>

             <div v-else class="relative">
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Buscar Usuario</label>
                <div class="relative">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <Input 
                        v-model="searchUserQuery" 
                        placeholder="Nombre, Usuario o No. Empleado..." 
                        class="pl-10 h-11 rounded-xl border-slate-200 focus:ring-blue-500"
                    />
                </div>

                <!-- Resultados de búsqueda -->
                <div v-if="userSearchResults.length > 0" class="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                    <div 
                        v-for="u in userSearchResults" 
                        :key="u.IdUser"
                        @click="selectUser(u)"
                        class="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                                {{ (u.nombre || u.Usuario).substring(0, 1).toUpperCase() }}
                            </div>
                            <div>
                                <p class="text-xs font-bold text-slate-700 leading-none">{{ u.nombre || u.Usuario }}</p>
                                <p class="text-[9px] text-slate-400 mt-1 uppercase">@{{ u.Usuario }} · #{{ u.no_emp || '---' }}</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                    </div>
                </div>
             </div>
         </div>

         <!-- Destino resumido -->
         <div class="flex items-center gap-3 px-4 py-3 bg-slate-900 rounded-2xl text-xs shadow-lg shadow-slate-100 h-12">
            <i class="fa-solid fa-paper-plane text-blue-400"></i>
            <span class="text-slate-400 uppercase font-black tracking-widest">Enviar a:</span>
            <span class="font-black text-white truncate max-w-[250px]">{{ targetLabel }}</span>
         </div>

         <!-- Contenido del mensaje -->
         <div class="space-y-1.5">
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mensaje Broadcast</label>
            <textarea
               v-model="form.content"
               rows="5"
               class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm shadow-sm transition-all"
               placeholder="Escribe el mensaje que verán los usuarios en su centro de notificaciones..."
            ></textarea>
            <div class="flex justify-between px-1">
                <span class="text-[10px] text-slate-300 font-bold italic">Evite enviar información confidencial.</span>
                <span class="text-[10px] font-black" :class="form.content.length > 400 ? 'text-red-500' : 'text-slate-400'">{{ form.content.length }} / 500</span>
            </div>
         </div>

         <!-- Botones -->
         <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
                type="button" 
                @click="closeModal" 
                class="px-6 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
            >
               Cancelar
            </button>
            <button 
                type="submit" 
                :disabled="isSubmitting" 
                class="px-8 py-3 text-xs font-black text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-3 disabled:opacity-70 active:scale-95 uppercase tracking-widest"
            >
               <i :class="isSubmitting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i>
               Transmitir Mensaje
            </button>
         </div>
      </form>
   </ModalDialog>
</template>

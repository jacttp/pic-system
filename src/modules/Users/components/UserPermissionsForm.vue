<!-- src/modules/Users/components/UserPermissionsForm.vue -->
<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useUserStore } from '../stores/userStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';
import type { UserFull, UserRole } from '../types/user.types';
import { ROLE_OPTIONS } from '../types/user.types';

const props = defineProps<{
   modelValue: boolean
   user: UserFull | null
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const userStore = useUserStore();

const form = reactive({
   role: 'Gerente' as UserRole,
   zona: '',
   accessLevel: 1
});

const isSubmitting = ref(false);
const errorMessage = ref('');

const roleOptions = ROLE_OPTIONS.map(r => ({ value: r.value, label: r.label }));

const zonaOptions = [
   { value: 'Norte', label: 'Zona Norte' },
   { value: 'Sur', label: 'Zona Sur' },
   { value: 'Centro', label: 'Zona Centro' },
   { value: 'Corporativo', label: 'Corporativo' }
];

// Cargar datos del usuario al abrir
watch(() => props.modelValue, (open) => {
   if (open && props.user) {
      form.role = props.user.TipoUser as UserRole;
      form.zona = props.user.Zona;
      form.accessLevel = props.user.AccessLevel || 1;
   }
});

// Sincronizar accessLevel con rol
watch(() => form.role, (newRole) => {
   const opt = ROLE_OPTIONS.find(r => r.value === newRole);
   if (opt) form.accessLevel = opt.level;
});

const closeModal = () => {
   emit('update:modelValue', false);
   errorMessage.value = '';
};

const handleSubmit = async () => {
   if (!props.user) return;

   isSubmitting.value = true;
   errorMessage.value = '';

   try {
      await userStore.updateUser(props.user.IdUser, {
         role: form.role,
         zona: form.zona,
         accessLevel: form.accessLevel
      });
      emit('saved');
      closeModal();
   } catch (e: any) {
      errorMessage.value = e.response?.data?.message || 'Error al actualizar permisos.';
   } finally {
      isSubmitting.value = false;
   }
};
</script>

<template>
   <ModalDialog
      :model-value="modelValue"
      :title="`Permisos: ${user?.Usuario || ''}`"
      size="sm"
      @close="closeModal"
   >
      <form @submit.prevent="handleSubmit" class="space-y-5">
         
         <div v-if="errorMessage" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <i class="fa-solid fa-circle-exclamation"></i> {{ errorMessage }}
         </div>

         <!-- Información del usuario -->
         <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
               {{ user?.Usuario.substring(0, 2).toUpperCase() }}
            </div>
            <div>
               <p class="font-semibold text-slate-800 text-sm">{{ user?.Usuario }}</p>
               <p class="text-xs text-slate-400">ID: {{ user?.IdUser }}</p>
            </div>
         </div>

         <FormSelect 
            v-model="form.role" 
            label="Rol del Sistema" 
            :options="roleOptions"
         />

         <FormSelect 
            v-model="form.zona" 
            label="Zona Asignada" 
            :options="zonaOptions"
         />

         <!-- Nivel de acceso result -->
         <div class="flex items-center justify-between px-4 py-3 bg-purple-50 rounded-lg border border-purple-100">
            <span class="text-sm text-purple-700 font-medium">Nivel de acceso</span>
            <div class="flex items-center gap-2">
               <template v-for="i in 4" :key="i">
                  <div 
                     class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                     :class="i <= form.accessLevel 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'bg-purple-100 text-purple-300'"
                  >
                     {{ i }}
                  </div>
               </template>
            </div>
         </div>

         <!-- Botones -->
         <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
               Cancelar
            </button>
            <button type="submit" :disabled="isSubmitting" class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70">
               <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
               Guardar Permisos
            </button>
         </div>
      </form>
   </ModalDialog>
</template>

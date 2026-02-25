<!-- src/modules/Users/components/BroadcastMessageModal.vue -->
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useUserStore } from '../stores/userStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';
import type { UserFull } from '../types/user.types';

const props = defineProps<{
   modelValue: boolean
   mode?: 'single' | 'zone' | 'broadcast'
   targetUser?: UserFull | null
}>();

const emit = defineEmits(['update:modelValue', 'sent']);

const userStore = useUserStore();

const form = reactive({
   targetType: 'broadcast' as 'user' | 'zone' | 'broadcast',
   targetValue: '' as string,
   content: ''
});

const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const modeOptions = [
   { value: 'broadcast', label: '📢 Todos los usuarios' },
   { value: 'zone', label: '🗺️ Por zona' },
   { value: 'user', label: '👤 Usuario específico' }
];

const zonaOptions = [
   { value: 'Norte', label: 'Zona Norte' },
   { value: 'Sur', label: 'Zona Sur' },
   { value: 'Centro', label: 'Zona Centro' },
   { value: 'Corporativo', label: 'Corporativo' }
];

// Configurar modo inicial
watch(() => props.modelValue, (open) => {
   if (open) {
      if (props.mode) {
         form.targetType = props.mode === 'single' ? 'user' : props.mode;
      }
      if (props.targetUser && props.mode === 'single') {
         form.targetType = 'user';
         form.targetValue = String(props.targetUser.IdUser);
      }
      successMessage.value = '';
      errorMessage.value = '';
   }
});

const targetLabel = computed(() => {
   if (form.targetType === 'broadcast') return 'Todos los usuarios del sistema';
   if (form.targetType === 'zone') return `Zona: ${form.targetValue || '(selecciona)'}`;
   if (form.targetType === 'user' && props.targetUser) return `Usuario: ${props.targetUser.Usuario}`;
   return 'Selecciona un destino';
});

const closeModal = () => {
   emit('update:modelValue', false);
   form.content = '';
   form.targetValue = '';
   form.targetType = 'broadcast';
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
      setTimeout(() => closeModal(), 1200);
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
      title="Enviar Mensaje"
      size="md"
      @close="closeModal"
   >
      <form @submit.prevent="handleSubmit" class="space-y-4">

         <!-- Errores / Éxito -->
         <div v-if="errorMessage" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <i class="fa-solid fa-circle-exclamation"></i> {{ errorMessage }}
         </div>
         <div v-if="successMessage" class="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
            <i class="fa-solid fa-circle-check"></i> {{ successMessage }}
         </div>

         <!-- Modo de envío -->
         <FormSelect
            v-model="form.targetType"
            label="Enviar a"
            :options="modeOptions"
         />

         <!-- Selector de zona (solo si mode=zone) -->
         <FormSelect
            v-if="form.targetType === 'zone'"
            v-model="form.targetValue"
            label="Zona destino"
            :options="zonaOptions"
         />

         <!-- Info del usuario (solo si mode=user) -->
         <div v-if="form.targetType === 'user' && targetUser" class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs">
               {{ targetUser.Usuario.substring(0, 2).toUpperCase() }}
            </div>
            <div>
               <p class="font-semibold text-blue-800 text-sm">{{ targetUser.Usuario }}</p>
               <p class="text-xs text-blue-500">{{ targetUser.Zona }} · {{ targetUser.TipoUser }}</p>
            </div>
         </div>

         <!-- Destino resumido -->
         <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm">
            <i class="fa-solid fa-bullseye text-slate-400"></i>
            <span class="text-slate-500">Destino:</span>
            <span class="font-medium text-slate-700">{{ targetLabel }}</span>
         </div>

         <!-- Contenido del mensaje -->
         <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Mensaje</label>
            <textarea
               v-model="form.content"
               rows="4"
               class="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none text-sm"
               placeholder="Escribe el mensaje aquí..."
            ></textarea>
            <p class="text-xs text-slate-400 mt-1">{{ form.content.length }} caracteres</p>
         </div>

         <!-- Botones -->
         <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
               Cancelar
            </button>
            <button type="submit" :disabled="isSubmitting" class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70">
               <i :class="isSubmitting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'" class="text-xs"></i>
               Enviar Mensaje
            </button>
         </div>
      </form>
   </ModalDialog>
</template>

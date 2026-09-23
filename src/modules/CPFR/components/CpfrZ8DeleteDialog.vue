<script setup lang="ts">
import { StdButton } from '@/modules/Shared/components/std'
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'
import type { Z8DeletePreview } from '../types/cpfrZ8ManagerTypes'

defineProps<{ modelValue: boolean; preview: Z8DeletePreview | null; deleting: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'confirm'): void }>()
</script>

<template>
  <ModalDialog :model-value="modelValue" title="Vista previa de eliminación" size="xl" @update:model-value="emit('update:modelValue', $event)">
    <div class="space-y-3 font-sans">
      <p class="text-sm text-pic-text-muted">La selección se volverá a comprobar antes de eliminar. Las letras extraordinarias permanecerán reservadas.</p>
      <div v-for="order in preview?.pedidos || []" :key="`${order.id_cliente}|${order.num_pedido}|${order.fec_pedido_cadena}`" class="border-b border-pic-border py-2 text-xs">
        <p class="font-mono font-bold">{{ order.num_pedido }}</p>
        <p>{{ order.lineas_fuente }} fuente · {{ order.lineas_persistidas }} persistidas · Estado: {{ (order.estados_persistidos.length ? order.estados_persistidos : order.estados_fuente).join(', ') }}</p>
        <p v-if="order.bloqueo" class="font-semibold text-pic-danger">{{ order.bloqueo }}</p>
      </div>
      <div class="flex justify-end gap-2"><StdButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</StdButton><StdButton variant="danger" :disabled="!!preview?.bloqueado || deleting" @click="emit('confirm')">{{ deleting ? 'Eliminando…' : 'Eliminar selección' }}</StdButton></div>
    </div>
  </ModalDialog>
</template>

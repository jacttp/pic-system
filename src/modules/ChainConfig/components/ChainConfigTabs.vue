<script setup lang="ts">
type TabId = 'stores' | 'skuUnits' | 'mappings' | 'z8' | 'diagnostics' | 'bulk';

defineProps<{
   activeTab: TabId;
}>();

const emit = defineEmits<{
   (e: 'update:activeTab', value: TabId): void;
}>();

const tabs: Array<{ id: TabId; label: string; icon: string; detail: string }> = [
   { id: 'stores', label: 'Tiendas CPFR', icon: 'fa-solid fa-store', detail: 'Dias, lead time y semanas objetivo' },
   { id: 'skuUnits', label: 'Unidades SKU', icon: 'fa-solid fa-scale-balanced', detail: 'Conversiones operativas' },
   { id: 'mappings', label: 'SKU por Cadena', icon: 'fa-solid fa-link', detail: 'UPC y nombres externos' },
   { id: 'z8', label: 'Catalogo Z8', icon: 'fa-solid fa-layer-group', detail: 'Permisos y pares de resurtido' },
   { id: 'diagnostics', label: 'Validacion', icon: 'fa-solid fa-triangle-exclamation', detail: 'Faltantes y duplicados' },
   { id: 'bulk', label: 'Carga Masiva', icon: 'fa-solid fa-file-import', detail: 'Plantillas y prevalidacion' },
];
</script>

<template>
   <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
      <button
         v-for="tab in tabs"
         :key="tab.id"
         type="button"
         class="group text-left rounded-lg border p-4 transition-all"
         :class="activeTab === tab.id
            ? 'border-brand-300 bg-brand-50 shadow-sm'
            : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'"
         @click="emit('update:activeTab', tab.id)"
      >
         <div class="flex items-center gap-3">
            <div
               class="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors"
               :class="activeTab === tab.id
                  ? 'bg-white text-brand-600 border-brand-200'
                  : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:text-brand-500'"
            >
               <i :class="tab.icon"></i>
            </div>
            <div class="min-w-0">
               <p class="text-sm font-black text-slate-800 uppercase tracking-tight">{{ tab.label }}</p>
               <p class="text-[11px] font-medium text-slate-400 truncate">{{ tab.detail }}</p>
            </div>
         </div>
      </button>
   </div>
</template>

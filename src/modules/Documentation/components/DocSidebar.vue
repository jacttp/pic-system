<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface DocItem {
  title: string;
  id: string;
}

interface DocSection {
  title: string;
  items: DocItem[];
}

const props = defineProps<{
  sections: DocSection[];
  activeId: string;
}>();

const emit = defineEmits(['select']);

const selectItem = (id: string) => {
  emit('select', id);
};
</script>

<template>
  <aside class="w-64 border-r border-slate-200 bg-white h-full overflow-y-auto flex-shrink-0">
    <div class="p-6">
      <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Documentación</h2>
      
      <nav v-for="section in sections" :key="section.title" class="mb-8">
        <h3 class="text-sm font-bold text-slate-900 mb-2 px-2">{{ section.title }}</h3>
        <ul class="space-y-1">
          <li v-for="item in section.items" :key="item.id">
            <button
              @click="selectItem(item.id)"
              class="w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors duration-200"
              :class="[
                activeId === item.id 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              ]"
            >
              {{ item.title }}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
/* Estilos adicionales si son necesarios */
</style>

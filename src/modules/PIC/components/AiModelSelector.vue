<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';

const store = usePicChatStore();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// CAMBIO 1: Reemplazamos Emojis por clases de FontAwesome
const models = [
  { id: 'gemini', name: 'Gemini 2.5', icon: 'fa-brands fa-chrome', color: 'text-blue-500', desc: 'Rápido y preciso' },
  { id: 'openai', name: 'GPT-4o', icon: 'fa-brands fa-openai', color: 'text-green-500', desc: 'Mayor razonamiento' },
  { id: 'deepseek', name: 'DeepSeek', icon: 'fa-solid fa-robot', color: 'text-purple-500', desc: 'Open Source potente' }
];

const currentModel = computed(() => models.find(m => m.id === store.selectedModel) || models[0]);

const selectModel = (id: string) => {
  store.setModel(id);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
  <div class="relative" ref="dropdownRef">
    
    <!-- MENÚ FLOTANTE (Dropup) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-2 opacity-0 scale-95"
    >
      <div 
        v-if="isOpen"
        class="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50"
      >
        <div class="px-3 py-2 border-b border-slate-50 bg-slate-50/50">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motor de Inteligencia</span>
        </div>
        
        <button
          v-for="model in models"
          :key="model.id"
          @click="selectModel(model.id)"
          class="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors group"
        >
          <!-- CAMBIO 2: Renderizar icono como clase CSS -->
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
            <i :class="[model.icon, 'text-sm text-slate-600']"></i>
          </div>
          
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-slate-700" :class="{ 'text-brand-600': store.selectedModel === model.id }">
              {{ model.name }}
            </span>
            <span class="text-[10px] text-slate-400 leading-tight">{{ model.desc }}</span>
          </div>
          
          <i v-if="store.selectedModel === model.id" class="fa-solid fa-check text-brand-500 text-xs ml-auto"></i>
        </button>
      </div>
    </transition>

    <!-- BOTÓN TRIGGER -->
    <button 
      @click.stop="isOpen = !isOpen"
      class="flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 group"
      :class="{ 'bg-slate-50 border-slate-200': isOpen }"
      title="Cambiar Modelo IA"
    >
      <!-- CAMBIO 3: Renderizar icono seleccionado como clase CSS -->
      <i :class="[currentModel.icon, currentModel.color, 'text-sm']"></i>
      
      <span class="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors hidden sm:block">
        {{ currentModel.name }}
      </span>
      <i class="fa-solid fa-chevron-up text-[10px] text-slate-300 transition-transform duration-300" :class="{ 'rotate-180': isOpen }"></i>
    </button>

  </div>
</template>
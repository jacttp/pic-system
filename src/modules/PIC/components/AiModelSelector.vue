<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';

const store = usePicChatStore();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// CAMBIO 1: Reemplazamos Emojis por clases de FontAwesome
const models = [
  { id: 'gemini', name: 'Gemini 2.5', icon: 'fa-brands fa-chrome', color: 'text-pic-accent-blue', desc: 'Rápido y preciso' },
  { id: 'openai', name: 'GPT-4o', icon: 'fa-brands fa-openai', color: 'text-pic-success', desc: 'Mayor razonamiento' },
  { id: 'deepseek', name: 'DeepSeek', icon: 'fa-solid fa-robot', color: 'text-pic-accent-purple', desc: 'Open Source potente' },
  { id: 'groq', name: 'Llama 3.1 (Groq)', icon: 'fa-solid fa-bolt', color: 'text-pic-accent-orange', desc: 'Velocidad Instantánea'}
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
        class="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-xl border border-pic-border bg-pic-surface py-1 shadow-xl"
      >
        <div class="border-b border-pic-border bg-pic-muted-surface px-3 py-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-pic-text-muted">Motor de Inteligencia</span>
        </div>
        
        <button
          v-for="model in models"
          :key="model.id"
          @click="selectModel(model.id)"
          class="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-pic-brand-soft"
        >
          <!-- CAMBIO 2: Renderizar icono como clase CSS -->
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-pic-muted-surface transition-all group-hover:bg-pic-surface group-hover:shadow-sm">
            <i :class="[model.icon, 'text-sm text-pic-text-muted']"></i>
          </div>
          
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-pic-text-main" :class="{ 'text-pic-brand': store.selectedModel === model.id }">
              {{ model.name }}
            </span>
            <span class="text-[10px] leading-tight text-pic-text-muted">{{ model.desc }}</span>
          </div>
          
          <i v-if="store.selectedModel === model.id" class="fa-solid fa-check ml-auto text-xs text-pic-brand"></i>
        </button>
      </div>
    </transition>

    <!-- BOTÓN TRIGGER -->
    <button 
      @click.stop="isOpen = !isOpen"
      class="group flex items-center gap-2 rounded-lg border border-transparent py-2 pl-3 pr-2 transition-colors hover:border-pic-border hover:bg-pic-muted-surface"
      :class="{ 'border-pic-border bg-pic-muted-surface': isOpen }"
      title="Cambiar Modelo IA"
    >
      <!-- CAMBIO 3: Renderizar icono seleccionado como clase CSS -->
      <i :class="[currentModel.icon, currentModel.color, 'text-sm']"></i>
      
      <span class="hidden text-xs font-medium text-pic-text-muted transition-colors group-hover:text-pic-text-main sm:block">
        {{ currentModel.name }}
      </span>
      <i class="fa-solid fa-chevron-up text-[10px] text-pic-text-muted transition-transform duration-300" :class="{ 'rotate-180': isOpen }"></i>
    </button>

  </div>
</template>

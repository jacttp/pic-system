<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '@/api/axios';
import DocSidebar from './components/DocSidebar.vue';
import DocRenderer from './components/DocRenderer.vue';

interface DocItem {
  title: string;
  id: string;
}

interface DocSection {
  title: string;
  items: DocItem[];
}

const sections = ref<DocSection[]>([]);
const activeId = ref('introduction/introduction');
const content = ref('');
const loading = ref(false);

const fetchStructure = async () => {
  try {
    const response = await api.get('/docs/structure');
    if (response.data.success) {
      sections.value = response.data.data;
    }
  } catch (error) {
    console.error('Error fetching doc structure:', error);
  }
};

const fetchContent = async (id: string) => {
  loading.value = true;
  try {
    const [section, file] = id.split('/');
    const response = await api.get(`/docs/content/${section}/${file}`);
    if (response.data.success) {
      content.value = response.data.data;
      activeId.value = id;
    }
  } catch (error) {
    console.error('Error fetching doc content:', error);
    content.value = '# Error\nNo se pudo cargar el documento.';
  } finally {
    loading.value = false;
  }
};

const handleSelect = (id: string) => {
  fetchContent(id);
};

onMounted(() => {
  fetchStructure();
  fetchContent(activeId.value);
});
</script>

<template>
  <div class="flex h-screen bg-white">
    <!-- Sidebar -->
    <DocSidebar 
      :sections="sections" 
      :active-id="activeId" 
      @select="handleSelect" 
    />

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto bg-slate-50/30">
      <div class="max-w-4xl mx-auto px-8 py-12">
        <div v-if="loading" class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        
        <div v-else class="bg-white rounded-xl shadow-sm border border-slate-200 p-10 min-h-[80vh]">
          <DocRenderer :content="content" />
        </div>

        <!-- Footer simple -->
        <footer class="mt-12 pt-8 border-t border-slate-200 text-slate-400 text-sm flex justify-between">
          <span>PIC SystemDocumentation</span>
          <span>&copy; 2026</span>
        </footer>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Transición suave para el contenido */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  content: string;
}>();

const renderedMarkdown = computed(() => {
  return marked.parse(props.content || '');
});
</script>

<template>
  <div class="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:text-blue-600 hover:prose-a:text-blue-700">
    <div v-html="renderedMarkdown"></div>
  </div>
</template>

<style>
/* Estilos para el contenido Markdown renderizado */
.prose h1 {
  @apply text-slate-900 mb-6 pb-2 border-b border-slate-100;
}
.prose h2 {
  @apply text-slate-800 mt-8 mb-4;
}
.prose p {
  @apply text-slate-600 leading-relaxed mb-4;
}
.prose code {
  @apply bg-slate-100 text-pink-600 px-1 rounded font-mono text-sm;
}
.prose pre {
  @apply bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-6;
}
.prose pre code {
  @apply bg-transparent text-inherit p-0;
}
.prose ul {
  @apply list-disc list-inside mb-4 space-y-1 text-slate-600;
}
</style>

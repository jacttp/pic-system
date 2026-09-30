<script setup lang="ts">
import '../styles/technicalStudies.css';
defineProps<{ compact?: boolean }>();
</script>
<template>
  <div class="ts-page" :class="{ 'ts-page-form': compact }"><slot /></div>
</template>

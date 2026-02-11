<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  iconColor?: string
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'text-brand-600',
  loading: false
})

const getTrendClasses = computed(() => {
  if (!props.trend) return ''
  return props.trend.isPositive 
    ? 'text-green-600 bg-green-50' 
    : 'text-red-600 bg-red-50'
})

const getTrendIcon = computed(() => {
  if (!props.trend) return ''
  return props.trend.isPositive ? 'fa-arrow-up' : 'fa-arrow-down'
})
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1">
        <p class="text-sm font-medium text-slate-600">{{ title }}</p>
      </div>
      
      <div 
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        :class="`bg-${iconColor.split('-')[1]}-50`"
      >
        <i class="fa-solid text-lg" :class="[icon, iconColor]"></i>
      </div>
    </div>
    
    <!-- Value -->
    <div v-if="loading" class="space-y-2">
      <div class="h-8 bg-slate-200 rounded animate-pulse"></div>
      <div class="h-4 bg-slate-100 rounded w-2/3 animate-pulse"></div>
    </div>
    
    <div v-else>
      <p class="text-3xl font-bold text-slate-800 mb-1">
        {{ value }}
      </p>
      
      <p v-if="subtitle" class="text-sm text-slate-500">
        {{ subtitle }}
      </p>
    </div>
    
    <!-- Trend Indicator -->
    <div v-if="trend && !loading" class="mt-3 pt-3 border-t border-slate-100">
      <div class="flex items-center gap-2">
        <span 
          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
          :class="getTrendClasses"
        >
          <i class="fa-solid" :class="getTrendIcon"></i>
          {{ Math.abs(trend.value) }}%
        </span>
        <span class="text-xs text-slate-500">{{ trend.label }}</span>
      </div>
    </div>
  </div>
</template>
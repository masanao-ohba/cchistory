<template>
  <div :class="cardClasses">
    <div class="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-xl"></div>
    <div class="relative flex items-center space-x-2">
      <div :class="iconClasses">
        <BaseIcon :name="iconName" size="sm" class="text-white" />
      </div>
      <div class="flex items-center space-x-2">
        <div :class="valueClasses">{{ value }}</div>
        <div :class="labelClasses">{{ label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { colorThemes } from '../assets/icons.js'

const props = defineProps({
  value: { type: [String, Number], required: true },
  label: { type: String, required: true },
  color: { type: String, required: true },
  type: { type: String, required: true }
})

const iconName = computed(() => {
  const iconMap = {
    threads: 'conversation',
    messages: 'message',
    projects: 'project'
  }
  return iconMap[props.type] || 'conversation'
})

const theme = computed(() => colorThemes[props.color])

const cardClasses = computed(() => [
  'group relative bg-gradient-to-br rounded-xl p-3 border hover:shadow-md transition-all duration-200 backdrop-blur-sm',
  theme.value.card
])

const iconClasses = computed(() => [
  'bg-gradient-to-br rounded-lg p-1.5 shadow-sm',
  theme.value.icon
])

const valueClasses = computed(() => [
  'text-xl font-bold',
  theme.value.value
])

const labelClasses = computed(() => [
  'text-xs font-medium',
  theme.value.label
])
</script>
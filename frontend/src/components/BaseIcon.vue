<template>
  <svg
    :class="iconClasses"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-width="strokeWidth"
      :d="iconPath"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { iconPaths } from '../assets/icons.js'

const props = defineProps({
  name: {
    type: String,
    required: true,
    validator: (value) => Object.keys(iconPaths).includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  strokeWidth: {
    type: [String, Number],
    default: 2
  }
})

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
}

const iconClasses = computed(() => sizeClasses[props.size])
const iconPath = computed(() => iconPaths[props.name])
</script>
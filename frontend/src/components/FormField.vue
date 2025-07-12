<template>
  <div>
    <label v-if="!compact && label" :for="id" class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
    </label>
    <component
      :is="tag"
      :id="id"
      v-model="modelValue"
      v-bind="$attrs"
      :class="inputClasses"
      class="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
    >
      <slot />
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Array], default: '' },
  label: { type: String, default: '' },
  id: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  tag: { type: String, default: 'input' }
})

const emit = defineEmits(['update:modelValue'])

const inputClasses = computed(() => 
  props.compact ? 'px-2 py-1 text-sm' : 'px-3 py-1.5'
)

const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
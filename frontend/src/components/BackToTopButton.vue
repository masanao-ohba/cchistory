<template>
  <button
    @click="$emit('click')"
    class="fixed bottom-4 left-4 bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-40"
    :title="$t('app.backToTop')"
  >
    <BaseIcon name="arrowUp" class="text-white" />
  </button>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import BaseIcon from './BaseIcon.vue'

const { t: $t } = useI18n()

defineEmits(['click'])
</script>
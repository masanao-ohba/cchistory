<template>
  <div class="bg-white rounded-lg shadow-md p-4 mb-0">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        v-for="card in statsCards"
        :key="card.type"
        :value="formatNumber(card.value)"
        :label="$t(card.labelKey)"
        :color="card.color"
        :type="card.type"
      />
    </div>

    <!-- 日別グラフ（簡易版） -->
    <div class="mt-4">
      <h3 class="text-lg font-medium text-gray-900 mb-3">{{ $t('statistics.dailyConversations') }}</h3>
      <div class="flex flex-col">
        <!-- グラフ本体エリア -->
        <div class="flex">
          <!-- Y軸ラベル -->
          <div class="flex flex-col justify-between text-xs text-gray-500 pr-2 h-20 py-1 text-right min-w-[24px]">
            <span v-for="label in yAxisLabels" :key="label">{{ label }}</span>
          </div>

          <!-- グラフエリア -->
          <div class="flex-1 bg-gray-50 border border-gray-200 rounded p-1 relative">
            <!-- 横線グリッド -->
            <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div class="border-t border-gray-300 opacity-30"></div>
              <div class="border-t border-gray-300 opacity-30"></div>
              <div class="border-t border-gray-300 opacity-30"></div>
              <div class="border-t border-gray-300 opacity-30"></div>
            </div>

            <div class="flex items-end space-x-1 h-20 relative">
              <div
                v-for="(day, index) in dailyData"
                :key="index"
                :class="[
                  'flex-1 rounded-t transition-all duration-300',
                  day.count > 0 ? 'bg-blue-400 hover:bg-blue-500' : 'bg-gray-200'
                ]"
                :style="{ height: day.count > 0 ? `${Math.max(5, (day.count / maxDaily) * 100)}%` : '2px' }"
                :title="`${formatDate(day.date)}: ${day.count}${$t('statistics.items')}`"
              ></div>
            </div>
          </div>
        </div>

        <!-- X軸ラベル -->
        <div class="flex ml-[32px]">
          <div class="flex space-x-1 flex-1 text-xs text-gray-500 mt-1">
            <div
              v-for="(day, index) in dailyData"
              :key="index"
              class="flex-1 text-center"
            >
              {{ formatDateLabel(day.date, index) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatCard from './StatCard.vue'
import { statsConfig } from '../assets/icons.js'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({})
  }
})

const formatNumber = (num) => new Intl.NumberFormat('ja-JP').format(num)

const statsCards = computed(() =>
  statsConfig.map(config => ({
    ...config,
    value: props.stats[config.valueField] || 0
  }))
)

const dailyData = computed(() => {
  if (!props.stats.daily_thread_counts) {
    // データがない場合は過去30日分の空のデータを生成
    const today = new Date()
    const dummyData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dummyData.push({
        date: date.toISOString().split('T')[0],
        count: 0
      })
    }
    return dummyData
  }

  const counts = props.stats.daily_thread_counts
  const dates = Object.keys(counts).sort().slice(-30) // 過去30日

  return dates.map(date => ({
    date,
    count: counts[date]
  }))
})

const maxDaily = computed(() => {
  if (dailyData.value.length === 0) return 5
  const max = Math.max(...dailyData.value.map(d => d.count))
  if (max === 0) return 5

  // 適切なスケール上限を計算
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const normalized = max / magnitude

  let scale
  if (normalized <= 1) scale = 1
  else if (normalized <= 2) scale = 2
  else if (normalized <= 5) scale = 5
  else scale = 10

  return scale * magnitude
})

const yAxisLabels = computed(() => {
  const max = maxDaily.value
  const step = max / 4 // 4等分

  return [
    max,
    Math.round(step * 3),
    Math.round(step * 2),
    Math.round(step * 1),
    0
  ].map(val => {
    // 小さい値は整数に、大きい値は適切にフォーマット
    if (val >= 1000000) {
      return Math.round(val / 100000) * 100000
    } else if (val >= 100000) {
      return Math.round(val / 10000) * 10000
    } else if (val >= 10000) {
      return Math.round(val / 1000) * 1000
    } else if (val >= 1000) {
      return Math.round(val / 100) * 100
    } else if (val >= 100) {
      return Math.round(val / 10) * 10
    } else {
      return Math.round(val)
    }
  })
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

const formatDateLabel = (dateString, index) => {
  const date = new Date(dateString)
  const day = date.getDate()

  // 最初、最後、または月の1日、または5の倍数の日のみ表示
  if (index === 0 || index === dailyData.value.length - 1 || day === 1 || day % 5 === 0) {
    return `${date.getMonth() + 1}/${day}`
  }
  return ''
}
</script>

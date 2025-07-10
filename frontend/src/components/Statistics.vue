<template>
  <div class="bg-white rounded-lg shadow-md p-6 mb-0">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- 全会話数 -->
      <div class="text-center">
        <div class="text-3xl font-bold text-primary-600">
          {{ formatNumber(stats.total_conversations || 0) }}
        </div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">
          全会話数
        </div>
      </div>

      <!-- フィルター結果 -->
      <div class="text-center">
        <div class="text-3xl font-bold text-green-600">
          {{ formatNumber(filteredCount) }}
        </div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">
          フィルター結果
        </div>
      </div>

      <!-- セッション数 -->
      <div class="text-center">
        <div class="text-3xl font-bold text-blue-600">
          {{ formatNumber(stats.unique_sessions || 0) }}
        </div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">
          セッション数
        </div>
      </div>

      <!-- プロジェクト数 -->
      <div class="text-center">
        <div class="text-3xl font-bold text-purple-600">
          {{ formatNumber(stats.projects || 0) }}
        </div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">
          プロジェクト数
        </div>
      </div>
    </div>

    <!-- 日別グラフ（簡易版） -->
    <div class="mt-4">
      <h3 class="text-lg font-medium text-gray-900 mb-3">日別会話数（過去30日）</h3>
      <div class="flex items-end space-x-1 h-20 bg-gray-50 border border-gray-200 rounded p-1">
        <div
          v-for="(day, index) in dailyData"
          :key="index"
          :class="[
            'flex-1 rounded-t transition-all duration-300',
            day.count > 0 ? 'bg-blue-400 hover:bg-blue-500' : 'bg-gray-200'
          ]"
          :style="{ height: day.count > 0 ? `${Math.max(5, (day.count / maxDaily) * 100)}%` : '2px' }"
          :title="`${day.date}: ${day.count}件`"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({})
  },
  filteredCount: {
    type: Number,
    default: 0
  }
})

// 計算プロパティ
const formatNumber = (num) => {
  return new Intl.NumberFormat('ja-JP').format(num)
}

const dailyData = computed(() => {
  if (!props.stats.daily_counts) {
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
  
  const counts = props.stats.daily_counts
  const dates = Object.keys(counts).sort().slice(-30) // 過去30日
  
  return dates.map(date => ({
    date,
    count: counts[date]
  }))
})

const maxDaily = computed(() => {
  if (dailyData.value.length === 0) return 1
  const max = Math.max(...dailyData.value.map(d => d.count))
  return max > 0 ? max : 1
})
</script>
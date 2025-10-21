'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface DailyConversationChartProps {
  dailyThreadCounts?: Record<string, number>;
}

interface DailyData {
  date: string;
  count: number;
}

export default function DailyConversationChart({ dailyThreadCounts = {} }: DailyConversationChartProps) {
  const t = useTranslations('statistics');

  // Generate daily data (last 30 days)
  const dailyData = useMemo<DailyData[]>(() => {
    const counts = dailyThreadCounts;

    if (!counts || Object.keys(counts).length === 0) {
      // Generate empty data for last 30 days
      const today = new Date();
      const dummyData: DailyData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dummyData.push({
          date: date.toISOString().split('T')[0],
          count: 0,
        });
      }
      return dummyData;
    }

    const dates = Object.keys(counts).sort().slice(-30); // Last 30 days

    return dates.map((date) => ({
      date,
      count: counts[date],
    }));
  }, [dailyThreadCounts]);

  // Calculate max value for scaling
  const maxDaily = useMemo(() => {
    if (dailyData.length === 0) return 5;
    const max = Math.max(...dailyData.map((d) => d.count));
    if (max === 0) return 5;

    // Calculate appropriate scale maximum
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const normalized = max / magnitude;

    let scale: number;
    if (normalized <= 1) scale = 1;
    else if (normalized <= 2) scale = 2;
    else if (normalized <= 5) scale = 5;
    else scale = 10;

    return scale * magnitude;
  }, [dailyData]);

  // Calculate Y-axis labels
  const yAxisLabels = useMemo(() => {
    const max = maxDaily;
    const step = max / 4; // 4 divisions

    return [max, Math.round(step * 3), Math.round(step * 2), Math.round(step * 1), 0].map(
      (val) => {
        // Format large values appropriately
        if (val >= 1000000) {
          return Math.round(val / 100000) * 100000;
        } else if (val >= 100000) {
          return Math.round(val / 10000) * 10000;
        } else if (val >= 10000) {
          return Math.round(val / 1000) * 1000;
        } else if (val >= 1000) {
          return Math.round(val / 100) * 100;
        } else if (val >= 100) {
          return Math.round(val / 10) * 10;
        } else {
          return Math.round(val);
        }
      }
    );
  }, [maxDaily]);

  // Format date for tooltip
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  // Format date label for X-axis
  const formatDateLabel = (dateString: string, index: number): string => {
    const date = new Date(dateString);
    const day = date.getDate();

    // Show only first, last, 1st of month, or multiples of 5
    if (
      index === 0 ||
      index === dailyData.length - 1 ||
      day === 1 ||
      day % 5 === 0
    ) {
      return `${date.getMonth() + 1}/${day}`;
    }
    return '';
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">
        {t('dailyConversations')}
      </h3>
      <div className="flex flex-col">
        {/* Graph area */}
        <div className="flex">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between text-xs text-gray-500 pr-2 h-20 py-1 text-right min-w-[24px]">
            {yAxisLabels.map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-1 relative">
            {/* Horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-gray-300 opacity-30"></div>
              <div className="border-t border-gray-300 opacity-30"></div>
              <div className="border-t border-gray-300 opacity-30"></div>
              <div className="border-t border-gray-300 opacity-30"></div>
            </div>

            {/* Bars */}
            <div className="flex items-end space-x-1 h-20 relative">
              {dailyData.map((day, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    day.count > 0
                      ? 'bg-blue-400 hover:bg-blue-500 cursor-pointer'
                      : 'bg-gray-200'
                  }`}
                  style={{
                    height:
                      day.count > 0
                        ? `${Math.max(5, (day.count / maxDaily) * 100)}%`
                        : '2px',
                  }}
                  title={`${formatDate(day.date)}: ${day.count}${t('items')}`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex ml-[32px]">
          <div className="flex space-x-1 flex-1 text-xs text-gray-500 mt-1">
            {dailyData.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                {formatDateLabel(day.date, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

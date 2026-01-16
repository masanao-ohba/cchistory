/**
 * ProjectTabs Component
 *
 * プロジェクト毎にタブ切り替えを行うコンポーネント
 * タブで大まかなプロジェクトフィルタリングを提供し、
 * FilterPanelでの詳細な絞り込みと連携する
 */
'use client';

import React, { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';

export interface ProjectTab {
  id: string;
  displayName: string;
  messageCount?: number;
  lastMessageTime?: string;
}

export interface ProjectTabsProps {
  projects: ProjectTab[];
  selectedTabId: string;
  onTabChange: (projectId: string) => void;
  totalMessageCount?: number;
  loading?: boolean;
}

export default function ProjectTabs({
  projects,
  selectedTabId,
  onTabChange,
  totalMessageCount,
  loading = false
}: ProjectTabsProps) {
  const t = useTranslations('projectTabs');

  // プロジェクトタブリストを作成（全プロジェクトタブを含む）
  const tabs = useMemo(() => {
    const allTab: ProjectTab = {
      id: 'all',
      displayName: t('allProjects'),
      messageCount: totalMessageCount
    };

    return [allTab, ...projects];
  }, [projects, totalMessageCount, t]);

  // 選択されたタブが存在しない場合、デフォルトタブを選択
  useEffect(() => {
    const tabExists = tabs.some(tab => tab.id === selectedTabId);
    if (!tabExists && tabs.length > 0) {
      // 最新のメッセージを持つプロジェクトを選択
      const defaultTab = projects.length > 0 && projects[0].lastMessageTime
        ? projects.reduce((latest, current) => {
            if (!latest.lastMessageTime) return current;
            if (!current.lastMessageTime) return latest;
            return new Date(current.lastMessageTime) > new Date(latest.lastMessageTime)
              ? current
              : latest;
          })
        : tabs[0]; // 全プロジェクトタブを選択

      if (defaultTab) {
        onTabChange(defaultTab.id);
      }
    }
  }, [tabs, selectedTabId, projects, onTabChange]);

  return (
    <div className="flex items-center min-w-0">
      {/* タブスクロールコンテナ */}
      <div className="flex-1 overflow-x-auto min-w-0">
        <div className="flex gap-1 w-max" role="tablist">
              {tabs.map((tab) => {
                const isSelected = tab.id === selectedTabId;
                const isAllTab = tab.id === 'all';

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => onTabChange(tab.id)}
                    disabled={loading}
                    className={`
                      flex items-center gap-2 px-4 py-3
                      text-sm font-medium whitespace-nowrap
                      transition-all duration-200
                      min-w-[100px]
                      border-b-4
                      ${isSelected
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isAllTab ? 'font-semibold' : ''}
                      focus:outline-none
                    `}
                  >
                    {/* タブラベル */}
                    <span className="truncate max-w-[200px]" title={tab.displayName}>
                      {tab.displayName}
                    </span>

                    {/* メッセージカウント（オプション） */}
                    {tab.messageCount !== undefined && tab.messageCount > 0 && (
                      <span className={`
                        inline-flex items-center justify-center
                        px-2 py-0.5 text-xs rounded-full
                        ${isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                        }
                      `}>
                        {tab.messageCount > 999 ? '999+' : tab.messageCount}
                      </span>
                    )}

                    {/* 新着インジケーター（今後の拡張用） */}
                    {tab.lastMessageTime && isNewMessage(tab.lastMessageTime) && !isSelected && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"
                            aria-label={t('newMessage')} />
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {/* スクロールインジケーター（タブが多い場合） */}
      {tabs.length > 5 && (
        <div className="flex-shrink-0 pl-2">
          <div className="text-xs text-gray-400">
            {t('scrollHint')}
          </div>
        </div>
      )}

      {/* ローディング状態 */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}

/**
 * メッセージが新着かどうかを判定するヘルパー関数
 * 24時間以内のメッセージを新着とする
 */
function isNewMessage(timestamp: string): boolean {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 24;
}
'use client';

import { useMemo } from 'react';
import { Message, Project } from '../types/message';
import { NewMessageManager } from '../types/newMessageManager';
import { ProjectTab } from '@/components/ProjectTabs';
import { extractProjectIdFromGroup } from '../utils/project';

interface ProjectsData {
  projects?: Project[];
}

export function useProjectTabs(
  accumulatedConversations: Message[][],
  projectsData: ProjectsData | undefined,
  newMessageManager: Pick<NewMessageManager, 'getUnreadCount'>,
  conversationsLoading: boolean
): {
  projectTabs: ProjectTab[];
  totalAllProjectsUnreadCount: number;
} {
  // Calculate project statistics and create ProjectTab data with unread counts
  const projectTabs = useMemo((): ProjectTab[] => {
    if (!projectsData?.projects) {
      return [];
    }

    const projectStats = new Map<string, {
      totalCount: number;
      unreadCount: number;
      lastTime: string | null;
    }>();

    // Initialize stats for all projects
    projectsData.projects.forEach((project) => {
      const projectId = project.id;
      projectStats.set(projectId, {
        totalCount: 0,
        unreadCount: 0,
        lastTime: null,
      });
    });

    // Calculate statistics from currently displayed conversations
    accumulatedConversations.forEach((group: Message[]) => {
      if (group.length > 0) {
        const firstMessage = group[0];
        const projectId = extractProjectIdFromGroup(group) ?? 'unknown';

        if (projectId && projectStats.has(projectId)) {
          const stats = projectStats.get(projectId)!;
          stats.totalCount += group.length;

          // Count unread messages in this group
          const unreadCount = newMessageManager.getUnreadCount(group);
          stats.unreadCount += unreadCount;

          // Update last message time if this is more recent
          const messageTime = firstMessage.created || firstMessage.timestamp;
          if (!stats.lastTime || (messageTime && new Date(messageTime) > new Date(stats.lastTime))) {
            stats.lastTime = messageTime;
          }
        }
      }
    });

    // Create ProjectTab array with unread counts
    return Array.from(projectStats.entries()).map(([projectId, stats]) => {
      const project = projectsData.projects!.find((p) => p.id === projectId);
      const displayName = project?.display_name || projectId;

      return {
        id: projectId,
        displayName,
        messageCount: stats.unreadCount,
        lastMessageTime: stats.lastTime || undefined,
      };
    }).sort((a, b) => {
      // Sort by last message time (most recent first)
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }, [accumulatedConversations, projectsData?.projects, newMessageManager]);

  // Calculate total unread message count as sum of individual project unread counts
  const totalAllProjectsUnreadCount = useMemo(() => {
    // During initial loading, return 0 to avoid showing "999+"
    if (!projectTabs || projectTabs.length === 0 || conversationsLoading) return 0;
    // Sum up unread counts from all individual project tabs
    return projectTabs.reduce((total, tab) => {
      return total + (tab.messageCount || 0);
    }, 0);
  }, [projectTabs, conversationsLoading]);

  return {
    projectTabs,
    totalAllProjectsUnreadCount,
  };
}

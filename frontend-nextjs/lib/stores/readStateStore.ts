'use client';

import { create } from 'zustand';

interface ReadState {
  // Set of message IDs that have been read
  readMessageIds: Set<string>;
  // Mark messages as read
  markAsRead: (messageIds: string[]) => void;
  // Mark all messages as read for a project
  markAllAsRead: (projectId: string, messageIds: string[]) => void;
  // Check if a message is unread
  isUnread: (messageId: string) => boolean;
  // Get unread count for an array of messages
  getUnreadCount: (messages: any[]) => number;
  // Clear all read state
  clearReadState: () => void;
}

// Helper to generate message ID
export const getMessageId = (message: any): string => {
  // Use a combination of project, timestamp, and content hash for unique ID
  const project = message.project_path || message.project || 'unknown';
  const timestamp = message.created || message.timestamp || '';
  const content = message.content || '';
  return `${project}:${timestamp}:${content.substring(0, 50)}`;
};

export const useReadStateStore = create<ReadState>()((set, get) => ({
  readMessageIds: new Set<string>(),

  markAsRead: (messageIds) => {
    set((state) => ({
      readMessageIds: new Set([...state.readMessageIds, ...messageIds]),
    }));
  },

  markAllAsRead: (projectId, messageIds) => {
    set((state) => ({
      readMessageIds: new Set([...state.readMessageIds, ...messageIds]),
    }));
  },

  isUnread: (messageId) => {
    return !get().readMessageIds.has(messageId);
  },

  getUnreadCount: (messages) => {
    const state = get();
    return messages.filter((message) => {
      const messageId = getMessageId(message);
      return !state.readMessageIds.has(messageId);
    }).length;
  },

  clearReadState: () => {
    set({ readMessageIds: new Set<string>() });
  },
}));
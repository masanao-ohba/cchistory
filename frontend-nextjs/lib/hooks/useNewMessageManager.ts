'use client';

import { useRef } from 'react';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  uuid?: string;
  [key: string]: any;
}

interface GroupState {
  read: Message[];
  unread: Message[];
}

/**
 * New message display manager
 *
 * Clear state management using read/unread
 * - read: Displayed messages (initially displayed or shown via button click)
 * - unread: Undisplayed new messages (added via WebSocket updates)
 */
export function useNewMessageManager() {
  // GroupID → { read: Message[], unread: Message[] }
  const groupStatesRef = useRef<Map<string, GroupState>>(new Map());

  /**
   * Get unique group identifier
   * Uses the UUID of the first user message in the group
   */
  const getGroupId = (group: Message[]): string | null => {
    if (!Array.isArray(group) || group.length === 0) return null;

    // First message should be a user message
    const firstMessage = group[0];
    if (firstMessage && firstMessage.type === 'user' && firstMessage.uuid) {
      return firstMessage.uuid;
    }

    // If first is not user message, find the first user message
    const firstUserMessage = group.find((msg) => msg.type === 'user' && msg.uuid);
    return firstUserMessage?.uuid ?? null;
  };

  /**
   * Set initial state (on reload/initial load)
   * All messages go to read, unread is empty
   * First 2 messages are always visible, rest start as read
   */
  const setInitialMessages = (conversations: Message[][]) => {
    // Clear existing state
    groupStatesRef.current.clear();

    conversations.forEach((group) => {
      if (Array.isArray(group) && group.length > 0) {
        const groupId = getGroupId(group);
        if (groupId) {
          // First 2 messages are always immediately visible
          // Remaining messages start as read (will be visible after clicking button)
          groupStatesRef.current.set(groupId, {
            read: group.length > 2 ? group.slice(2) : [], // Messages from index 2 onwards
            unread: [], // unread initialized as empty
          });
        }
      }
    });
  };

  /**
   * Add new messages (on WebSocket update)
   * Add messages not in existing read to unread
   * Only process messages from index 2 onwards (first 2 are always visible)
   */
  const addNewMessages = (conversations: Message[][]) => {
    conversations.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;

      const groupId = getGroupId(group);
      if (!groupId) return;

      const currentState = groupStatesRef.current.get(groupId);
      if (!currentState) {
        // Create new group if doesn't exist (new group)
        // First 2 messages are always visible, rest go to read
        groupStatesRef.current.set(groupId, {
          read: group.length > 2 ? group.slice(2) : [],
          unread: [],
        });
        return;
      }

      // Create UUID set for existing read and unread messages
      const readUuids = new Set(currentState.read.map((msg) => msg.uuid).filter((uuid) => uuid));
      const unreadUuids = new Set(currentState.unread.map((msg) => msg.uuid).filter((uuid) => uuid));

      // Only consider messages from index 2 onwards
      const messagesFromIndexTwo = group.slice(2);

      // Add new messages (not in read or unread) to unread
      const newMessages = messagesFromIndexTwo.filter((msg) => {
        // Don't treat as new if no UUID (for safety)
        if (!msg.uuid) return false;

        // New messages are those not in read or unread
        return !readUuids.has(msg.uuid) && !unreadUuids.has(msg.uuid);
      });

      if (newMessages.length > 0) {
        currentState.unread.push(...newMessages);
      }
    });
  };

  /**
   * Get messages for display
   * Always show first 2 messages (user + first assistant), hide unread messages after that
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDisplayMessages = (group: Message[], _groupIndex: number): Message[] => {
    if (!Array.isArray(group)) return [];

    const groupId = getGroupId(group);
    if (!groupId) return group; // Return original group if groupId cannot be obtained

    const state = groupStatesRef.current.get(groupId);
    if (!state) return group;

    // Always include first 2 messages + read messages
    const firstTwoMessages = group.slice(0, 2);
    const remainingReadMessages = state.read.filter((msg) => {
      // Skip first 2 messages as they're already included
      if (!msg.uuid) return false;
      // UUID comparison instead of object reference
      const matchingMsg = group.find(m => m.uuid === msg.uuid);
      if (!matchingMsg) return false;
      const index = group.indexOf(matchingMsg);
      return index >= 2;
    });

    return [...firstTwoMessages, ...remainingReadMessages];
  };

  /**
   * Get unread message count
   * Only count messages from index 2 onwards (3rd message and beyond)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getUnreadCount = (group: Message[], _groupIndex: number): number => {
    if (!Array.isArray(group)) return 0;

    const groupId = getGroupId(group);
    if (!groupId) return 0;

    const state = groupStatesRef.current.get(groupId);
    if (!state) return 0;

    // Only count unread messages that are at index 2 or later in the original group
    return state.unread.filter((msg) => {
      const msgIndex = group.indexOf(msg);
      return msgIndex >= 2;
    }).length;
  };

  /**
   * Check if unread messages exist
   */
  const hasUnreadMessages = (group: Message[], groupIndex: number): boolean => {
    return getUnreadCount(group, groupIndex) > 0;
  };

  /**
   * Show new messages (on button click)
   * Move unread to read and clear unread
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showNewMessages = (group: Message[], _groupIndex: number) => {
    if (!Array.isArray(group)) return;

    const groupId = getGroupId(group);
    if (!groupId) return;

    const state = groupStatesRef.current.get(groupId);
    if (state && state.unread.length > 0) {
      // Check for UUID duplicates before moving to read
      const readUuids = new Set(state.read.map((msg) => msg.uuid).filter((uuid) => uuid));

      // Add only unread messages not in read
      const uniqueUnreadMessages = state.unread.filter((msg) => msg.uuid && !readUuids.has(msg.uuid));

      if (uniqueUnreadMessages.length > 0) {
        state.read.push(...uniqueUnreadMessages);
      }

      // Clear unread
      state.unread = [];
    }
  };

  return {
    setInitialMessages,
    addNewMessages,
    getDisplayMessages,
    getUnreadCount,
    hasUnreadMessages,
    showNewMessages,
  };
}

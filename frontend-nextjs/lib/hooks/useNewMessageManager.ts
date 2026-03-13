'use client';

import { useRef, useState } from 'react';
import { Message } from '../types/message';
import { getGroupId } from '../utils/groupId';
import { NEW_MESSAGE_START_INDEX } from '../constants/ui';

interface GroupState {
  readUuids: Set<string>;
  unreadUuids: Set<string>;
}

/**
 * New message display manager
 *
 * Uses UUID Sets instead of Message arrays to minimize memory footprint.
 * ~36 bytes per UUID vs 200-2000 bytes per Message object.
 */
export function useNewMessageManager() {
  const groupStatesRef = useRef<Map<string, GroupState>>(new Map());
  const [, setVersion] = useState(0);

  /** Resolve the GroupState for a message group. Returns null if group cannot be identified. */
  const getState = (group: Message[]): GroupState | null => {
    const id = getGroupId(group);
    return id ? groupStatesRef.current.get(id) ?? null : null;
  };

  /** Collect UUIDs from index NEW_MESSAGE_START_INDEX onwards into a new Set */
  const collectUuidsFrom2 = (group: Message[]): Set<string> => {
    const uuids = new Set<string>();
    for (let i = NEW_MESSAGE_START_INDEX; i < group.length; i++) {
      if (group[i].uuid) uuids.add(group[i].uuid!);
    }
    return uuids;
  };

  /** Register a new group with all messages from index 2+ as read */
  const initGroup = (groupId: string, group: Message[]) => {
    groupStatesRef.current.set(groupId, {
      readUuids: collectUuidsFrom2(group),
      unreadUuids: new Set<string>(),
    });
  };

  const setInitialMessages = (conversations: Message[][]) => {
    groupStatesRef.current.clear();
    for (const group of conversations) {
      if (group.length === 0) continue;
      const groupId = getGroupId(group);
      if (groupId) initGroup(groupId, group);
    }
    setVersion((v) => v + 1);
  };

  const addNewMessages = (conversations: Message[][]) => {
    for (const group of conversations) {
      if (group.length === 0) continue;
      const groupId = getGroupId(group);
      if (!groupId) continue;

      const state = groupStatesRef.current.get(groupId);
      if (!state) {
        initGroup(groupId, group);
        continue;
      }

      for (let i = NEW_MESSAGE_START_INDEX; i < group.length; i++) {
        const uuid = group[i].uuid;
        if (uuid && !state.readUuids.has(uuid) && !state.unreadUuids.has(uuid)) {
          state.unreadUuids.add(uuid);
        }
      }
    }
    setVersion((v) => v + 1);
  };

  /** Always show first 2 messages + read messages. Untracked groups show everything. */
  const getDisplayMessages = (group: Message[]): Message[] => {
    const state = getState(group);
    if (!state) return group;

    const result: Message[] = [];
    for (let i = 0; i < group.length; i++) {
      if (i < NEW_MESSAGE_START_INDEX || !group[i].uuid || state.readUuids.has(group[i].uuid!)) {
        result.push(group[i]);
      }
    }
    return result;
  };

  /** O(1) unread count via Set.size */
  const getUnreadCount = (group: Message[]): number => {
    return getState(group)?.unreadUuids.size ?? 0;
  };

  const hasUnreadMessages = (group: Message[]): boolean => {
    return getUnreadCount(group) > 0;
  };

  /** Move all unread UUIDs to read set */
  const showNewMessages = (group: Message[]) => {
    const state = getState(group);
    if (!state || state.unreadUuids.size === 0) return;
    for (const uuid of state.unreadUuids) {
      state.readUuids.add(uuid);
    }
    state.unreadUuids.clear();
    setVersion((v) => v + 1);
  };

  /** Remove entries for groups no longer displayed */
  const cleanup = (validGroupIds: Set<string>) => {
    const states = groupStatesRef.current;
    for (const key of states.keys()) {
      if (!validGroupIds.has(key)) states.delete(key);
    }
  };

  return {
    setInitialMessages,
    addNewMessages,
    getDisplayMessages,
    getUnreadCount,
    hasUnreadMessages,
    showNewMessages,
    cleanup,
  };
}

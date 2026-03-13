'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Message } from '../types/message';
import { NewMessageManager } from '../types/newMessageManager';
import { getGroupId } from '../utils/groupId';

interface ConversationsData {
  conversations?: Message[][];
  total_threads?: number;
  actual_threads?: number;
}

export function useAccumulatedConversations(
  conversationsData: ConversationsData | undefined,
  offset: number,
  newMessageManager: Pick<NewMessageManager, 'setInitialMessages' | 'addNewMessages' | 'cleanup'>
): {
  accumulatedConversations: Message[][];
  hasMore: boolean;
  resetAccumulation: () => void;
} {
  const [accumulatedConversations, setAccumulatedConversations] = useState<Message[][]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Track if this is the first load
  const isFirstLoadRef = useRef(true);
  // Ref to track latest accumulated conversations for stale-closure-safe reads
  const accumulatedRef = useRef(accumulatedConversations);
  accumulatedRef.current = accumulatedConversations;

  useEffect(() => {
    if (conversationsData?.conversations) {
      // Compute allConversations from the ref (avoids stale closure)
      const allConversations = offset === 0
        ? conversationsData.conversations
        : [...accumulatedRef.current, ...conversationsData.conversations];

      // Update accumulated state
      setAccumulatedConversations(allConversations);

      // On first load: set all messages as read
      // On subsequent updates: add new messages as unread
      if (isFirstLoadRef.current) {
        newMessageManager.setInitialMessages(allConversations);
        isFirstLoadRef.current = false;
      } else {
        newMessageManager.addNewMessages(allConversations);
      }

      // Cleanup stale group states on offset=0 reset
      if (offset === 0) {
        const validGroupIds = new Set<string>();
        for (const group of allConversations) {
          if (group.length === 0) continue;
          const id = getGroupId(group);
          if (id) validGroupIds.add(id);
        }
        newMessageManager.cleanup(validGroupIds);
      }

      setHasMore((conversationsData.total_threads ?? 0) > allConversations.length);
    }
  }, [conversationsData?.conversations, conversationsData?.total_threads, conversationsData?.actual_threads, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAccumulation = useCallback(() => {
    setAccumulatedConversations([]);
  }, []);

  return {
    accumulatedConversations,
    hasMore,
    resetAccumulation,
  };
}

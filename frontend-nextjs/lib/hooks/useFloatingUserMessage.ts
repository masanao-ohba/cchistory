import { useEffect, useState, useRef, MutableRefObject } from 'react';
import { Message } from '@/lib/types/message';
import { NewMessageManager } from '@/lib/types/newMessageManager';
import { FLOATING_MSG_ROOTMARGIN, GROUP_VISIBILITY_THRESHOLD } from '@/lib/constants/ui';

interface FloatingMessage {
  message: Message;
  groupIndex: number;
}

export function useFloatingUserMessage(
  conversations: Message[][],
  tallGroups: Set<number>,
  newMessageManager: NewMessageManager | null,
  groupRefs: MutableRefObject<Map<number, HTMLDivElement>>,
  userMessageRefs: MutableRefObject<Map<number, HTMLDivElement>>
) {
  const [floatingUserMessage, setFloatingUserMessage] = useState<FloatingMessage | null>(null);
  const visibleGroupsRef = useRef(new Set<number>());

  useEffect(() => {
    const groupCallbacks = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>();
    const userMsgCallbacks = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>();

    const groupObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          groupCallbacks.get(entry.target)?.(entry);
        }
      },
      { threshold: GROUP_VISIBILITY_THRESHOLD }
    );

    const userMsgObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          userMsgCallbacks.get(entry.target)?.(entry);
        }
      },
      { rootMargin: FLOATING_MSG_ROOTMARGIN }
    );

    const clearIfMatch = (groupIndex: number) =>
      setFloatingUserMessage(prev =>
        prev?.groupIndex === groupIndex ? null : prev
      );

    groupRefs.current.forEach((element, groupIndex) => {
      groupCallbacks.set(element, (entry) => {
        if (entry.isIntersecting) {
          visibleGroupsRef.current.add(groupIndex);
        } else {
          visibleGroupsRef.current.delete(groupIndex);
          clearIfMatch(groupIndex);
        }
      });
      groupObserver.observe(element);
    });

    userMessageRefs.current.forEach((element, groupIndex) => {
      userMsgCallbacks.set(element, (entry) => {
        const group = conversations[groupIndex];
        if (!group) return;

        if (entry.isIntersecting) {
          clearIfMatch(groupIndex);
          return;
        }

        // User message scrolled out — show floating if group is tall and visible
        if (!tallGroups.has(groupIndex) || !visibleGroupsRef.current.has(groupIndex)) return;

        const displayMessages = newMessageManager
          ? newMessageManager.getDisplayMessages(group)
          : group;
        const userMessage = displayMessages.find(msg => msg.type === 'user');
        if (userMessage) {
          setFloatingUserMessage({ message: userMessage, groupIndex });
        }
      });
      userMsgObserver.observe(element);
    });

    return () => {
      groupObserver.disconnect();
      userMsgObserver.disconnect();
    };
  }, [conversations, tallGroups, newMessageManager, groupRefs, userMessageRefs]);

  return floatingUserMessage;
}

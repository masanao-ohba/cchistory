import { useEffect, useState, useRef, MutableRefObject } from 'react';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  uuid?: string;
  session_id?: string;
}

interface FloatingMessage {
  message: Message;
  groupIndex: number;
}

interface NewMessageManager {
  getDisplayMessages: (group: Message[], groupIndex: number) => Message[];
}

/**
 * Custom hook to manage floating user message display for tall conversation groups.
 *
 * Why this is important:
 *   Without this hook, users lose context when scrolling long assistant responses.
 *   The floating message shows what question is being answered.
 *
 * @param conversations - Array of message groups
 * @param tallGroups - Set of group indices that need floating context
 * @param stickyTopOffset - Offset for sticky positioning (filter bar height)
 * @param newMessageManager - Manager for handling display messages
 * @param groupRefs - Map of group indices to DOM elements
 * @param userMessageRefs - Map of group indices to user message DOM elements
 * @returns Floating message state (message + groupIndex) or null
 */
export function useFloatingUserMessage(
  conversations: Message[][],
  tallGroups: Set<number>,
  stickyTopOffset: number,
  newMessageManager: NewMessageManager | null,
  groupRefs: MutableRefObject<Map<number, HTMLDivElement>>,
  userMessageRefs: MutableRefObject<Map<number, HTMLDivElement>>
) {
  const [floatingUserMessage, setFloatingUserMessage] = useState<FloatingMessage | null>(null);
  const CONTEXT_BAR_ROOT_MARGIN_OFFSET = 80;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibleGroupsRef = new Set<number>();

    // Observe message group visibility
    groupRefs.current.forEach((element, groupIndex) => {
      const mgObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visibleGroupsRef.add(groupIndex);
          } else {
            visibleGroupsRef.delete(groupIndex);
            setFloatingUserMessage(prev =>
              prev && prev.groupIndex === groupIndex ? null : prev
            );
          }
        },
        {
          threshold: 0.1,
        }
      );

      mgObserver.observe(element);
      observers.push(mgObserver);
    });

    // Observe user message visibility
    userMessageRefs.current.forEach((element, groupIndex) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!conversations[groupIndex]) return;

          const group = conversations[groupIndex];
          const displayMessages = !newMessageManager || !Array.isArray(group)
            ? (Array.isArray(group) ? group : [])
            : newMessageManager.getDisplayMessages(group, groupIndex);
          const userMessage = displayMessages.find(msg => msg.type === 'user');

          if (!entry.isIntersecting && userMessage && tallGroups.has(groupIndex)) {
            if (visibleGroupsRef.has(groupIndex)) {
              setFloatingUserMessage({ message: userMessage, groupIndex });
            }
          } else if (entry.isIntersecting) {
            setFloatingUserMessage(prev =>
              prev && prev.groupIndex === groupIndex ? null : prev
            );
          }
        },
        {
          threshold: 0,
          rootMargin: `-${stickyTopOffset + CONTEXT_BAR_ROOT_MARGIN_OFFSET}px 0px 0px 0px`,
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [conversations, tallGroups, stickyTopOffset, newMessageManager, groupRefs, userMessageRefs]);

  return floatingUserMessage;
}

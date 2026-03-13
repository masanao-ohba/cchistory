import { Message } from './message';

/**
 * Canonical NewMessageManager interface
 * Single source of truth for the new-message tracking contract
 */
export interface NewMessageManager {
  getDisplayMessages(group: Message[]): Message[];
  hasUnreadMessages(group: Message[]): boolean;
  getUnreadCount(group: Message[]): number;
  showNewMessages(group: Message[]): void;
  setInitialMessages(conversations: Message[][]): void;
  addNewMessages(conversations: Message[][]): void;
  cleanup(validGroupIds: Set<string>): void;
}

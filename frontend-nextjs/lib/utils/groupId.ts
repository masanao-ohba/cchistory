import { Message } from '../types/message';

/**
 * Extract a stable group identifier from an array of messages.
 * Fast path: check group[0].uuid, fallback: find first message with uuid.
 */
export function getGroupId(group: Message[]): string | null {
  if (group.length === 0) return null;
  if (group[0].uuid) return group[0].uuid;
  return group.find((m) => m.uuid)?.uuid ?? null;
}

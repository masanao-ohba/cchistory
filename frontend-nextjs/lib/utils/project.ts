import { Message } from '../types/message';

/**
 * Project-like structure that may appear in message data
 * Can be either a string (project ID) or an object with id/path
 */
type ProjectLike = string | { id?: string; path?: string } | undefined | null;

interface MessageWithProject {
  project_path?: ProjectLike;
  project?: ProjectLike;
  [key: string]: unknown;
}

/**
 * Extract project ID from a message
 * Handles various formats: string, object with id, or undefined
 */
export function extractProjectId(message: MessageWithProject): string | null {
  // Try project_path first (primary field)
  if (typeof message.project_path === 'string') {
    return message.project_path;
  }
  if (message.project_path?.id) {
    return message.project_path.id;
  }

  // Fallback to project field
  if (typeof message.project === 'string') {
    return message.project;
  }
  if (message.project?.id) {
    return message.project.id;
  }

  return null;
}

/**
 * Get project ID with a fallback value
 */
export function extractProjectIdOrDefault(
  message: MessageWithProject,
  defaultValue: string = 'unknown'
): string {
  return extractProjectId(message) ?? defaultValue;
}

/**
 * Extract project ID from the first message in a conversation group
 */
export function extractProjectIdFromGroup(group: Message[]): string | null {
  if (!group || group.length === 0) return null;
  return extractProjectId(group[0] as unknown as MessageWithProject);
}

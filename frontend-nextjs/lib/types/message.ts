/**
 * Unified Message type for conversation data
 * Consolidates definitions from multiple components into a single source of truth
 */
export interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  uuid?: string;
  session_id?: string;
  is_search_match?: boolean;
  search_keyword?: string;
  is_continuation_session?: boolean;
  parent_session_id?: string;
  project?: Project;
}

export interface Project {
  id: string;
  display_name: string;
  path: string;
}

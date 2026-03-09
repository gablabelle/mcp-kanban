// ============================================================
// Core domain types for MCP Kanban
// ============================================================

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface Column {
  id: string;
  project_id: string;
  name: string;
  order: number;
}

export interface Session {
  id: string;
  name: string;
  color: string;
  branch: string | null;
  is_worktree: boolean;
  created_at: string;
}

export type Priority = "urgent" | "high" | "medium" | "low";

export interface Ticket {
  id: string;
  project_id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  priority: Priority | null;
  column_id: string;
  session_id: string | null;
  parent_ticket_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketWithSubtasks extends Ticket {
  subtasks: Ticket[];
  subtask_total: number;
  subtask_completed: number;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

export type DependencyType = "blocked_by" | "blocks" | "related_to";

export interface Dependency {
  id: string;
  ticket_id: string;
  depends_on_ticket_id: string;
  type: DependencyType;
}

// ============================================================
// WebSocket event types
// ============================================================

export type WSEventType =
  | "ticket:created"
  | "ticket:updated"
  | "ticket:moved"
  | "ticket:deleted"
  | "subtask:completed"
  | "session:created"
  | "session:deleted"
  | "column:updated";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  data: T;
}

// ============================================================
// API request/response types
// ============================================================

export interface CreateTicketInput {
  title: string;
  description?: string;
  project_id: string;
  session_id?: string;
  priority?: Priority;
  column_id?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  priority?: Priority;
  session_id?: string;
}

export interface MoveTicketInput {
  column_id: string;
  order?: number;
}

export interface CreateSubtaskInput {
  title: string;
  description?: string;
  priority?: Priority;
}

export interface CreateSessionInput {
  name: string;
  color?: string;
  branch?: string;
  is_worktree?: boolean;
}

export interface CreateDependencyInput {
  depends_on_ticket_id: string;
  type: DependencyType;
}

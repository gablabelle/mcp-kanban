import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as db from "../db/dal.js";
import { notifyServer } from "./notify.js";
import { detectGitContext } from "./git-context.js";

export function createMcpServer(defaultSessionId?: string) {
  const server = new McpServer(
    {
      name: "mcp-kanban",
      version: "0.1.0",
    },
    {
      instructions: [
        "A local Kanban board for tracking work. Columns are customizable per project — always use list_columns to discover available columns and their IDs before moving tickets.",
        "Workflow: create stories with create_ticket, break them into subtasks with create_subtask, move tickets between columns with move_ticket as work progresses, and mark subtasks done with complete_subtask.",
        "When working on a task: move it to the appropriate 'in progress' column first, update the ticket description with implementation details as you work, and move it to 'done' when complete.",
        "Use list_tickets to see current board state. Each ticket belongs to a session (auto-detected from git branch).",
      ].join(" "),
    },
  );

  // ---- create_ticket ----
  server.tool(
    "create_ticket",
    "Create a new ticket (story) on the Kanban board. Use this to plan work items. Always provide a detailed description explaining the goal and acceptance criteria. Use list_columns first to find the right column_id if placing in a specific column.",
    {
      title: z.string().describe("Short, descriptive ticket title (under 60 chars)"),
      description: z.string().optional().describe("Detailed description of the work to be done (Markdown supported). Include goals, acceptance criteria, and technical context."),
      project_id: z.string().optional().describe("Project ID (uses default project if omitted)"),
      session_id: z.string().optional().describe("Session ID to assign (auto-detected from git branch if omitted)"),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional().describe("Ticket priority: urgent for blockers, high for critical path, medium for standard work, low for nice-to-haves"),
      column_id: z.string().optional().describe("Target column ID — use list_columns to find IDs. Defaults to Backlog."),
    },
    async ({ title, description, project_id, session_id, priority, column_id }) => {
      const projectId = project_id ?? db.getOrCreateDefaultProject().id;
      const ticket = db.createTicket({
        title,
        description,
        project_id: projectId,
        session_id: session_id ?? defaultSessionId,
        priority,
        column_id,
      });
      await notifyServer("ticket:created", ticket);
      return { content: [{ type: "text" as const, text: JSON.stringify(ticket, null, 2) }] };
    },
  );

  // ---- update_ticket ----
  server.tool(
    "update_ticket",
    "Update a ticket's fields. Use this to add implementation notes, decisions, and progress details to the description as you work. Keep the description up to date so the board reflects current status.",
    {
      ticket_id: z.string().describe("Ticket ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("Updated description — append implementation notes, files changed, decisions made, or blockers encountered (Markdown supported)"),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional().describe("New priority"),
      session_id: z.string().optional().describe("New session ID"),
    },
    async ({ ticket_id, ...updates }) => {
      const ticket = db.updateTicket(ticket_id, updates);
      if (!ticket) return { content: [{ type: "text" as const, text: "Ticket not found" }], isError: true };
      await notifyServer("ticket:updated", ticket);
      return { content: [{ type: "text" as const, text: JSON.stringify(ticket, null, 2) }] };
    },
  );

  // ---- move_ticket ----
  server.tool(
    "move_ticket",
    "Move a ticket to a different column to reflect its status. Use list_columns first to discover column IDs. Move tickets to 'In Progress' when starting work, 'Review' when ready for review, 'Done' when complete. Always move BEFORE starting work so the board stays current.",
    {
      ticket_id: z.string().describe("Ticket ID to move"),
      column_id: z.string().describe("Target column ID — use list_columns to find the right one"),
      order: z.number().optional().describe("Position within the column (0 = top)"),
    },
    async ({ ticket_id, column_id, order }) => {
      const ticket = db.moveTicket(ticket_id, column_id, order);
      if (!ticket) return { content: [{ type: "text" as const, text: "Ticket not found" }], isError: true };
      await notifyServer("ticket:moved", ticket);
      return { content: [{ type: "text" as const, text: JSON.stringify(ticket, null, 2) }] };
    },
  );

  // ---- create_subtask ----
  server.tool(
    "create_subtask",
    "Create a subtask under a parent story ticket. Each subtask should be a concrete, actionable unit of work completable in a single focused session. The parent story's progress bar updates automatically as subtasks are completed.",
    {
      parent_ticket_id: z.string().describe("Parent story ticket ID"),
      title: z.string().describe("Actionable subtask title starting with a verb (e.g. 'Add...', 'Implement...', 'Fix...', 'Update...')"),
      description: z.string().optional().describe("What specifically needs to be done, including files to modify and technical approach (Markdown supported)"),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional().describe("Subtask priority"),
    },
    async ({ parent_ticket_id, title, description, priority }) => {
      const subtask = db.createSubtask(parent_ticket_id, title, description, priority);
      await notifyServer("ticket:created", subtask);
      return { content: [{ type: "text" as const, text: JSON.stringify(subtask, null, 2) }] };
    },
  );

  // ---- complete_subtask ----
  server.tool(
    "complete_subtask",
    "Mark a subtask as complete by moving it to the Done column. This automatically updates the parent story's progress bar. Use this after finishing the work for a subtask and updating its description with what was done.",
    {
      ticket_id: z.string().describe("Subtask ticket ID to mark as complete"),
    },
    async ({ ticket_id }) => {
      const ticket = db.getTicket(ticket_id);
      if (!ticket) return { content: [{ type: "text" as const, text: "Ticket not found" }], isError: true };

      const doneCol = db.getDoneColumn(ticket.project_id);
      if (!doneCol) return { content: [{ type: "text" as const, text: "Done column not found" }], isError: true };

      const moved = db.moveTicket(ticket_id, doneCol.id);
      await notifyServer("subtask:completed", moved);

      // Include parent progress if this is a subtask
      let progress = null;
      if (ticket.parent_ticket_id) {
        progress = db.getStoryProgress(ticket.parent_ticket_id);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ticket: moved, progress }, null, 2) }],
      };
    },
  );

  // ---- create_session ----
  server.tool(
    "create_session",
    "Create a new AI agent session",
    {
      name: z.string().describe("Session name"),
      color: z.string().optional().describe("Session color (hex, auto-assigned if omitted)"),
    },
    async ({ name, color }) => {
      const session = db.createSession({ name, color });
      await notifyServer("session:created", session);
      return { content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }] };
    },
  );

  // ---- delete_session ----
  server.tool(
    "delete_session",
    "Delete an AI agent session (tickets are preserved but unlinked)",
    {
      session_id: z.string().describe("Session ID to delete"),
    },
    async ({ session_id }) => {
      const deleted = db.deleteSession(session_id);
      if (!deleted) return { content: [{ type: "text" as const, text: "Session not found" }], isError: true };
      await notifyServer("session:deleted", { id: session_id });
      return { content: [{ type: "text" as const, text: "Session deleted" }] };
    },
  );

  // ---- list_tickets ----
  server.tool(
    "list_tickets",
    "List tickets on the board. Use this to see current board state, find ticket IDs, and check what work exists before creating new tickets. Returns all top-level stories and subtasks matching the filters.",
    {
      project_id: z.string().optional().describe("Filter by project ID (uses default if omitted)"),
      column_id: z.string().optional().describe("Filter by column ID to see tickets in a specific column"),
      session_id: z.string().optional().describe("Filter by session ID to see tickets for a specific agent session"),
      parent_ticket_id: z.string().optional().describe("Filter by parent ticket ID to list subtasks of a story"),
    },
    async (filters) => {
      const tickets = db.listTickets(filters);
      return { content: [{ type: "text" as const, text: JSON.stringify(tickets, null, 2) }] };
    },
  );

  // ---- get_ticket ----
  server.tool(
    "get_ticket",
    "Get full details for a ticket including its subtasks, attachments, and dependencies. Use this to read the full description and see subtask progress before starting work on a story.",
    {
      ticket_id: z.string().describe("Ticket ID to retrieve"),
    },
    async ({ ticket_id }) => {
      const ticket = db.getTicketWithSubtasks(ticket_id);
      if (!ticket) return { content: [{ type: "text" as const, text: "Ticket not found" }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(ticket, null, 2) }] };
    },
  );

  // ---- list_sessions ----
  server.tool(
    "list_sessions",
    "List all AI agent sessions",
    {},
    async () => {
      const sessions = db.listSessions();
      return { content: [{ type: "text" as const, text: JSON.stringify(sessions, null, 2) }] };
    },
  );

  // ---- list_columns ----
  server.tool(
    "list_columns",
    "List all columns and their IDs for a project. Always call this before move_ticket to discover the correct column IDs — columns are user-customizable and may not match default names.",
    {
      project_id: z.string().optional().describe("Project ID (uses default project if omitted)"),
    },
    async ({ project_id }) => {
      const projectId = project_id ?? db.getOrCreateDefaultProject().id;
      const cols = db.getColumns(projectId);
      return { content: [{ type: "text" as const, text: JSON.stringify(cols, null, 2) }] };
    },
  );

  // ---- delete_ticket ----
  server.tool(
    "delete_ticket",
    "Permanently delete a ticket and all its subtasks. Use with caution — prefer moving to Done or updating the description to explain why it's no longer needed.",
    {
      ticket_id: z.string().describe("Ticket ID to permanently delete"),
    },
    async ({ ticket_id }) => {
      const deleted = db.deleteTicket(ticket_id);
      if (!deleted) return { content: [{ type: "text" as const, text: "Ticket not found" }], isError: true };
      await notifyServer("ticket:deleted", { id: ticket_id });
      return { content: [{ type: "text" as const, text: "Ticket deleted" }] };
    },
  );

  return server;
}

// Run as standalone MCP server via stdio
export async function startMcpServer() {
  db.runMigrations();

  // Auto-detect git branch and find-or-create a session for it
  let defaultSessionId: string | undefined;
  const gitContext = detectGitContext();
  if (gitContext) {
    const existing = db.findSessionByBranch(gitContext.branch);
    if (existing) {
      defaultSessionId = existing.id;
    } else {
      const session = db.createSession({
        name: gitContext.branch,
        branch: gitContext.branch,
        is_worktree: gitContext.isWorktree,
      });
      defaultSessionId = session.id;
    }
  }

  const server = createMcpServer(defaultSessionId);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (
  process.argv[1]?.endsWith("mcp/index.ts") ||
  process.argv[1]?.endsWith("mcp/index.js")
) {
  startMcpServer().catch(console.error);
}

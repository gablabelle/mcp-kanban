import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================================
// Tables
// ============================================================

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const columns = sqliteTable("columns", {
  id: text("id").primaryKey(),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  branch: text("branch"),
  is_worktree: integer("is_worktree", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  ticket_number: integer("ticket_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ["urgent", "high", "medium", "low"],
  }),
  column_id: text("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  session_id: text("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  parent_ticket_id: text("parent_ticket_id"),
  order: integer("order").notNull().default(0),
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
  updated_at: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  ticket_id: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  file_path: text("file_path").notNull(),
  file_type: text("file_type").notNull(),
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const dependencies = sqliteTable("dependencies", {
  id: text("id").primaryKey(),
  ticket_id: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  depends_on_ticket_id: text("depends_on_ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["blocked_by", "blocks", "related_to"],
  }).notNull(),
});

// ============================================================
// Relations
// ============================================================

export const projectsRelations = relations(projects, ({ many }) => ({
  columns: many(columns),
  tickets: many(tickets),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  project: one(projects, {
    fields: [columns.project_id],
    references: [projects.id],
  }),
  tickets: many(tickets),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.project_id],
    references: [projects.id],
  }),
  column: one(columns, {
    fields: [tickets.column_id],
    references: [columns.id],
  }),
  session: one(sessions, {
    fields: [tickets.session_id],
    references: [sessions.id],
  }),
  parent: one(tickets, {
    fields: [tickets.parent_ticket_id],
    references: [tickets.id],
    relationName: "subtasks",
  }),
  subtasks: many(tickets, { relationName: "subtasks" }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [attachments.ticket_id],
    references: [tickets.id],
  }),
}));

// ============================================================
// Constants
// ============================================================

export const DEFAULT_COLUMNS = [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Done",
];

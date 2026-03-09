import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { eq, and, or, sql, max, count, asc } from "drizzle-orm";
import { getDb, getRawDb } from "./connection.js";
import {
  projects,
  columns,
  sessions,
  tickets,
  attachments,
  dependencies,
  DEFAULT_COLUMNS,
} from "./schema.js";
import type {
  Priority,
  CreateTicketInput,
  UpdateTicketInput,
  CreateSessionInput,
  CreateDependencyInput,
} from "../shared/types.js";

// ============================================================
// Migrations — create tables on first run
// ============================================================

export function runMigrations(): void {
  const raw = getRawDb();
  raw.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      ticket_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT CHECK(priority IN ('urgent','high','medium','low')),
      column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
      parent_ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS dependencies (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      depends_on_ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('blocked_by','blocks','related_to')),
      UNIQUE(ticket_id, depends_on_ticket_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_column ON tickets(column_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_session ON tickets(session_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_parent ON tickets(parent_ticket_id);
    CREATE INDEX IF NOT EXISTS idx_columns_project ON columns(project_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON attachments(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_ticket ON dependencies(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON dependencies(depends_on_ticket_id);
  `);

  // Migration: add branch tracking to sessions
  const sessionColumns = raw.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
  const columnNames = new Set(sessionColumns.map((c) => c.name));
  if (!columnNames.has("branch")) {
    raw.exec(`ALTER TABLE sessions ADD COLUMN branch TEXT`);
  }
  if (!columnNames.has("is_worktree")) {
    raw.exec(`ALTER TABLE sessions ADD COLUMN is_worktree BOOLEAN NOT NULL DEFAULT 0`);
  }
}

// ============================================================
// Projects
// ============================================================

export function createProject(name: string) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.insert(projects).values({ id, name, created_at: now }).run();

  // Seed default columns
  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    db.insert(columns)
      .values({ id: uuidv4(), project_id: id, name: DEFAULT_COLUMNS[i], order: i })
      .run();
  }

  return getProject(id)!;
}

export function getProject(id: string) {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.id, id)).get() ?? null;
}

export function listProjects() {
  const db = getDb();
  return db.select().from(projects).orderBy(asc(projects.created_at)).all();
}

export function getOrCreateDefaultProject() {
  const all = listProjects();
  if (all.length > 0) return all[0];
  return createProject("Default Project");
}

export function updateProject(id: string, updates: { name?: string }) {
  const db = getDb();
  const project = getProject(id);
  if (!project) return null;

  const values: Partial<typeof projects.$inferInsert> = {};
  if (updates.name !== undefined) values.name = updates.name;

  if (Object.keys(values).length > 0) {
    db.update(projects).set(values).where(eq(projects.id, id)).run();
  }
  return getProject(id);
}

export function deleteProject(id: string) {
  const db = getDb();
  const result = db.delete(projects).where(eq(projects.id, id)).run();
  return result.changes > 0;
}

// ============================================================
// Columns
// ============================================================

export function getColumns(projectId: string) {
  const db = getDb();
  return db
    .select()
    .from(columns)
    .where(eq(columns.project_id, projectId))
    .orderBy(asc(columns.order))
    .all();
}

export function getColumn(id: string) {
  const db = getDb();
  return db.select().from(columns).where(eq(columns.id, id)).get() ?? null;
}

export function createColumn(projectId: string, name: string, order: number) {
  const db = getDb();
  const id = uuidv4();
  db.insert(columns).values({ id, project_id: projectId, name, order }).run();
  return getColumn(id)!;
}

export function updateColumn(
  id: string,
  updates: { name?: string; order?: number },
) {
  const db = getDb();
  const col = getColumn(id);
  if (!col) return null;

  const values: Partial<typeof columns.$inferInsert> = {};
  if (updates.name !== undefined) values.name = updates.name;
  if (updates.order !== undefined) values.order = updates.order;

  if (Object.keys(values).length > 0) {
    db.update(columns).set(values).where(eq(columns.id, id)).run();
  }
  return getColumn(id);
}

export function deleteColumn(id: string) {
  const db = getDb();
  const result = db.delete(columns).where(eq(columns.id, id)).run();
  return result.changes > 0;
}

export function getBacklogColumn(projectId: string) {
  const db = getDb();
  return (
    db
      .select()
      .from(columns)
      .where(
        and(eq(columns.project_id, projectId), eq(columns.name, "Backlog")),
      )
      .get() ?? null
  );
}

export function getDoneColumn(projectId: string) {
  const db = getDb();
  return (
    db
      .select()
      .from(columns)
      .where(
        and(eq(columns.project_id, projectId), eq(columns.name, "Done")),
      )
      .get() ?? null
  );
}

// ============================================================
// Sessions
// ============================================================

const SESSION_COLORS = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

export function createSession(input: CreateSessionInput) {
  const db = getDb();
  const id = uuidv4();
  const all = listSessions();
  const color = input.color ?? SESSION_COLORS[all.length % SESSION_COLORS.length];
  const now = new Date().toISOString();

  db.insert(sessions).values({
    id,
    name: input.name,
    color,
    branch: input.branch ?? null,
    is_worktree: input.is_worktree ?? false,
    created_at: now,
  }).run();
  return getSession(id)!;
}

export function getSession(id: string) {
  const db = getDb();
  return db.select().from(sessions).where(eq(sessions.id, id)).get() ?? null;
}

export function listSessions() {
  const db = getDb();
  return db.select().from(sessions).orderBy(asc(sessions.created_at)).all();
}

export function findSessionByBranch(branch: string) {
  const db = getDb();
  return db.select().from(sessions).where(eq(sessions.branch, branch)).get() ?? null;
}

export function deleteSession(id: string) {
  const db = getDb();
  const session = getSession(id);
  if (!session) return false;

  // Unlink tickets from this session so they aren't lost
  db.update(tickets)
    .set({ session_id: null, updated_at: new Date().toISOString() })
    .where(eq(tickets.session_id, id))
    .run();

  const result = db.delete(sessions).where(eq(sessions.id, id)).run();
  return result.changes > 0;
}

// ============================================================
// Tickets
// ============================================================

function getNextTicketNumber(projectId: string): number {
  const db = getDb();
  const result = db
    .select({ maxNum: max(tickets.ticket_number) })
    .from(tickets)
    .where(eq(tickets.project_id, projectId))
    .get();
  return (result?.maxNum ?? 0) + 1;
}

function getMaxOrderInColumn(columnId: string): number {
  const db = getDb();
  const result = db
    .select({ maxOrd: max(tickets.order) })
    .from(tickets)
    .where(eq(tickets.column_id, columnId))
    .get();
  return (result?.maxOrd ?? -1) + 1;
}

export function createTicket(input: CreateTicketInput) {
  const db = getDb();
  const id = uuidv4();
  const ticketNumber = getNextTicketNumber(input.project_id);

  let columnId = input.column_id;
  if (!columnId) {
    const backlog = getBacklogColumn(input.project_id);
    if (!backlog) throw new Error("No Backlog column found");
    columnId = backlog.id;
  }

  const order = getMaxOrderInColumn(columnId);
  const now = new Date().toISOString();

  db.insert(tickets)
    .values({
      id,
      project_id: input.project_id,
      ticket_number: ticketNumber,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? null,
      column_id: columnId,
      session_id: input.session_id ?? null,
      parent_ticket_id: null,
      order,
      created_at: now,
      updated_at: now,
    })
    .run();

  return getTicket(id)!;
}

export function createSubtask(
  parentTicketId: string,
  title: string,
  description?: string,
  priority?: Priority,
) {
  const parent = getTicket(parentTicketId);
  if (!parent) throw new Error("Parent ticket not found");

  const db = getDb();
  const id = uuidv4();
  const ticketNumber = getNextTicketNumber(parent.project_id);
  const order = getMaxOrderInColumn(parent.column_id);
  const now = new Date().toISOString();

  db.insert(tickets)
    .values({
      id,
      project_id: parent.project_id,
      ticket_number: ticketNumber,
      title,
      description: description ?? null,
      priority: priority ?? null,
      column_id: parent.column_id,
      session_id: parent.session_id,
      parent_ticket_id: parentTicketId,
      order,
      created_at: now,
      updated_at: now,
    })
    .run();

  return getTicket(id)!;
}

export function getTicket(id: string) {
  const db = getDb();
  return db.select().from(tickets).where(eq(tickets.id, id)).get() ?? null;
}

export function getTicketWithSubtasks(id: string) {
  const ticket = getTicket(id);
  if (!ticket) return null;

  const subs = getSubtasks(id);
  const progress = getStoryProgress(id);

  return {
    ...ticket,
    subtasks: subs,
    subtask_total: progress.total,
    subtask_completed: progress.completed,
  };
}

export function listTickets(filters?: {
  project_id?: string;
  column_id?: string;
  session_id?: string;
  parent_ticket_id?: string | null;
}) {
  const db = getDb();
  const conditions = [];

  if (filters?.project_id) {
    conditions.push(eq(tickets.project_id, filters.project_id));
  }
  if (filters?.column_id) {
    conditions.push(eq(tickets.column_id, filters.column_id));
  }
  if (filters?.session_id) {
    conditions.push(eq(tickets.session_id, filters.session_id));
  }
  if (filters?.parent_ticket_id !== undefined) {
    if (filters.parent_ticket_id === null) {
      conditions.push(sql`${tickets.parent_ticket_id} IS NULL`);
    } else {
      conditions.push(
        eq(tickets.parent_ticket_id, filters.parent_ticket_id),
      );
    }
  }

  const query = db.select().from(tickets).orderBy(asc(tickets.order));
  if (conditions.length > 0) {
    return query.where(and(...conditions)).all();
  }
  return query.all();
}

export function updateTicket(id: string, updates: UpdateTicketInput) {
  const db = getDb();
  const ticket = getTicket(id);
  if (!ticket) return null;

  const values: Partial<typeof tickets.$inferInsert> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) values.title = updates.title;
  if (updates.description !== undefined) values.description = updates.description;
  if (updates.priority !== undefined) values.priority = updates.priority;
  if (updates.session_id !== undefined) values.session_id = updates.session_id;

  db.update(tickets).set(values).where(eq(tickets.id, id)).run();
  return getTicket(id);
}

export function moveTicket(id: string, columnId: string, order?: number) {
  const db = getDb();
  const ticket = getTicket(id);
  if (!ticket) return null;

  const targetOrder = order ?? getMaxOrderInColumn(columnId);

  db.update(tickets)
    .set({
      column_id: columnId,
      order: targetOrder,
      updated_at: new Date().toISOString(),
    })
    .where(eq(tickets.id, id))
    .run();

  return getTicket(id);
}

export function deleteTicket(id: string) {
  const db = getDb();
  const result = db.delete(tickets).where(eq(tickets.id, id)).run();
  return result.changes > 0;
}

export function getSubtasks(parentTicketId: string) {
  const db = getDb();
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.parent_ticket_id, parentTicketId))
    .orderBy(asc(tickets.order))
    .all();
}

export function getStoryProgress(ticketId: string) {
  const db = getDb();

  const totalResult = db
    .select({ count: count() })
    .from(tickets)
    .where(eq(tickets.parent_ticket_id, ticketId))
    .get();

  const completedResult = db
    .select({ count: count() })
    .from(tickets)
    .innerJoin(columns, eq(tickets.column_id, columns.id))
    .where(
      and(
        eq(tickets.parent_ticket_id, ticketId),
        eq(columns.name, "Done"),
      ),
    )
    .get();

  return {
    total: totalResult?.count ?? 0,
    completed: completedResult?.count ?? 0,
  };
}

// ============================================================
// Attachments
// ============================================================

export function createAttachment(
  ticketId: string,
  filePath: string,
  fileType: string,
) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(attachments)
    .values({ id, ticket_id: ticketId, file_path: filePath, file_type: fileType, created_at: now })
    .run();
  return getAttachment(id)!;
}

export function getAttachment(id: string) {
  const db = getDb();
  return (
    db.select().from(attachments).where(eq(attachments.id, id)).get() ?? null
  );
}

export function listAttachments(ticketId: string) {
  const db = getDb();
  return db
    .select()
    .from(attachments)
    .where(eq(attachments.ticket_id, ticketId))
    .orderBy(asc(attachments.created_at))
    .all();
}

export function deleteAttachment(id: string) {
  const db = getDb();
  const result = db.delete(attachments).where(eq(attachments.id, id)).run();
  return result.changes > 0;
}

// ============================================================
// Dependencies
// ============================================================

export function createDependency(
  ticketId: string,
  input: CreateDependencyInput,
) {
  const db = getDb();
  const id = uuidv4();
  db.insert(dependencies)
    .values({
      id,
      ticket_id: ticketId,
      depends_on_ticket_id: input.depends_on_ticket_id,
      type: input.type,
    })
    .run();
  return getDependency(id)!;
}

export function getDependency(id: string) {
  const db = getDb();
  return (
    db.select().from(dependencies).where(eq(dependencies.id, id)).get() ??
    null
  );
}

export function listDependencies(ticketId: string) {
  const db = getDb();
  return db
    .select()
    .from(dependencies)
    .where(
      or(
        eq(dependencies.ticket_id, ticketId),
        eq(dependencies.depends_on_ticket_id, ticketId),
      ),
    )
    .all();
}

export function deleteDependency(id: string) {
  const db = getDb();
  const result = db
    .delete(dependencies)
    .where(eq(dependencies.id, id))
    .run();
  return result.changes > 0;
}

// ============================================================
// Merge Import
// ============================================================

export function mergeImportedData(importedDbPath: string): void {
  const raw = getRawDb();
  const importedDb = new Database(importedDbPath, { readonly: true });

  try {
    // Insert in dependency order: projects → columns → sessions → tickets → attachments → dependencies
    // Using INSERT OR IGNORE so existing records (by primary key) are skipped.

    const importedProjects = importedDb.prepare("SELECT * FROM projects").all() as Array<Record<string, unknown>>;
    const insertProject = raw.prepare(
      "INSERT OR IGNORE INTO projects (id, name, created_at) VALUES (@id, @name, @created_at)"
    );
    for (const row of importedProjects) {
      insertProject.run(row);
    }

    const importedColumns = importedDb.prepare("SELECT * FROM columns").all() as Array<Record<string, unknown>>;
    const insertColumn = raw.prepare(
      'INSERT OR IGNORE INTO columns (id, project_id, name, "order") VALUES (@id, @project_id, @name, @order)'
    );
    for (const row of importedColumns) {
      insertColumn.run(row);
    }

    const importedSessions = importedDb.prepare("SELECT * FROM sessions").all() as Array<Record<string, unknown>>;
    // Check if the imported DB has branch/is_worktree columns
    const importedSessionCols = importedDb.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    const importedSessionColNames = new Set(importedSessionCols.map((c) => c.name));
    const hasBranch = importedSessionColNames.has("branch");
    const hasWorktree = importedSessionColNames.has("is_worktree");

    const insertSession = raw.prepare(
      "INSERT OR IGNORE INTO sessions (id, name, color, branch, is_worktree, created_at) VALUES (@id, @name, @color, @branch, @is_worktree, @created_at)"
    );
    for (const row of importedSessions) {
      insertSession.run({
        ...row,
        branch: hasBranch ? (row as Record<string, unknown>).branch ?? null : null,
        is_worktree: hasWorktree ? (row as Record<string, unknown>).is_worktree ?? 0 : 0,
      });
    }

    // Tickets: insert parent tickets first (parent_ticket_id IS NULL), then subtasks
    const importedParentTickets = importedDb.prepare(
      "SELECT * FROM tickets WHERE parent_ticket_id IS NULL"
    ).all() as Array<Record<string, unknown>>;
    const importedSubtasks = importedDb.prepare(
      "SELECT * FROM tickets WHERE parent_ticket_id IS NOT NULL"
    ).all() as Array<Record<string, unknown>>;

    const insertTicket = raw.prepare(
      'INSERT OR IGNORE INTO tickets (id, project_id, ticket_number, title, description, priority, column_id, session_id, parent_ticket_id, "order", created_at, updated_at) VALUES (@id, @project_id, @ticket_number, @title, @description, @priority, @column_id, @session_id, @parent_ticket_id, @order, @created_at, @updated_at)'
    );
    for (const row of importedParentTickets) {
      insertTicket.run(row);
    }
    for (const row of importedSubtasks) {
      insertTicket.run(row);
    }

    const importedAttachments = importedDb.prepare("SELECT * FROM attachments").all() as Array<Record<string, unknown>>;
    const insertAttachment = raw.prepare(
      "INSERT OR IGNORE INTO attachments (id, ticket_id, file_path, file_type, created_at) VALUES (@id, @ticket_id, @file_path, @file_type, @created_at)"
    );
    for (const row of importedAttachments) {
      insertAttachment.run(row);
    }

    // Check if dependencies table exists in imported DB
    const importedTables = importedDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dependencies'"
    ).all();
    if (importedTables.length > 0) {
      const importedDeps = importedDb.prepare("SELECT * FROM dependencies").all() as Array<Record<string, unknown>>;
      const insertDep = raw.prepare(
        "INSERT OR IGNORE INTO dependencies (id, ticket_id, depends_on_ticket_id, type) VALUES (@id, @ticket_id, @depends_on_ticket_id, @type)"
      );
      for (const row of importedDeps) {
        insertDep.run(row);
      }
    }
  } finally {
    importedDb.close();
  }
}

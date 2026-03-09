import { Hono } from "hono";
import * as db from "../../db/dal.js";
import { broadcast } from "../ws.js";
import type {
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  CreateSubtaskInput,
  CreateDependencyInput,
} from "../../shared/types.js";

const app = new Hono();

// List tickets with optional filters
app.get("/", (c) => {
  const { project_id, column_id, session_id, parent_ticket_id } =
    c.req.query();
  const tickets = db.listTickets({
    project_id,
    column_id,
    session_id,
    parent_ticket_id: parent_ticket_id === "null" ? null : parent_ticket_id,
  });
  return c.json(tickets);
});

// Get single ticket with subtasks
app.get("/:id", (c) => {
  const ticket = db.getTicketWithSubtasks(c.req.param("id"));
  if (!ticket) return c.json({ error: "Ticket not found" }, 404);
  return c.json(ticket);
});

// Create ticket
app.post("/", async (c) => {
  const body = await c.req.json<CreateTicketInput>();
  const ticket = db.createTicket(body);
  broadcast("ticket:created", ticket);
  return c.json(ticket, 201);
});

// Update ticket
app.put("/:id", async (c) => {
  const body = await c.req.json<UpdateTicketInput>();
  const ticket = db.updateTicket(c.req.param("id"), body);
  if (!ticket) return c.json({ error: "Ticket not found" }, 404);
  broadcast("ticket:updated", ticket);
  return c.json(ticket);
});

// Delete ticket
app.delete("/:id", (c) => {
  const deleted = db.deleteTicket(c.req.param("id"));
  if (!deleted) return c.json({ error: "Ticket not found" }, 404);
  broadcast("ticket:deleted", { id: c.req.param("id") });
  return c.json({ ok: true });
});

// Move ticket
app.put("/:id/move", async (c) => {
  const body = await c.req.json<MoveTicketInput>();
  const ticket = db.moveTicket(c.req.param("id"), body.column_id, body.order);
  if (!ticket) return c.json({ error: "Ticket not found" }, 404);
  broadcast("ticket:moved", ticket);
  return c.json(ticket);
});

// List subtasks
app.get("/:id/subtasks", (c) => {
  const subtasks = db.getSubtasks(c.req.param("id"));
  return c.json(subtasks);
});

// Create subtask
app.post("/:id/subtasks", async (c) => {
  const body = await c.req.json<CreateSubtaskInput>();
  const subtask = db.createSubtask(
    c.req.param("id"),
    body.title,
    body.description,
    body.priority,
  );
  broadcast("ticket:created", subtask);
  return c.json(subtask, 201);
});

// List attachments
app.get("/:id/attachments", (c) => {
  const attachments = db.listAttachments(c.req.param("id"));
  return c.json(attachments);
});

// List dependencies
app.get("/:id/dependencies", (c) => {
  const deps = db.listDependencies(c.req.param("id"));
  return c.json(deps);
});

// Add dependency
app.post("/:id/dependencies", async (c) => {
  const body = await c.req.json<CreateDependencyInput>();
  const dep = db.createDependency(c.req.param("id"), body);
  return c.json(dep, 201);
});

export default app;

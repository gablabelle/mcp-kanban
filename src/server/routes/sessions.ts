import { Hono } from "hono";
import * as db from "../../db/dal.js";
import { broadcast } from "../ws.js";
import type { CreateSessionInput } from "../../shared/types.js";

const app = new Hono();

app.get("/", (c) => {
  const sessions = db.listSessions();
  return c.json(sessions);
});

app.post("/", async (c) => {
  const body = await c.req.json<CreateSessionInput>();
  const session = db.createSession(body);
  broadcast("session:created", session);
  return c.json(session, 201);
});

app.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = db.deleteSession(id);
  if (!deleted) return c.json({ error: "Session not found" }, 404);
  broadcast("session:deleted", { id });
  return c.json({ ok: true });
});

export default app;

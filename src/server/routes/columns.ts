import { Hono } from "hono";
import * as db from "../../db/dal.js";
import { broadcast } from "../ws.js";

const app = new Hono();

app.put("/:id", async (c) => {
  const body = await c.req.json<{ name?: string; order?: number }>();
  const column = db.updateColumn(c.req.param("id"), body);
  if (!column) return c.json({ error: "Column not found" }, 404);
  broadcast("column:updated", column);
  return c.json(column);
});

app.delete("/:id", (c) => {
  const deleted = db.deleteColumn(c.req.param("id"));
  if (!deleted) return c.json({ error: "Column not found" }, 404);
  return c.json({ ok: true });
});

export default app;

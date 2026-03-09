import { Hono } from "hono";
import * as db from "../../db/dal.js";

const app = new Hono();

app.delete("/:id", (c) => {
  const deleted = db.deleteDependency(c.req.param("id"));
  if (!deleted) return c.json({ error: "Dependency not found" }, 404);
  return c.json({ ok: true });
});

export default app;

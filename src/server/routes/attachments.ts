import { Hono } from "hono";
import * as db from "../../db/dal.js";

const app = new Hono();

app.delete("/:id", (c) => {
  const deleted = db.deleteAttachment(c.req.param("id"));
  if (!deleted) return c.json({ error: "Attachment not found" }, 404);
  return c.json({ ok: true });
});

app.get("/:id/download", (c) => {
  const attachment = db.getAttachment(c.req.param("id"));
  if (!attachment) return c.json({ error: "Attachment not found" }, 404);
  // File serving will be implemented in GAB-15
  return c.json({ error: "Not yet implemented" }, 501);
});

export default app;

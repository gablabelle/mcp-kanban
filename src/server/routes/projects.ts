import { Hono } from "hono";
import * as db from "../../db/dal.js";

const app = new Hono();

app.get("/", (c) => {
  const projects = db.listProjects();
  return c.json(projects);
});

app.post("/", async (c) => {
  const body = await c.req.json<{ name: string }>();
  if (!body.name?.trim()) return c.json({ error: "Name is required" }, 400);
  const project = db.createProject(body.name.trim());
  return c.json(project, 201);
});

app.get("/:id", (c) => {
  const project = db.getProject(c.req.param("id"));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const columns = db.getColumns(project.id);
  return c.json({ ...project, columns });
});

app.get("/:id/columns", (c) => {
  const columns = db.getColumns(c.req.param("id"));
  return c.json(columns);
});

app.post("/:id/columns", async (c) => {
  const body = await c.req.json<{ name: string; order: number }>();
  const column = db.createColumn(c.req.param("id"), body.name, body.order);
  return c.json(column, 201);
});

app.put("/:id", async (c) => {
  const body = await c.req.json<{ name?: string }>();
  const project = db.updateProject(c.req.param("id"), body);
  if (!project) return c.json({ error: "Project not found" }, 404);
  return c.json(project);
});

app.delete("/:id", (c) => {
  const allProjects = db.listProjects();
  if (allProjects.length <= 1) {
    return c.json({ error: "Cannot delete the only project" }, 400);
  }

  const deleted = db.deleteProject(c.req.param("id"));
  if (!deleted) return c.json({ error: "Project not found" }, 404);
  return c.json({ ok: true });
});

export default app;

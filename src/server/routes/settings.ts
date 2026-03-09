import fs from "fs";
import os from "os";
import path from "path";
import { Hono } from "hono";
import { loadConfig, saveConfig, resetConfig } from "../../cli/config.js";
import { listProviders, installProvider, uninstallProvider } from "../../providers/index.js";
import { mergeImportedData } from "../../db/dal.js";

const app = new Hono();

app.get("/", async (c) => {
  const config = loadConfig();
  const providers = listProviders();

  const providerStatus = await Promise.all(
    providers.map(async (p) => ({
      id: p.id,
      name: p.name,
      detected: await p.detect(),
      installed: config.providers.includes(p.id),
    })),
  );

  return c.json({
    theme: config.theme ?? "system",
    port: config.port,
    scrollMode: config.scrollMode ?? "column",
    providers: providerStatus,
  });
});

app.put("/", async (c) => {
  const body = await c.req.json<{ theme?: string; port?: number; scrollMode?: string }>();
  const config = loadConfig();

  if (body.theme !== undefined) config.theme = body.theme;
  if (body.port !== undefined) config.port = body.port;
  if (body.scrollMode !== undefined) config.scrollMode = body.scrollMode;

  saveConfig(config);
  return c.json({ ok: true });
});

app.post("/providers/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const config = loadConfig();
    await installProvider(name);
    if (!config.providers.includes(name)) {
      config.providers.push(name);
      saveConfig(config);
    }
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to install provider" }, 400);
  }
});

app.delete("/providers/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const config = loadConfig();
    await uninstallProvider(name);
    config.providers = config.providers.filter((p) => p !== name);
    saveConfig(config);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to remove provider" }, 400);
  }
});

app.get("/export", (c) => {
  const config = loadConfig();
  const dbPath = config.dbPath;

  if (!fs.existsSync(dbPath)) {
    return c.json({ error: "Database not found" }, 404);
  }

  const data = fs.readFileSync(dbPath);
  return new Response(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="mcp-kanban.db"',
    },
  });
});

app.post("/import", async (c) => {
  const config = loadConfig();
  const dbPath = config.dbPath;
  const mode = (c.req.query("mode") ?? "replace") as "replace" | "merge";

  const body = await c.req.arrayBuffer();
  if (!body || body.byteLength === 0) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  if (mode === "merge") {
    // Write uploaded data to a temp file, then merge into current DB
    const tempPath = path.join(os.tmpdir(), `mcp-kanban-import-${Date.now()}.db`);
    try {
      fs.writeFileSync(tempPath, Buffer.from(body));
      mergeImportedData(tempPath);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  } else {
    // Replace: overwrite the database file
    fs.writeFileSync(dbPath, Buffer.from(body));
  }

  return c.json({ ok: true });
});

app.post("/reset", (c) => {
  resetConfig();
  return c.json({ ok: true });
});

export default app;

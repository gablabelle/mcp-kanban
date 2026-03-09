import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { runMigrations, getOrCreateDefaultProject } from "../db/dal.js";
import { addClient, removeClient, broadcast } from "./ws.js";
import projectRoutes from "./routes/projects.js";
import columnRoutes from "./routes/columns.js";
import ticketRoutes from "./routes/tickets.js";
import sessionRoutes from "./routes/sessions.js";
import attachmentRoutes from "./routes/attachments.js";
import dependencyRoutes from "./routes/dependencies.js";
import settingsRoutes from "./routes/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.resolve(__dirname, "../ui");

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Middleware
app.use("/api/*", cors());

// WebSocket endpoint
app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      addClient(ws);
    },
    onClose(_event, ws) {
      removeClient(ws);
    },
  })),
);

// API routes
app.route("/api/projects", projectRoutes);
app.route("/api/columns", columnRoutes);
app.route("/api/tickets", ticketRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/attachments", attachmentRoutes);
app.route("/api/dependencies", dependencyRoutes);
app.route("/api/settings", settingsRoutes);

// Health check
app.get("/api/health", (c) => c.json({ ok: true }));

// Internal endpoint for MCP process to trigger broadcasts
app.post("/internal/broadcast", async (c) => {
  const { type, data } = await c.req.json();
  broadcast(type, data);
  return c.json({ ok: true });
});

// Static file serving for production UI
if (fs.existsSync(UI_DIR)) {
  app.use(
    "/assets/*",
    serveStatic({ root: path.relative(process.cwd(), UI_DIR) }),
  );

  // SPA fallback: serve index.html for non-API routes
  app.get("*", async (c) => {
    const indexPath = path.join(UI_DIR, "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");
    return c.html(html);
  });
}

export function startServer(port = 3010) {
  // Initialize database
  runMigrations();
  getOrCreateDefaultProject();

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`MCP Kanban server running on http://localhost:${info.port}`);
  });

  injectWebSocket(server);

  return server;
}

// Run directly
if (
  process.argv[1]?.endsWith("server/index.ts") ||
  process.argv[1]?.endsWith("server/index.js")
) {
  startServer();
}

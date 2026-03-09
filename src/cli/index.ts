#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig, saveConfig, resetConfig } from "./config.js";
import { startServer } from "../server/index.js";
import { startMcpServer } from "../mcp/index.js";
import { closeDb } from "../db/connection.js";
import { listProviders, installProvider, uninstallProvider } from "../providers/index.js";

async function isServerRunning(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    const data = await res.json() as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

const program = new Command();

program
  .name("mcp-kanban")
  .description("A local-first AI-native Kanban board for AI agents")
  .version("0.1.0");

// Default command: start
program
  .command("start", { isDefault: true })
  .description("Start the MCP Kanban server and open the web UI")
  .option("-p, --port <port>", "Port to run the server on")
  .option("--no-open", "Don't open the browser automatically")
  .action(async (opts) => {
    const config = loadConfig();
    const port = opts.port ? parseInt(opts.port) : config.port;
    const url = `http://localhost:${port}`;

    // Check if a server is already running on this port
    if (await isServerRunning(port)) {
      console.log(`\n  MCP Kanban is already running on ${url}\n`);
      return;
    }

    // First-run check
    if (!config.firstRunCompleted) {
      console.log("\n  Welcome to MCP Kanban!\n");
      console.log("  Setting up MCP Kanban...\n");
    }

    // Start API + WebSocket server (also runs migrations and seeds default project)
    startServer(port);
    console.log("  ✓ Server running");

    // Mark first run as completed
    if (!config.firstRunCompleted) {
      config.firstRunCompleted = true;
      config.port = port;
      saveConfig(config);
    }

    console.log(`\n  Open: ${url}\n`);

    // Open browser
    if (opts.open !== false) {
      const open = await import("open");
      await open.default(url);
    }

    // Graceful shutdown
    const shutdown = () => {
      console.log("\n  Shutting down...");
      closeDb();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

// Dev mode: API server + Vite HMR
program
  .command("dev")
  .description("Start the API server and Vite dev server with hot reload")
  .option("-p, --port <port>", "API server port")
  .action(async (opts) => {
    const { spawn } = await import("child_process");
    const { resolve } = await import("path");
    const config = loadConfig();
    const port = opts.port ? parseInt(opts.port) : config.port;

    // Start API + WebSocket server in-process
    startServer(port);
    console.log(`  ✓ API server running on http://localhost:${port}`);

    // Spawn Vite dev server as child process
    const vite = spawn("npx", ["vite", "--port", "5173"], {
      cwd: resolve(import.meta.dirname, "../.."),
      stdio: "inherit",
      shell: true,
    });

    console.log("  ✓ Vite dev server starting on http://localhost:5173\n");

    const shutdown = () => {
      console.log("\n  Shutting down...");
      vite.kill();
      closeDb();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

// MCP server (stdio mode for agent integration)
program
  .command("mcp-server")
  .description("Start the MCP server in stdio mode for agent integration")
  .action(async () => {
    await startMcpServer();
  });

// Setup wizard
program
  .command("setup")
  .description("Run the setup wizard")
  .action(() => {
    console.log("Setup wizard — coming soon (GAB-6: Provider Integration)");
  });

// Provider commands
const provider = program
  .command("provider")
  .description("Manage AI agent provider integrations");

provider
  .command("list")
  .description("List installed providers and their detection status")
  .action(async () => {
    const config = loadConfig();
    const providers = listProviders();
    console.log("  Available providers:\n");
    for (const p of providers) {
      const detected = await p.detect();
      const installed = config.providers.includes(p.id);
      const status = installed ? "✓ installed" : detected ? "detected" : "not found";
      console.log(`    ${p.name} (${p.id}) — ${status}`);
    }
  });

provider
  .command("add <name>")
  .description("Install a provider integration")
  .action(async (name: string) => {
    const config = loadConfig();
    await installProvider(name);
    if (!config.providers.includes(name)) {
      config.providers.push(name);
      saveConfig(config);
    }
    console.log(`  ✓ Provider "${name}" installed`);
  });

provider
  .command("remove <name>")
  .description("Remove a provider integration")
  .action(async (name: string) => {
    const config = loadConfig();
    await uninstallProvider(name);
    config.providers = config.providers.filter((p) => p !== name);
    saveConfig(config);
    console.log(`  ✓ Provider "${name}" removed`);
  });

// Reset
program
  .command("reset")
  .description("Reset configuration and database")
  .option("-y, --yes", "Skip confirmation")
  .action((opts) => {
    if (!opts.yes) {
      console.log(
        "  This will delete your configuration and database.",
      );
      console.log("  Run with --yes to confirm.");
      return;
    }
    resetConfig();
    console.log("  ✓ Configuration and database reset.");
  });

program.parse();

import fs from "fs";
import path from "path";
import os from "os";
import type { ProviderAdapter } from "../types.js";

function getCursorConfigPath(): string {
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(os.homedir(), ".cursor", "mcp.json");
  }
  if (platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", "Cursor", "mcp.json");
  }
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

export const cursorProvider: ProviderAdapter = {
  id: "cursor",
  name: "Cursor",

  async detect() {
    const platform = os.platform();
    if (platform === "darwin") {
      return fs.existsSync("/Applications/Cursor.app");
    }
    // Check for .cursor directory as a fallback
    return fs.existsSync(path.join(os.homedir(), ".cursor"));
  },

  async install() {
    console.log("  Installing MCP Kanban for Cursor...");
    const configPath = getCursorConfigPath();

    let config: Record<string, unknown> = {};
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      // File doesn't exist yet
    }

    const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
    mcpServers["mcp-kanban"] = {
      command: "npx",
      args: ["mcp-kanban", "mcp-server"],
    };
    config.mcpServers = mcpServers;

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("  ✓ Added mcp-kanban to Cursor MCP config");
  },

  async uninstall() {
    console.log("  Removing MCP Kanban from Cursor...");
    const configPath = getCursorConfigPath();
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
      delete mcpServers["mcp-kanban"];
      config.mcpServers = mcpServers;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log("  ✓ Removed mcp-kanban from Cursor MCP config");
    } catch {
      console.log("  No Cursor MCP config found, nothing to remove.");
    }
  },

  async verify() {
    const configPath = getCursorConfigPath();
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
      return "mcp-kanban" in mcpServers;
    } catch {
      return false;
    }
  },
};

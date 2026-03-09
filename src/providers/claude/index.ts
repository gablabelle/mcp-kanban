import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import type { ProviderAdapter } from "../types.js";

const CLAUDE_CONFIG_DIR = path.join(os.homedir(), ".claude");
const MCP_CONFIG_PATH = path.join(CLAUDE_CONFIG_DIR, "claude_desktop_config.json");

export const claudeProvider: ProviderAdapter = {
  id: "claude-code",
  name: "Claude Code",

  async detect() {
    try {
      execSync("which claude", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  },

  async install() {
    console.log("  Installing MCP Kanban for Claude Code...");

    // Read or create the MCP config
    let config: Record<string, unknown> = {};
    try {
      const raw = fs.readFileSync(MCP_CONFIG_PATH, "utf-8");
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

    fs.mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("  ✓ Added mcp-kanban to Claude Code MCP config");
  },

  async uninstall() {
    console.log("  Removing MCP Kanban from Claude Code...");
    try {
      const raw = fs.readFileSync(MCP_CONFIG_PATH, "utf-8");
      const config = JSON.parse(raw);
      const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
      delete mcpServers["mcp-kanban"];
      config.mcpServers = mcpServers;
      fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log("  ✓ Removed mcp-kanban from Claude Code MCP config");
    } catch {
      console.log("  No Claude Code config found, nothing to remove.");
    }
  },

  async verify() {
    try {
      const raw = fs.readFileSync(MCP_CONFIG_PATH, "utf-8");
      const config = JSON.parse(raw);
      const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
      return "mcp-kanban" in mcpServers;
    } catch {
      return false;
    }
  },
};

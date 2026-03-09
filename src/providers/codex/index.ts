import { execSync } from "child_process";
import type { ProviderAdapter } from "../types.js";

export const codexProvider: ProviderAdapter = {
  id: "codex",
  name: "Codex",

  async detect() {
    try {
      execSync("which codex", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  },

  async install() {
    console.log("  Installing MCP Kanban for Codex...");
    console.log(
      "  Note: Codex MCP integration requires manual configuration.",
    );
    console.log(
      '  Add "mcp-kanban" server with command: npx mcp-kanban mcp-server',
    );
  },

  async uninstall() {
    console.log("  Removing MCP Kanban from Codex...");
    console.log("  Note: Please remove mcp-kanban from your Codex config manually.");
  },

  async verify() {
    // No reliable way to verify Codex config automatically
    return false;
  },
};

import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(dirname, "../../skills");

/**
 * Registers the Kanban skills bundled with this package in OpenCode.
 *
 * @returns {Promise<{ config: (config: Record<string, any>) => Promise<void> }>}
 * OpenCode plugin hooks.
 */
export const McpKanbanPlugin = async () => ({
  /**
   * Adds the package's skills directory to the merged OpenCode config.
   *
   * @param {Record<string, any>} config - Mutable merged OpenCode config.
   * @returns {Promise<void>} Resolves after the skills path is registered.
   */
  config: async (config) => {
    config.skills ??= {};
    config.skills.paths ??= [];

    if (!config.skills.paths.includes(skillsDir)) {
      config.skills.paths.push(skillsDir);
    }
  },
});

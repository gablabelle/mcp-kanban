import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { McpKanbanPlugin } from "../plugin/.opencode/plugins/mcp-kanban.js";

const execFileAsync = promisify(execFile);

/**
 * Verifies that the OpenCode plugin registers the packaged Kanban skills.
 */
test("registers the packaged Kanban skills once", async () => {
  const config = { skills: { paths: [] } };
  const hooks = await McpKanbanPlugin();

  await hooks.config(config);
  await hooks.config(config);

  assert.equal(config.skills.paths.length, 1);

  const [skillsDir] = config.skills.paths;
  const skillNames = (await readdir(skillsDir)).sort();

  assert.deepEqual(skillNames, [
    "kanban-plan",
    "kanban-start",
    "kanban-stop",
    "kanban-work",
  ]);

  await Promise.all(
    skillNames.map((name) => access(`${skillsDir}/${name}/SKILL.md`)),
  );
});

/**
 * Verifies that npm publishes the OpenCode plugin and its skills together.
 */
test("publishes the OpenCode entrypoint and skills", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.main, "plugin/.opencode/plugins/mcp-kanban.js");
  assert.ok(packageJson.files.includes("plugin/"));
  assert.equal(packageJson.scripts.test, "node --test test/*.test.mjs");

  const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"]);
  const [packResult] = JSON.parse(stdout);
  const packedFiles = new Set(packResult.files.map(({ path }) => path));

  assert.ok(packedFiles.has(packageJson.main));
  assert.ok(packedFiles.has(packageJson.bin["mcp-kanban"].replace(/^\.\//, "")));

  for (const skillName of [
    "kanban-plan",
    "kanban-start",
    "kanban-stop",
    "kanban-work",
  ]) {
    assert.ok(packedFiles.has(`plugin/skills/${skillName}/SKILL.md`));
  }
});

#!/usr/bin/env bash
# Install mcp-kanban skills and hooks from a local clone.
# Run from your project root:
#   bash /path/to/mcp-kanban/scripts/claude-install-plugin.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/../plugin"

# Skills
echo "Installing skills..."
mkdir -p .claude/skills/kanban-plan .claude/skills/kanban-start
cp "$PLUGIN_DIR/skills/plan/SKILL.md" .claude/skills/kanban-plan/SKILL.md
cp "$PLUGIN_DIR/skills/start/SKILL.md" .claude/skills/kanban-start/SKILL.md

# Hooks
source "$SCRIPT_DIR/install-hooks.sh"

echo ""
echo "Done! Installed:"
echo "  .claude/skills/kanban-plan/SKILL.md"
echo "  .claude/skills/kanban-start/SKILL.md"
echo "  Stop hook in .claude/settings.json"
echo ""
echo "Restart Claude Code to pick up the changes."

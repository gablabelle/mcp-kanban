#!/usr/bin/env bash
# Install mcp-kanban skills and hooks by downloading from GitHub.
# Run from your project root:
#   bash <(curl -s https://raw.githubusercontent.com/gablabelle/mcp-kanban/main/scripts/claude-install-remote.sh)

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/gablabelle/mcp-kanban/main"

# Skills
echo "Installing skills..."
mkdir -p .claude/skills/kanban-plan .claude/skills/kanban-start
curl -sf "${REPO_RAW}/plugin/skills/plan/SKILL.md" -o .claude/skills/kanban-plan/SKILL.md
curl -sf "${REPO_RAW}/plugin/skills/start/SKILL.md" -o .claude/skills/kanban-start/SKILL.md

# Hooks
source <(curl -sf "${REPO_RAW}/scripts/install-hooks.sh")

echo ""
echo "Done! Installed:"
echo "  .claude/skills/kanban-plan/SKILL.md"
echo "  .claude/skills/kanban-start/SKILL.md"
echo "  Stop hook in .claude/settings.json"
echo ""
echo "Restart Claude Code to pick up the changes."

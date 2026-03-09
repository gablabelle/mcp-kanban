#!/usr/bin/env bash
# Install mcp-kanban skills and hooks into the current project's .claude/ directory.
# Run from any project root: bash /path/to/install-plugin.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/plugin"

# Skills → .claude/skills/
echo "Installing skills..."
mkdir -p .claude/skills/kanban-plan .claude/skills/kanban-start
cp "$PLUGIN_DIR/skills/kanban-plan/SKILL.md" .claude/skills/kanban-plan/SKILL.md
cp "$PLUGIN_DIR/skills/kanban-start/SKILL.md" .claude/skills/kanban-start/SKILL.md

# Hooks → .claude/settings.json (merge into existing)
echo "Installing hooks..."
SETTINGS=".claude/settings.json"
mkdir -p .claude

if [ -f "$SETTINGS" ]; then
  # Check if hooks.Stop already has our prompt
  if grep -q "mcp-kanban tickets" "$SETTINGS" 2>/dev/null; then
    echo "  Stop hook already present, skipping."
  else
    # Merge our Stop hook into existing settings using jq
    if command -v jq &>/dev/null; then
      HOOK_PROMPT='Look at the conversation. Was the assistant actively working on mcp-kanban tickets (referenced ticket IDs, used move_ticket, create_ticket, complete_subtask, or discussed specific kanban tasks)? If YES and it did NOT move completed tickets to Done or update their descriptions with what was implemented, respond with {"ok": false, "reason": "You were working on kanban tickets but didn'\''t update their status. Move completed tickets/subtasks to Done and update descriptions with what was done."}. If the assistant was NOT doing kanban work, or already updated the tickets properly, respond with {"ok": true}.'
      HOOK_ENTRY=$(jq -n --arg prompt "$HOOK_PROMPT" '[{"hooks": [{"type": "prompt", "prompt": $prompt}]}]')

      # Add or append to hooks.Stop
      if jq -e '.hooks.Stop' "$SETTINGS" &>/dev/null; then
        jq --argjson entry "$HOOK_ENTRY" '.hooks.Stop += $entry' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
      else
        jq --argjson entry "$HOOK_ENTRY" '.hooks.Stop = $entry' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
      fi
      echo "  Stop hook added to $SETTINGS"
    else
      echo "  WARNING: jq not found. Add the Stop hook manually to $SETTINGS"
      echo "  See: $PLUGIN_DIR/hooks/hooks.json"
    fi
  fi
else
  # Create settings.json with just the hook
  cat > "$SETTINGS" << 'SETTINGS_EOF'
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Look at the conversation. Was the assistant actively working on mcp-kanban tickets (referenced ticket IDs, used move_ticket, create_ticket, complete_subtask, or discussed specific kanban tasks)? If YES and it did NOT move completed tickets to Done or update their descriptions with what was implemented, respond with {\"ok\": false, \"reason\": \"You were working on kanban tickets but didn't update their status. Move completed tickets/subtasks to Done and update descriptions with what was done.\"}. If the assistant was NOT doing kanban work, or already updated the tickets properly, respond with {\"ok\": true}."
          }
        ]
      }
    ]
  }
}
SETTINGS_EOF
  echo "  Created $SETTINGS with Stop hook"
fi

echo ""
echo "Done! Installed:"
echo "  .claude/skills/kanban-plan/SKILL.md"
echo "  .claude/skills/kanban-start/SKILL.md"
echo "  Stop hook in .claude/settings.json"
echo ""
echo "Restart Claude Code to pick up the changes."

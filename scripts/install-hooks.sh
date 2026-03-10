#!/usr/bin/env bash
# Shared hook installation logic — sourced by both install scripts.

SETTINGS=".claude/settings.json"
mkdir -p .claude

echo "Installing hooks..."

if [ -f "$SETTINGS" ]; then
  if grep -q "mcp-kanban tickets" "$SETTINGS" 2>/dev/null; then
    echo "  Stop hook already present, skipping."
  else
    if command -v jq &>/dev/null; then
      HOOK_PROMPT='Look at the conversation. Was the assistant actively working on mcp-kanban tickets (referenced ticket IDs, used move_ticket, create_ticket, complete_subtask, or discussed specific kanban tasks)? If YES and it did NOT move completed tickets to Done or update their descriptions with what was implemented, respond with {"ok": false, "reason": "You were working on kanban tickets but didn'\''t update their status. Move completed tickets/subtasks to Done and update descriptions with what was done."}. If the assistant was NOT doing kanban work, or already updated the tickets properly, respond with {"ok": true}.'
      HOOK_ENTRY=$(jq -n --arg prompt "$HOOK_PROMPT" '[{"hooks": [{"type": "prompt", "prompt": $prompt}]}]')

      if jq -e '.hooks.Stop' "$SETTINGS" &>/dev/null; then
        jq --argjson entry "$HOOK_ENTRY" '.hooks.Stop += $entry' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
      else
        jq --argjson entry "$HOOK_ENTRY" '.hooks.Stop = $entry' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
      fi
      echo "  Stop hook added to $SETTINGS"
    else
      echo "  WARNING: jq not found. Add the Stop hook manually to $SETTINGS"
      echo "  See: https://github.com/gablabelle/mcp-kanban#claude-code-manual"
    fi
  fi
else
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

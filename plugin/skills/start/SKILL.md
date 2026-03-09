---
name: start
description: Start working through planned tickets on the Kanban board. Use when the user wants to begin executing planned work, or confirms they want to start after planning. Moves tickets through columns and updates them as work progresses.
argument-hint: [optional: specific ticket or story to start with]
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, mcp__mcp-kanban__list_columns, mcp__mcp-kanban__list_tickets, mcp__mcp-kanban__get_ticket, mcp__mcp-kanban__move_ticket, mcp__mcp-kanban__update_ticket, mcp__mcp-kanban__complete_subtask, mcp__mcp-kanban__create_subtask
---

# Work Through Kanban Tickets

You are executing planned work from the mcp-kanban board. Move tickets through columns and update them as you work.

## Step 1: Discover the board

Use `mcp__mcp-kanban__list_columns` to get the column IDs. Identify:
- The **"in progress"** column (for active work)
- The **"review"** column (if it exists, for completed-but-not-verified work)
- The **"done"** column (for finished work)

Use `mcp__mcp-kanban__list_tickets` to see all tickets and find which ones are ready to work on (in Backlog or Todo).

## Step 2: Pick the next ticket

If `$ARGUMENTS` specifies a ticket or story, start with that. Otherwise, pick the highest-priority story that hasn't been started yet.

Use `mcp__mcp-kanban__get_ticket` to read the full ticket details including subtasks.

## Step 3: Move the story to In Progress

Use `mcp__mcp-kanban__move_ticket` to move the parent story to the "in progress" column. This signals on the board that work has begun.

## Step 4: Work through each subtask

For each subtask in the story:

1. **Before starting**: Move the subtask to "in progress" with `mcp__mcp-kanban__move_ticket`
2. **Do the work**: Implement the changes — read files, write code, run tests, etc.
3. **Update the ticket**: Use `mcp__mcp-kanban__update_ticket` to add implementation notes to the subtask description — what was done, what files were changed, any decisions made
4. **Mark complete**: Use `mcp__mcp-kanban__complete_subtask` to move the subtask to Done

## Step 5: Complete the story

Once all subtasks are done:
1. Use `mcp__mcp-kanban__update_ticket` to update the parent story's description with a summary of what was implemented
2. Move the story to "review" or "done" column with `mcp__mcp-kanban__move_ticket`

## Step 6: Continue or stop

After completing a story, check if there are more stories to work on:
- If yes, ask the user: **"Story complete. Ready to move on to the next one?"**
- If no more stories, report: **"All planned work is complete."**

## Guidelines

- Always move tickets BEFORE starting work on them — the board should reflect what you're currently doing
- Update ticket descriptions as you go, not just at the end — if the user is watching the board, they should see progress
- If you discover additional work needed while implementing, create new subtasks with `mcp__mcp-kanban__create_subtask` rather than expanding the scope of existing ones
- If a subtask turns out to be unnecessary, update its description explaining why and mark it complete
- If you hit a blocker, update the ticket description with what's blocking it and move on to the next subtask
- Run tests after meaningful changes to catch issues early

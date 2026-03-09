---
name: kanban-plan
description: Break work into stories and subtasks on the Kanban board. Use when the user describes a feature, task, or body of work that should be planned, decomposed, or organized into trackable tickets.
argument-hint: [description of work to plan]
allowed-tools: Bash, Read, Grep, Glob, mcp__mcp-kanban__list_columns, mcp__mcp-kanban__list_tickets, mcp__mcp-kanban__create_ticket, mcp__mcp-kanban__create_subtask, mcp__mcp-kanban__move_ticket
---

# Plan Work on the Kanban Board

You are planning work by breaking it into stories and subtasks on the mcp-kanban board.

## Step 1: Open the board immediately

Open the Kanban board in the browser so the user can watch tickets appear in real-time:

```bash
open "http://localhost:$(cat ~/.mcp-kanban/config.json 2>/dev/null | jq -r '.port // 3010')"
```

## Step 2: Discover the board structure

Use `mcp__mcp-kanban__list_columns` to get the available columns and their IDs. Identify which column is best for new planned work (typically "Backlog" or "Todo").

Use `mcp__mcp-kanban__list_tickets` to check for existing tickets so you don't create duplicates.

## Step 3: Analyze the work

Read relevant code files to understand the current state. Break the work described in `$ARGUMENTS` into:

- **Stories**: High-level features or logical units of work. Each story should be independently deliverable.
- **Subtasks**: Concrete, actionable implementation steps under each story. Each subtask should be completable in a single focused session.

## Step 4: Create tickets on the board

For each story:
1. Create a story ticket with `mcp__mcp-kanban__create_ticket` — use a clear title and a description that explains the goal, acceptance criteria, and any relevant technical context
2. Create subtasks under it with `mcp__mcp-kanban__create_subtask` — each subtask should have a concise title and a description covering what specifically needs to be done

Place stories in the "Backlog" or "Todo" column (whichever makes more sense given the board's column structure).

Set appropriate priorities: `urgent` for blockers, `high` for critical path items, `medium` for standard work, `low` for nice-to-haves.

## Step 5: Present the plan and ask to start

After all tickets are created, present a summary:
- Total number of stories and subtasks created
- Brief overview of each story and its subtasks
- Suggested order of execution

Then ask the user: **"The plan is on the board. Would you like me to start working through these tickets?"**

If the user confirms, invoke the kanban-start workflow.

## Guidelines

- Keep story titles under 60 characters
- Subtask titles should start with a verb (Add, Implement, Update, Fix, Refactor, Test...)
- Descriptions should be detailed enough that someone unfamiliar with the codebase could understand the intent
- Don't create more than 5-7 stories for a single planning session — if the work is larger, suggest splitting into phases
- Don't create more than 5-8 subtasks per story — if a story needs more, it should probably be split

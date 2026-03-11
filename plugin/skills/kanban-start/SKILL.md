---
name: kanban-start
description: Start the Kanban board web UI. Opens the board in the browser so you can view and manage tickets.
allowed-tools: Bash, mcp__kanban__open_board
---

# Start the Kanban Board

## Step 1: Start the server

Call `mcp__kanban__open_board` to ensure the web UI server is running. It returns the board URL.

## Step 2: Open the browser

```bash
open "<url from open_board>"
```

Tell the user the board is ready and provide the URL.

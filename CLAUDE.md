# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Kanban is a local-first Kanban board for AI agents, powered by the Model Context Protocol (MCP). AI agents interact with the board via MCP tools to create, update, and complete tasks. Developers observe and guide through a real-time web UI. Distributed as a CLI tool (`npx mcp-kanban`).

## Architecture

Four layers:

1. **CLI Layer** — Entry point (`npx mcp-kanban`). Handles onboarding, DB init, config, provider integration, and launches the server + UI.
2. **Web UI** — React + Vite + Tailwind + dnd-kit + WebSockets. Visual Kanban board with drag-and-drop, real-time updates, details panel, session filtering.
3. **MCP Server** — Exposes tools (create_ticket, update_ticket, move_ticket, create_subtask, etc.) for AI agents. Acts as the agent API layer.
4. **Database** — SQLite (local-first, zero config). Tables: projects, columns, sessions, tickets, attachments, dependencies.

## Key Design Decisions

- **Provider system**: Pluggable adapters for AI agent integrations (Claude Code, Codex, Cursor). Each provider implements detect/install/uninstall/verify.
- **Sessions**: Represent AI execution contexts; tickets are color-coded by session.
- **Tickets**: Can be stories or subtasks. Subtasks are full tickets nested under a parent. Stories show progress bars based on subtask completion.
- **Real-time**: WebSockets push all changes (ticket CRUD, moves, subtask completion) to the UI instantly.
- **Config**: Stored at `~/.mcp-kanban/config.json`.
- **Attachments**: Stored locally in `attachments/` directory.
- **Worktree support**: When Claude Code runs with `--worktree`, a new MCP server process is spawned in the worktree directory. It auto-detects the worktree branch and creates (or reuses) a session for it. All MCP server instances share the same SQLite DB (`~/.mcp-kanban/kanban.db`) — they do NOT start a new HTTP/WebSocket server. The single web UI server (started by `mcp-kanban start`) receives notifications from all MCP processes. If `mcp-kanban start` detects an existing server on the port, it skips startup and opens the browser to the running instance.

## Tech Stack

- TypeScript / Node.js
- Hono + @hono/node-server (HTTP API)
- @hono/node-ws (WebSockets)
- React, Vite, Tailwind CSS, dnd-kit (UI)
- Drizzle ORM + better-sqlite3 (database)
- @modelcontextprotocol/sdk (agent protocol)

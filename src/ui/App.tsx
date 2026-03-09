import { useState, useCallback, useMemo } from "react";
import { Header } from "./components/Layout/Header";
import { Board } from "./components/Board/Board";
import { TicketDetailPanel } from "./components/TicketDetail/TicketDetailPanel";
import { useBoard } from "./hooks/useBoard";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTheme } from "./hooks/useTheme";
import { useScrollMode } from "./hooks/useScrollMode";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { Toaster } from "@/components/ui/sonner";
import type { Ticket, WSEvent } from "@shared/types";

export function App() {
  const { projects, project, columns, tickets, sessions, loading, error, refresh, switchProject } = useBoard();
  const { visualTheme, colorMode, setVisualTheme, setColorMode } = useTheme();
  const { scrollMode, setScrollMode } = useScrollMode();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSessionIds, setActiveSessionIds] = useState<Set<string> | null>(
    null,
  );

  // Initialize active sessions to include all sessions
  const effectiveSessionIds = useMemo(() => {
    if (activeSessionIds !== null) return activeSessionIds;
    return new Set(sessions.map((s) => s.id));
  }, [activeSessionIds, sessions]);

  // Filter tickets by active sessions
  const filteredTickets = useMemo(() => {
    if (sessions.length === 0) return tickets;
    return tickets.filter((t) => {
      if (!t.session_id) return true; // Always show tickets without a session
      return effectiveSessionIds.has(t.session_id);
    });
  }, [tickets, sessions, effectiveSessionIds]);

  const handleWSMessage = useCallback(
    (event: WSEvent) => {
      if (
        event.type === "ticket:created" ||
        event.type === "ticket:updated" ||
        event.type === "ticket:moved" ||
        event.type === "ticket:deleted" ||
        event.type === "subtask:completed" ||
        event.type === "session:created" ||
        event.type === "session:deleted"
      ) {
        refresh();
      }
    },
    [refresh],
  );

  useWebSocket(handleWSMessage);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
  };

  const handleToggleSession = (sessionId: string) => {
    setActiveSessionIds((prev) => {
      const next = new Set(prev ?? sessions.map((s) => s.id));
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleShowAllSessions = () => {
    setActiveSessionIds(new Set(sessions.map((s) => s.id)));
  };

  const handleHideAllSessions = () => {
    setActiveSessionIds(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        projects={projects}
        activeProject={project!}
        onSwitchProject={switchProject}
        onProjectCreated={refresh}
        sessions={sessions}
        activeSessionIds={effectiveSessionIds}
        onToggleSession={handleToggleSession}
        onShowAllSessions={handleShowAllSessions}
        onHideAllSessions={handleHideAllSessions}
        onSessionCreated={refresh}
        onSessionDeleted={refresh}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Board
        columns={columns}
        tickets={filteredTickets}
        sessions={sessions}
        projectId={project!.id}
        projectName={project!.name}
        scrollMode={scrollMode}
        onTicketClick={handleTicketClick}
        onTicketMoved={refresh}
      />
      {selectedTicketId && (
        <TicketDetailPanel
          ticketId={selectedTicketId}
          columns={columns}
          sessions={sessions}
          ticketPrefix={project!.name.slice(0, 3).toUpperCase()}
          onClose={() => setSelectedTicketId(null)}
          onUpdated={refresh}
        />
      )}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeProjectId={project!.id}
        activeProjectName={project!.name}
        columns={columns}
        projectCount={projects.length}
        onProjectUpdated={refresh}
        visualTheme={visualTheme}
        colorMode={colorMode}
        setVisualTheme={setVisualTheme}
        setColorMode={setColorMode}
        scrollMode={scrollMode}
        setScrollMode={setScrollMode}
      />
      <Toaster />
    </div>
  );
}

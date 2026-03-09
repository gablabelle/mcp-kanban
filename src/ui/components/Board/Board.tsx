import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { LayoutGroup } from "framer-motion";
import type { Column as ColumnType, Ticket, Session } from "@shared/types";
import { Column } from "./Column";
import { TicketCard } from "./TicketCard";
import { moveTicket } from "../../api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BoardProps {
  columns: ColumnType[];
  tickets: Ticket[];
  sessions: Session[];
  projectId: string;
  projectName: string;
  scrollMode?: "column" | "page";
  onTicketClick?: (ticket: Ticket) => void;
  onTicketMoved?: () => void;
}

export function Board({
  columns,
  tickets,
  sessions,
  projectId,
  projectName,
  scrollMode = "column",
  onTicketClick,
  onTicketMoved,
}: BoardProps) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets);

  // Sync with parent when tickets prop changes
  if (tickets !== localTickets && !activeTicket) {
    setLocalTickets(tickets);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const ticketPrefix = projectName.slice(0, 3).toUpperCase();

  // Build column → tickets mapping (only top-level tickets)
  const ticketsByColumn = new Map<string, Ticket[]>();
  for (const col of columns) {
    ticketsByColumn.set(col.id, []);
  }

  // Build a map of subtasks grouped by parent ticket ID
  const subtasksByParent = new Map<string, Ticket[]>();
  for (const ticket of localTickets) {
    if (ticket.parent_ticket_id) {
      const list = subtasksByParent.get(ticket.parent_ticket_id);
      if (list) {
        list.push(ticket);
      } else {
        subtasksByParent.set(ticket.parent_ticket_id, [ticket]);
      }
    }
  }

  // Find the "Done" column ID for marking completed subtasks
  const doneColumnId = columns.find((c) => c.name === "Done")?.id ?? null;

  for (const ticket of localTickets) {
    if (ticket.parent_ticket_id) continue;
    const list = ticketsByColumn.get(ticket.column_id);
    if (list) list.push(ticket);
  }

  const findColumnId = (ticketId: string): string | null => {
    const ticket = localTickets.find((t) => t.id === ticketId);
    return ticket?.column_id ?? null;
  };

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const ticket = localTickets.find((t) => t.id === event.active.id);
      setActiveTicket(ticket ?? null);
    },
    [localTickets],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine target column
      let targetColumnId: string | null = null;
      if (overId.startsWith("column:")) {
        targetColumnId = overId.replace("column:", "");
      } else {
        targetColumnId = findColumnId(overId);
      }

      if (!targetColumnId) return;

      const currentColumnId = findColumnId(activeId);
      if (currentColumnId === targetColumnId) return;

      // Optimistically move the ticket to the new column
      setLocalTickets((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, column_id: targetColumnId! } : t,
        ),
      );
    },
    [localTickets],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTicket(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine target column
      let targetColumnId: string | null = null;
      if (overId.startsWith("column:")) {
        targetColumnId = overId.replace("column:", "");
      } else {
        targetColumnId = findColumnId(overId);
      }

      if (!targetColumnId) return;

      // Calculate order in the target column
      const targetTickets = localTickets.filter(
        (t) =>
          t.column_id === targetColumnId &&
          !t.parent_ticket_id &&
          t.id !== activeId,
      );
      let newOrder = targetTickets.length; // Default: end of column

      if (!overId.startsWith("column:")) {
        const overIndex = targetTickets.findIndex((t) => t.id === overId);
        if (overIndex >= 0) newOrder = overIndex;
      }

      try {
        await moveTicket(activeId, {
          column_id: targetColumnId,
          order: newOrder,
        });
        onTicketMoved?.();
      } catch {
        // Revert on error
        onTicketMoved?.();
      }
    },
    [localTickets, onTicketMoved],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <LayoutGroup>
        {scrollMode === "page" && (
          <div className="flex gap-4 px-4 pt-4 pb-0 md:px-6 md:pt-4 md:pb-0 bg-background sticky top-0 z-30 shrink-0">
            {columns.map((col) => {
              const count = (ticketsByColumn.get(col.id) ?? []).length;
              return (
                <div key={col.id} className="flex items-center justify-between px-3 py-2 w-72 shrink-0 lg:shrink lg:w-auto lg:flex-1 lg:min-w-0">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {col.name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
        <div className={cn(
          "flex gap-4 flex-1 min-w-0 px-4 pb-0 md:px-6 md:pb-0 bg-background text-foreground",
          scrollMode === "column" ? "overflow-x-auto min-h-0 pt-4 md:pt-6" : "overflow-auto items-start pt-0",
        )}>
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              tickets={ticketsByColumn.get(col.id) ?? []}
              subtasksByParent={subtasksByParent}
              doneColumnId={doneColumnId}
              sessions={sessions}
              projectId={projectId}
              ticketPrefix={ticketPrefix}
              scrollMode={scrollMode}
              onTicketClick={onTicketClick}
              onTicketCreated={onTicketMoved}
            />
          ))}
        </div>
      </LayoutGroup>
      <DragOverlay>
        {activeTicket && (
          <TicketCard
            ticket={activeTicket}
            session={
              activeTicket.session_id
                ? sessionMap.get(activeTicket.session_id)
                : undefined
            }
            subtasks={subtasksByParent.get(activeTicket.id)}
            doneColumnId={doneColumnId}
            ticketPrefix={ticketPrefix}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

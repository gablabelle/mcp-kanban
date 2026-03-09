import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Column as ColumnType, Ticket, Session } from "@shared/types";
import { TicketCard } from "./TicketCard";
import { createTicket } from "../../api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ColumnProps {
  column: ColumnType;
  tickets: Ticket[];
  subtasksByParent: Map<string, Ticket[]>;
  doneColumnId: string | null;
  sessions: Session[];
  projectId: string;
  ticketPrefix: string;
  scrollMode?: "column" | "page";
  onTicketClick?: (ticket: Ticket) => void;
  onTicketCreated?: () => void;
}

export function Column({
  column,
  tickets,
  subtasksByParent,
  doneColumnId,
  sessions,
  projectId,
  ticketPrefix,
  scrollMode = "column",
  onTicketClick,
  onTicketCreated,
}: ColumnProps) {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const ticketIds = tickets.map((t) => t.id);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { column },
  });

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createTicket({
      title: newTitle.trim(),
      project_id: projectId,
      column_id: column.id,
    });
    setNewTitle("");
    setAdding(false);
    onTicketCreated?.();
  };

  return (
    <div className="flex flex-col w-72 shrink-0 lg:shrink lg:w-auto lg:flex-1 lg:min-w-0">
      {scrollMode === "column" && (
        <div className="flex items-center justify-between px-3 py-2 mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {column.name}
          </h3>
          <Badge variant="secondary" className="text-[10px] h-5">
            {tickets.length}
          </Badge>
        </div>
      )}
      {(() => {
        const areaClasses = cn(
          "flex-1 min-h-0 rounded-xl rounded-b-none transition-all duration-150",
          isOver
            ? "bg-primary/10 ring-2 ring-primary ring-inset"
            : "bg-muted/50",
        );

        const innerContent = (
          <div
            ref={setNodeRef}
            className="flex flex-col gap-2.5 p-3 min-h-full"
          >
            <SortableContext
              items={ticketIds}
              strategy={verticalListSortingStrategy}
            >
              {tickets.map((ticket) => {
                const subtasks = subtasksByParent.get(ticket.id);
                const hasSubtasks = subtasks && subtasks.length > 0;
                return hasSubtasks ? (
                  <div
                    key={ticket.id}
                    className="flex flex-col gap-1.5 min-w-0 rounded-xl bg-muted border border-border p-2"
                  >
                    <TicketCard
                      ticket={ticket}
                      session={
                        ticket.session_id
                          ? sessionMap.get(ticket.session_id)
                          : undefined
                      }
                      subtasks={subtasks}
                      doneColumnId={doneColumnId}
                      ticketPrefix={ticketPrefix}
                      onClick={() => onTicketClick?.(ticket)}
                    />
                    {subtasks.map((sub) => (
                      <TicketCard
                        key={sub.id}
                        ticket={sub}
                        session={
                          sub.session_id
                            ? sessionMap.get(sub.session_id)
                            : undefined
                        }
                        isSubtask
                        ticketPrefix={ticketPrefix}
                        onClick={() => onTicketClick?.(sub)}
                      />
                    ))}
                  </div>
                ) : (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    session={
                      ticket.session_id
                        ? sessionMap.get(ticket.session_id)
                        : undefined
                    }
                    ticketPrefix={ticketPrefix}
                    onClick={() => onTicketClick?.(ticket)}
                  />
                );
              })}
            </SortableContext>
            {adding ? (
              <div className="space-y-2">
                <Input
                  autoFocus
                  type="text"
                  placeholder="Ticket title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                  }}
                  className="text-sm"
                />
                <div className="flex gap-1.5">
                  <Button
                    size="xs"
                    onClick={handleAdd}
                    disabled={!newTitle.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setAdding(false); setNewTitle(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setAdding(true)}
              >
                + Add ticket
              </Button>
            )}
          </div>
        );

        return scrollMode === "column" ? (
          <ScrollArea className={cn(areaClasses, "overflow-hidden")}>
            {innerContent}
          </ScrollArea>
        ) : (
          <div className={areaClasses}>
            {innerContent}
          </div>
        );
      })()}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { MarkdownPreview } from "../Markdown/MarkdownPreview";
import type {
  TicketWithSubtasks,
  Column,
  Session,
  Priority,
} from "@shared/types";
import {
  fetchTicket,
  updateTicket,
  deleteTicket,
  moveTicket,
  createSubtask,
} from "../../api";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Check } from "lucide-react";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bgColor: string }
> = {
  urgent: { label: "Urgent", color: "text-red-500", bgColor: "bg-red-500" },
  high: {
    label: "High",
    color: "text-orange-500",
    bgColor: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
  },
  low: { label: "Low", color: "text-gray-400", bgColor: "bg-gray-400" },
};

interface TicketDetailPanelProps {
  ticketId: string;
  columns: Column[];
  sessions: Session[];
  ticketPrefix?: string;
  onClose: () => void;
  onUpdated: () => void;
}

function PriorityDot({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-block size-2.5 shrink-0 rounded-full ${config.bgColor} ${className ?? ""}`}
          />
        </TooltipTrigger>
        <TooltipContent side="top">{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SessionDot({
  color,
  label,
  className,
}: {
  color: string;
  label: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-block size-2.5 shrink-0 rounded-full ${className ?? ""}`}
            style={{ backgroundColor: color }}
          />
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TicketDetailPanel({
  ticketId,
  columns,
  sessions,
  ticketPrefix,
  onClose,
  onUpdated,
}: TicketDetailPanelProps) {
  const prefix = ticketPrefix ?? "TKT";
  const [ticket, setTicket] = useState<TicketWithSubtasks | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(420);
  const isResizing = useRef(false);

  const load = useCallback(async () => {
    const t = await fetchTicket(ticketId);
    setTicket(t);
    setTitleValue(t.title);
    setDescValue(t.description ?? "");
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTitle = async () => {
    if (!ticket || titleValue === ticket.title) {
      setEditingTitle(false);
      return;
    }
    await updateTicket(ticket.id, { title: titleValue });
    setEditingTitle(false);
    onUpdated();
    load();
  };

  const saveDescription = async () => {
    if (!ticket) return;
    await updateTicket(ticket.id, { description: descValue });
    setEditingDesc(false);
    onUpdated();
    load();
  };

  const handlePriorityChange = async (priority: string) => {
    if (!ticket) return;
    if (priority === "__none__") {
      // Cannot clear priority via this API easily, skip
      return;
    }
    await updateTicket(ticket.id, { priority: priority as Priority });
    onUpdated();
    load();
  };

  const handleColumnChange = async (columnId: string) => {
    if (!ticket) return;
    await moveTicket(ticket.id, { column_id: columnId });
    onUpdated();
    load();
  };

  const handleSessionChange = async (sessionId: string) => {
    if (!ticket) return;
    await updateTicket(ticket.id, {
      session_id: sessionId === "__none__" ? undefined : sessionId,
    });
    onUpdated();
    load();
  };

  const handleAddSubtask = async () => {
    if (!ticket || !newSubtaskTitle.trim()) return;
    await createSubtask(ticket.id, { title: newSubtaskTitle.trim() });
    setNewSubtaskTitle("");
    onUpdated();
    load();
  };

  const handleDelete = async () => {
    if (!ticket) return;
    await deleteTicket(ticket.id);
    onClose();
    onUpdated();
  };

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = panelWidth;

      const onMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = Math.max(
          320,
          Math.min(800, startWidth + (startX - e.clientX))
        );
        setPanelWidth(newWidth);
      };

      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [panelWidth]
  );

  const currentSession = ticket
    ? sessions.find((s) => s.id === ticket.session_id)
    : null;

  const subtaskProgress =
    ticket && ticket.subtask_total > 0
      ? (ticket.subtask_completed / ticket.subtask_total) * 100
      : 0;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col overflow-hidden p-0 sm:max-w-none"
        style={{ width: panelWidth }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10"
        />

        {/* Loading state */}
        {!ticket ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3 space-y-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {prefix}-{ticket.ticket_number}
                </Badge>
                <SheetTitle className="sr-only">
                  {prefix}-{ticket.ticket_number}: {ticket.title}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Detail panel for ticket {prefix}-{ticket.ticket_number}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="xs">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this ticket and all its subtasks. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <span className="text-lg leading-none">&times;</span>
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </SheetHeader>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Title */}
              {editingTitle ? (
                <input
                  className="w-full text-lg font-semibold bg-transparent border-b-2 border-primary outline-none text-foreground"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {ticket.title}
                </h2>
              )}

              <Separator />

              {/* Status (Column) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Status
                </Label>
                <Select
                  value={ticket.column_id}
                  onValueChange={handleColumnChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Priority
                </Label>
                <Select
                  value={ticket.priority ?? "__none__"}
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {ticket.priority ? (
                        <span className="flex items-center gap-2">
                          <PriorityDot priority={ticket.priority} />
                          {PRIORITY_CONFIG[ticket.priority].label}
                        </span>
                      ) : (
                        "None"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block size-2.5 rounded-full ${PRIORITY_CONFIG[p].bgColor}`}
                          />
                          {PRIORITY_CONFIG[p].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Session
                </Label>
                <Select
                  value={ticket.session_id ?? "__none__"}
                  onValueChange={handleSessionChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {currentSession ? (
                        <span className="flex items-center gap-2">
                          <SessionDot
                            color={currentSession.color}
                            label={currentSession.name}
                          />
                          {currentSession.name}
                        </span>
                      ) : (
                        "None"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Description
                </Label>
                {editingDesc ? (
                  <div className="space-y-2">
                    <Textarea
                      className="min-h-[120px] resize-y"
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDescription}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDescValue(ticket.description ?? "");
                          setEditingDesc(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingDesc(true)}
                    className="cursor-pointer hover:bg-muted rounded-lg p-2 min-h-[60px] transition-colors"
                  >
                    {ticket.description ? (
                      <MarkdownPreview content={ticket.description} />
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Click to add description...
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Subtasks */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Subtasks
                  </Label>
                  {ticket.subtask_total > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {ticket.subtask_completed}/{ticket.subtask_total}
                    </span>
                  )}
                </div>

                {ticket.subtask_total > 0 && (
                  <Progress value={subtaskProgress} className="h-1.5" />
                )}

                <div className="space-y-2 pl-2">
                  {ticket.subtasks.map((sub) => {
                    const subCol = columns.find(
                      (c) => c.id === sub.column_id
                    );
                    const isDone = subCol?.name === "Done";
                    return (
                      <Card
                        key={sub.id}
                        size="sm"
                        className="flex-row items-center gap-2 px-3 py-2"
                      >
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isDone
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          }`}
                        >
                          {isDone && <Check className="size-3" />}
                        </span>
                        <span
                          className={`flex-1 truncate text-sm ${
                            isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {sub.title}
                        </span>
                        {sub.priority && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 h-4 ${PRIORITY_CONFIG[sub.priority]?.color}`}
                          >
                            {PRIORITY_CONFIG[sub.priority]?.label}
                          </Badge>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddSubtask()
                    }
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Metadata footer */}
              <div className="space-y-1 pt-1">
                <p className="text-muted-foreground text-xs">
                  Created: {new Date(ticket.created_at!).toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  Updated: {new Date(ticket.updated_at!).toLocaleString()}
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

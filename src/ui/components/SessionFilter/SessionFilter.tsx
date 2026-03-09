import { useState } from "react";
import type { Session } from "@shared/types";
import { createSession, deleteSession } from "../../api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Filter, GitBranch, Plus, Trash2 } from "lucide-react";

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

interface SessionFilterProps {
  sessions: Session[];
  activeSessionIds: Set<string>;
  onToggle: (sessionId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onCreated: () => void;
  onSessionDeleted: () => void;
}

export function SessionFilter({
  sessions,
  activeSessionIds,
  onToggle,
  onShowAll,
  onHideAll,
  onCreated,
  onSessionDeleted,
}: SessionFilterProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createSession({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setCreating(false);
    onCreated();
  };

  const handleDelete = async (session: Session) => {
    try {
      await deleteSession(session.id);
      toast.success(`Session "${session.name}" deleted`);
      onSessionDeleted();
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCreating(false);
      setNewName("");
    }
  };

  const activeSessions = sessions.filter((s) => activeSessionIds.has(s.id));
  const allVisible = sessions.length > 0 && activeSessionIds.size === sessions.length;
  const noneVisible = sessions.length > 0 && activeSessionIds.size === 0;

  // Build the label for the trigger button
  let triggerLabel: string;
  if (sessions.length === 0) {
    triggerLabel = "Sessions";
  } else if (noneVisible) {
    triggerLabel = "No sessions";
  } else if (allVisible) {
    triggerLabel = sessions.length === 1 ? sessions[0].name : `All sessions (${sessions.length})`;
  } else if (activeSessions.length === 1) {
    triggerLabel = activeSessions[0].name;
  } else {
    triggerLabel = `${activeSessions.length} sessions`;
  }

  return (
    <>
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-[13px] text-muted-foreground max-w-[220px]"
        >
          {/* Active session color dots */}
          {activeSessions.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex -space-x-1 shrink-0">
                    {activeSessions.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className="size-2.5 rounded-full ring-1 ring-background"
                        style={{ backgroundColor: s.color }}
                      />
                    ))}
                    {activeSessions.length > 3 && (
                      <span className="size-2.5 rounded-full bg-muted-foreground/40 ring-1 ring-background" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {activeSessions.map((s) => s.name).join(", ")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="truncate">{triggerLabel}</span>
          <Filter className="size-3.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end">
        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuLabel className="px-0 py-0">Sessions</DropdownMenuLabel>
          {sessions.length > 0 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.preventDefault();
                  onShowAll();
                }}
                disabled={allVisible}
                className="h-5 text-[10px] px-1.5"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.preventDefault();
                  onHideAll();
                }}
                disabled={noneVisible}
                className="h-5 text-[10px] px-1.5"
              >
                None
              </Button>
            </div>
          )}
        </div>

        {sessions.length === 0 && !creating && (
          <p className="text-xs text-muted-foreground px-3 py-3 text-center">
            No sessions yet
          </p>
        )}

        {sessions.map((session) => {
          const active = activeSessionIds.has(session.id);
          return (
            <div key={session.id} className="flex items-center group">
              <DropdownMenuCheckboxItem
                checked={active}
                onCheckedChange={() => onToggle(session.id)}
                onSelect={(e) => e.preventDefault()}
                className="flex-1"
              >
                <span
                  className={`size-3 rounded-full shrink-0 transition-all ${
                    active ? "ring-1 ring-foreground/10 scale-100" : "scale-75 opacity-40"
                  }`}
                  style={{ backgroundColor: session.color }}
                />
                <span
                  className={`text-[13px] truncate flex-1 flex items-center gap-1.5 ${
                    active ? "" : "text-muted-foreground line-through"
                  }`}
                >
                  {session.branch && (
                    <GitBranch className="size-3 shrink-0 opacity-60" />
                  )}
                  {session.name}
                </span>
              </DropdownMenuCheckboxItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(session);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Delete session</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}

        <DropdownMenuSeparator />
        {creating ? (
          <div className="px-2 py-1.5 space-y-2">
            <Input
              autoFocus
              type="text"
              placeholder="Session name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              className="h-7 text-[13px]"
            />
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`size-5 rounded-full transition-all ${
                    newColor === color
                      ? "ring-2 ring-offset-1 ring-foreground dark:ring-offset-background scale-110"
                      : "hover:scale-110 ring-1 ring-foreground/10"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="xs"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                Create
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setCreating(true);
            }}
          >
            <Plus className="size-3.5" />
            New session
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? Tickets assigned to this session will be preserved but unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

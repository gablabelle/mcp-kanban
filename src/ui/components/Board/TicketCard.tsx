import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { Ticket, Session } from "@shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";

const PRIORITY_CONFIG: Record<string, { icon: typeof ArrowUp; color: string; label: string }> = {
  urgent: { icon: AlertTriangle, color: "text-red-500", label: "Urgent" },
  high: { icon: ArrowUp, color: "text-orange-500", label: "High" },
  medium: { icon: Minus, color: "text-yellow-500", label: "Medium" },
  low: { icon: ArrowDown, color: "text-gray-400", label: "Low" },
};

interface TicketCardProps {
  ticket: Ticket;
  session?: Session;
  subtaskInfo?: { total: number; completed: number };
  subtasks?: Ticket[];
  doneColumnId?: string | null;
  ticketPrefix?: string;
  onClick?: () => void;
  isDragOverlay?: boolean;
  isSubtask?: boolean;
}

export function TicketCard({
  ticket,
  session,
  subtaskInfo,
  subtasks,
  doneColumnId,
  ticketPrefix,
  onClick,
  isDragOverlay,
  isSubtask,
}: TicketCardProps) {
  const sortable = useSortable({ id: ticket.id, data: { ticket }, disabled: isSubtask });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = isSubtask
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  const derivedSubtaskInfo = subtasks && subtasks.length > 0
    ? {
        total: subtasks.length,
        completed: subtasks.filter((s) => s.column_id === doneColumnId).length,
      }
    : subtaskInfo;

  const progressValue =
    derivedSubtaskInfo && derivedSubtaskInfo.total > 0
      ? (derivedSubtaskInfo.completed / derivedSubtaskInfo.total) * 100
      : 0;

  const prefix = ticketPrefix ?? "TKT";
  const ticketKey = `${prefix}-${ticket.ticket_number}`;
  const priorityCfg = ticket.priority ? PRIORITY_CONFIG[ticket.priority] : null;

  const card = (
    <TooltipProvider>
      <Card
        ref={!isDragOverlay && !isSubtask ? setNodeRef : undefined}
        style={!isDragOverlay ? style : undefined}
        {...(!isDragOverlay && !isSubtask ? attributes : {})}
        {...(!isDragOverlay && !isSubtask ? listeners : {})}
        onClick={onClick}
        size="sm"
        className={cn(
          "transition-shadow gap-0 overflow-hidden shadow-sm hover:shadow-md",
          !isSubtask && "cursor-grab active:cursor-grabbing",
          isSubtask && "cursor-pointer",
          isDragOverlay && "shadow-lg ring-2 ring-primary/30 rotate-2",
        )}
      >
        <CardContent className="flex flex-col gap-1.5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="font-mono text-xs h-5 px-2 shrink-0">
                {ticketKey}
              </Badge>
              {priorityCfg && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <priorityCfg.icon className={cn("w-4 h-4 shrink-0", priorityCfg.color)} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {priorityCfg.label}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {session && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-1 ring-border"
                    style={{ backgroundColor: session.color }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  {session.name}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <h4 className="text-sm font-medium text-card-foreground leading-snug">
            {ticket.title}
          </h4>
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
          )}
          {derivedSubtaskInfo && derivedSubtaskInfo.total > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <Progress value={progressValue} className="h-1.5 flex-1" />
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap tabular-nums">
                {derivedSubtaskInfo.completed}/{derivedSubtaskInfo.total}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );

  // Wrap in motion.div for layout animation (not for drag overlays or while dragging)
  if (isDragOverlay || isDragging) return card;

  return (
    <motion.div
      layoutId={`ticket-${ticket.id}`}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
    >
      {card}
    </motion.div>
  );
}

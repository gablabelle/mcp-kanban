import type { Project, Session } from "@shared/types";
import { ProjectSwitcher } from "../ProjectSwitcher/ProjectSwitcher";
import { SessionFilter } from "../SessionFilter/SessionFilter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings } from "lucide-react";

interface HeaderProps {
  projects: Project[];
  activeProject: Project;
  onSwitchProject: (id: string) => void;
  onProjectCreated: () => void;
  sessions: Session[];
  activeSessionIds: Set<string>;
  onToggleSession: (sessionId: string) => void;
  onShowAllSessions: () => void;
  onHideAllSessions: () => void;
  onSessionCreated: () => void;
  onSessionDeleted: () => void;
  onOpenSettings: () => void;
}

export function Header({
  projects,
  activeProject,
  onSwitchProject,
  onProjectCreated,
  sessions,
  activeSessionIds,
  onToggleSession,
  onShowAllSessions,
  onHideAllSessions,
  onSessionCreated,
  onSessionDeleted,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header data-slot="header" className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/60 backdrop-blur-sm relative z-40">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono font-semibold tracking-widest text-muted-foreground uppercase select-none">
          MCP
        </span>
        <Separator orientation="vertical" className="h-4" />
        <ProjectSwitcher
          projects={projects}
          activeProject={activeProject}
          onSwitch={onSwitchProject}
          onCreated={onProjectCreated}
        />
      </div>
      <div className="flex items-center gap-1">
        <SessionFilter
          sessions={sessions}
          activeSessionIds={activeSessionIds}
          onToggle={onToggleSession}
          onShowAll={onShowAllSessions}
          onHideAll={onHideAllSessions}
          onCreated={onSessionCreated}
          onSessionDeleted={onSessionDeleted}
        />
        <Separator orientation="vertical" className="h-4 mx-1" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
              >
                <Settings className="size-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}

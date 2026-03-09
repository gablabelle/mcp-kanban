import { useState } from "react";
import type { Project } from "@shared/types";
import { createProject } from "../../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";

interface ProjectSwitcherProps {
  projects: Project[];
  activeProject: Project;
  onSwitch: (id: string) => void;
  onCreated: () => void;
}

export function ProjectSwitcher({
  projects,
  activeProject,
  onSwitch,
  onCreated,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project = await createProject(newName.trim());
    setNewName("");
    setCreating(false);
    setOpen(false);
    onCreated();
    onSwitch(project.id);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCreating(false);
      setNewName("");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="text-sm font-semibold gap-1.5 px-1.5"
        >
          {activeProject.name}
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        <DropdownMenuGroup>
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => {
                onSwitch(p.id);
                setOpen(false);
              }}
              className={
                p.id === activeProject.id
                  ? "text-primary font-medium bg-primary/10"
                  : ""
              }
            >
              <span
                className={`size-1.5 rounded-full shrink-0 ${
                  p.id === activeProject.id
                    ? "bg-primary"
                    : "bg-muted-foreground/40"
                }`}
              />
              <span className="truncate">{p.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {creating ? (
          <div className="px-1.5 py-1.5">
            <Input
              autoFocus
              type="text"
              placeholder="Project name..."
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
            <div className="flex gap-1.5 mt-2">
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
            New project
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

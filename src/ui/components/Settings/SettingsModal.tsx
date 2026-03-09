import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { VisualTheme, ColorMode } from "../../hooks/useTheme";
import type { ScrollMode } from "../../hooks/useScrollMode";
import {
  fetchSettings,
  updateSettings,
  installProviderApi,
  removeProviderApi,
  exportDatabase,
  importDatabase,
  resetAll,
  updateProject,
  deleteProject,
  updateColumn,
  deleteColumn,
  createColumn,
  type SettingsResponse,
} from "../../api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, Trash2, GripVertical, Plus } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  activeProjectId: string;
  activeProjectName: string;
  columns: { id: string; name: string; order: number }[];
  projectCount: number;
  onProjectUpdated: () => void;
  visualTheme: VisualTheme;
  colorMode: ColorMode;
  setVisualTheme: (v: VisualTheme) => void;
  setColorMode: (m: ColorMode) => void;
  scrollMode: ScrollMode;
  setScrollMode: (m: ScrollMode) => void;
}

export function SettingsModal({
  open,
  onClose,
  activeProjectId,
  activeProjectName,
  columns,
  projectCount,
  onProjectUpdated,
  visualTheme,
  colorMode,
  setVisualTheme,
  setColorMode,
  scrollMode,
  setScrollMode,
}: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col overflow-hidden p-6">
        <Tabs defaultValue="user" className="flex flex-col gap-0 min-h-0">
          <DialogHeader className="flex flex-row items-center gap-4">
            <DialogTitle className="sr-only">Settings</DialogTitle>
            <TabsList>
              <TabsTrigger value="user">User</TabsTrigger>
              <TabsTrigger value="project">Project</TabsTrigger>
            </TabsList>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pt-4 pb-2 px-2">
            <TabsContent value="user">
              <UserSettings visualTheme={visualTheme} colorMode={colorMode} setVisualTheme={setVisualTheme} setColorMode={setColorMode} scrollMode={scrollMode} setScrollMode={setScrollMode} />
            </TabsContent>
            <TabsContent value="project">
              <ProjectSettings
                projectId={activeProjectId}
                projectName={activeProjectName}
                columns={columns}
                projectCount={projectCount}
                onUpdated={onProjectUpdated}
                onClose={onClose}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// User Settings
// ============================================================

function UserSettings({ visualTheme, colorMode, setVisualTheme, setColorMode, scrollMode, setScrollMode }: { visualTheme: VisualTheme; colorMode: ColorMode; setVisualTheme: (v: VisualTheme) => void; setColorMode: (m: ColorMode) => void; scrollMode: ScrollMode; setScrollMode: (m: ScrollMode) => void }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [portValue, setPortValue] = useState("");
  const [portChanged, setPortChanged] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [confirmingImport, setConfirmingImport] = useState<ArrayBuffer | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const loadSettings = async () => {
    const s = await fetchSettings();
    setSettings(s);
    setPortValue(String(s.port));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleVisualThemeChange = async (v: VisualTheme) => {
    setVisualTheme(v);
    await updateSettings({ theme: `${v}:${colorMode}` });
  };

  const handleColorModeChange = async (m: ColorMode) => {
    setColorMode(m);
    await updateSettings({ theme: `${visualTheme}:${m}` });
  };

  const handleScrollModeChange = async (m: ScrollMode) => {
    setScrollMode(m);
    await updateSettings({ scrollMode: m });
  };

  const handlePortSave = async () => {
    const port = parseInt(portValue);
    if (isNaN(port) || port < 1 || port > 65535) return;
    await updateSettings({ port });
    setPortChanged(true);
  };

  const handleProviderToggle = async (id: string, installed: boolean) => {
    setProviderLoading(id);
    try {
      if (installed) {
        await removeProviderApi(id);
      } else {
        await installProviderApi(id);
      }
      await loadSettings();
    } finally {
      setProviderLoading(null);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".db";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const data = await file.arrayBuffer();
      setConfirmingImport(data);
    };
    input.click();
  };

  const handleImportConfirm = async (mode: "replace" | "merge") => {
    if (!confirmingImport) return;
    await importDatabase(confirmingImport, mode);
    setConfirmingImport(null);
    toast.success("Database imported successfully");
    window.location.reload();
  };

  const handleResetConfirm = async () => {
    await resetAll();
    setConfirmingReset(false);
    window.location.reload();
  };

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h3>

        {/* Visual Theme */}
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-2 block">Theme</Label>
          <div className="grid grid-cols-4 gap-2">
            {([
              { id: "default" as const, label: "Default", desc: "Clean & minimal" },
              { id: "brutalist" as const, label: "Brutalist", desc: "Bold & raw" },
              { id: "glass" as const, label: "Glass", desc: "Soft & translucent" },
              { id: "softnight" as const, label: "Softnight", desc: "Purple IDE vibes" },
            ]).map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => handleVisualThemeChange(id)}
                className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-150 cursor-pointer ${
                  visualTheme === id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-foreground/20 bg-card"
                }`}
              >
                {/* Mini preview */}
                <ThemePreview theme={id} />
                <span className="text-xs font-medium text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Mode */}
        <div className="flex items-center justify-between mb-4">
          <Label>Mode</Label>
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {(["light", "dark", "system"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleColorModeChange(m)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 capitalize ${
                  colorMode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll Mode */}
        <div className="flex items-center justify-between">
          <Label>Scroll</Label>
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {(["column", "page"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleScrollModeChange(m)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 capitalize ${
                  scrollMode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Server */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Server</h3>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="port-input">Port</Label>
          <Input
            id="port-input"
            type="number"
            value={portValue}
            onChange={(e) => { setPortValue(e.target.value); setPortChanged(false); }}
            onBlur={handlePortSave}
            onKeyDown={(e) => { if (e.key === "Enter") handlePortSave(); }}
            min={1}
            max={65535}
            className="w-24 text-right"
          />
        </div>
        {portChanged && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg">
            Restart mcp-kanban to apply the new port.
          </p>
        )}
      </section>

      <Separator />

      {/* Providers */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Provider Integrations</h3>
        <div className="space-y-2">
          {settings.providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${p.detected ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <span className="text-sm text-foreground">{p.name}</span>
                {!p.detected && (
                  <Badge variant="secondary" className="text-[10px]">not detected</Badge>
                )}
              </div>
              <Button
                variant={p.installed ? "destructive" : "outline"}
                size="xs"
                onClick={() => handleProviderToggle(p.id, p.installed)}
                disabled={providerLoading === p.id}
              >
                {providerLoading === p.id ? "..." : p.installed ? "Remove" : "Add"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Data */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data</h3>
        <div className="space-y-2">
          <Card size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Export Database</p>
                  <p className="text-xs text-muted-foreground">Download a full backup of your database</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  const blob = await exportDatabase();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "mcp-kanban.db";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Database exported successfully");
                }}
              >
                Export
              </Button>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Import Database</p>
                  <p className="text-xs text-muted-foreground">Restore from a backup file</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleImportClick}
              >
                Import
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Danger Zone */}
      <Card size="sm" className="border-destructive/30 ring-destructive/20">
        <CardContent>
          <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">Danger Zone</h3>
          <Separator className="my-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Reset Everything</p>
                <p className="text-xs text-muted-foreground">Permanently delete all data, configuration, and restore to defaults. This action cannot be undone.</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => setConfirmingReset(true)}
            >
              Reset Everything
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Database AlertDialog */}
      <AlertDialog open={confirmingImport !== null} onOpenChange={(open) => { if (!open) setConfirmingImport(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Database</AlertDialogTitle>
            <AlertDialogDescription>
              This will import the selected database file. You can choose to replace all current data or merge it with existing data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="default" onClick={() => handleImportConfirm("merge")}>
              Merge
            </AlertDialogAction>
            <AlertDialogAction variant="destructive" onClick={() => handleImportConfirm("replace")}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Everything AlertDialog */}
      <AlertDialog open={confirmingReset} onOpenChange={setConfirmingReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Everything</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all configuration and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleResetConfirm}>
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Theme Preview
// ============================================================

function ThemePreview({ theme }: { theme: VisualTheme }) {
  const presets: Record<VisualTheme, { radius: string; border: string; shadow: string; opacity: number; borderColor?: string; bg?: string }> = {
    default: { radius: "4px", border: "1px solid", shadow: "none", opacity: 1 },
    brutalist: { radius: "0", border: "2px solid currentColor", shadow: "2px 2px 0 currentColor", opacity: 1 },
    glass: { radius: "6px", border: "1px solid rgba(128,128,128,0.3)", shadow: "none", opacity: 0.6, bg: "rgba(128,128,128,0.08)" },
    softnight: { radius: "4px", border: "1px solid rgba(139,180,250,0.3)", shadow: "none", opacity: 1, bg: "rgba(30,30,46,0.2)" },
  };
  const { radius, border, shadow, opacity, bg } = presets[theme];

  return (
    <div className="w-full h-10 flex gap-1 items-end px-1">
      {[0.85, 0.6, 0.4].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-muted-foreground/15"
          style={{
            borderRadius: radius,
            border,
            boxShadow: shadow,
            opacity,
            background: bg,
            height: `${h * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Project Settings
// ============================================================

function ProjectSettings({
  projectId,
  projectName,
  columns,
  projectCount,
  onUpdated,
  onClose,
}: {
  projectId: string;
  projectName: string;
  columns: { id: string; name: string; order: number }[];
  projectCount: number;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(projectName);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);

  const handleNameSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === projectName) return;
    await updateProject(projectId, { name: trimmed });
    onUpdated();
  };

  const handleDeleteProjectConfirm = async () => {
    await deleteProject(projectId);
    setConfirmingDeleteProject(false);
    onUpdated();
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* General */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">General</h3>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="project-name-input">Project Name</Label>
          <Input
            id="project-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); }}
            className="w-48"
          />
        </div>
      </section>

      <Separator />

      {/* Columns */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Columns</h3>
        <ColumnsEditor projectId={projectId} columns={columns} onUpdated={onUpdated} />
      </section>

      <Separator />

      {/* Danger Zone */}
      <Card size="sm" className="border-destructive/30 ring-destructive/20">
        <CardContent>
          <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">Danger Zone</h3>
          <Separator className="my-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Delete Project</p>
                <p className="text-xs text-muted-foreground">
                  {projectCount <= 1
                    ? "Cannot delete the only project."
                    : `Delete "${projectName}" and all its tickets permanently.`}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => setConfirmingDeleteProject(true)}
              disabled={projectCount <= 1}
            >
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Project AlertDialog */}
      <AlertDialog open={confirmingDeleteProject} onOpenChange={setConfirmingDeleteProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{projectName}" and all its tickets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteProjectConfirm}>
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Columns Editor
// ============================================================

function SortableColumnRow({ column, onRename, onDelete }: {
  column: { id: string; name: string; order: number };
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(column.id, trimmed);
    }
    setEditing(false);
  };

  const handleStartEdit = () => {
    setEditName(column.name);
    setEditing(true);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      size="sm"
      className={`transition-all ${isDragging ? "opacity-50 scale-[0.98] shadow-lg z-10" : ""}`}
    >
      <CardContent className="flex items-center gap-2">
        <button
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {editing ? (
          <Input
            ref={inputRef}
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            className="flex-1 h-7 text-sm"
          />
        ) : (
          <span
            className="flex-1 text-sm text-foreground cursor-pointer select-none"
            onDoubleClick={handleStartEdit}
          >
            {column.name}
          </span>
        )}

        <button
          onClick={() => onDelete(column.id, column.name)}
          className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function ColumnsEditor({ projectId, columns, onUpdated }: {
  projectId: string;
  columns: { id: string; name: string; order: number }[];
  onUpdated: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmingDeleteColumn, setConfirmingDeleteColumn] = useState<{ id: string; name: string } | null>(null);

  const sorted = [...columns].sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((c) => c.id === active.id);
    const newIndex = sorted.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);

    // Persist new order values for all affected columns
    await Promise.all(
      reordered.map((col, i) => updateColumn(col.id, { order: i })),
    );
    onUpdated();
  };

  const handleRename = async (id: string, name: string) => {
    await updateColumn(id, { name });
    onUpdated();
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmingDeleteColumn({ id, name });
  };

  const handleDeleteColumnConfirm = async () => {
    if (!confirmingDeleteColumn) return;
    await deleteColumn(confirmingDeleteColumn.id);
    setConfirmingDeleteColumn(null);
    toast.success("Column deleted");
    onUpdated();
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createColumn(projectId, trimmed, sorted.length);
    setNewName("");
    setAdding(false);
    onUpdated();
  };

  return (
    <div className="space-y-1.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((col) => (
            <div key={col.id} className="group">
              <SortableColumnRow column={col} onRename={handleRename} onDelete={handleDelete} />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Add column */}
      {adding ? (
        <Card size="sm">
          <CardContent className="flex items-center gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
              placeholder="Column name..."
              className="flex-1 h-7 text-sm"
            />
            <Button variant="default" size="sm" onClick={handleAdd}>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Column
        </Button>
      )}

      {/* Delete Column AlertDialog */}
      <AlertDialog open={confirmingDeleteColumn !== null} onOpenChange={(open) => { if (!open) setConfirmingDeleteColumn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{confirmingDeleteColumn?.name}"? Tickets in this column will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteColumnConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

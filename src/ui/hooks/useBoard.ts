import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, Column, Ticket, Session } from "@shared/types";
import { fetchProjects, fetchColumns, fetchTickets, fetchSessions } from "../api";

export interface BoardData {
  projects: Project[];
  project: Project | null;
  columns: Column[];
  tickets: Ticket[];
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  switchProject: (id: string) => void;
}

export function useBoard(): BoardData {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialized = useRef(false);

  const load = useCallback(async () => {
    try {
      if (!initialized.current) setLoading(true);
      setError(null);

      const allProjects = await fetchProjects();
      setProjects(allProjects);

      if (allProjects.length === 0) {
        setError("No projects found");
        return;
      }

      // Use selected project or default to first
      const targetId = projectId ?? allProjects[0].id;
      const proj = allProjects.find((p) => p.id === targetId) ?? allProjects[0];
      setProject(proj);
      if (!projectId) setProjectId(proj.id);

      const [cols, tix, sess] = await Promise.all([
        fetchColumns(proj.id),
        fetchTickets({ project_id: proj.id }),
        fetchSessions(),
      ]);

      setColumns(cols);
      setTickets(tix);
      setSessions(sess);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load board");
    } finally {
      setLoading(false);
      initialized.current = true;
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const switchProject = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  return { projects, project, columns, tickets, sessions, loading, error, refresh: load, switchProject };
}

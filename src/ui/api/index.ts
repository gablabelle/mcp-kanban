import { api } from "./client";
import type {
  Project,
  Column,
  Session,
  Ticket,
  TicketWithSubtasks,
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  CreateSubtaskInput,
  CreateSessionInput,
} from "@shared/types";

// Projects
export const fetchProjects = () => api.get<Project[]>("/projects");

export const fetchProject = (id: string) =>
  api.get<Project & { columns: Column[] }>(`/projects/${id}`);

export const createProject = (name: string) =>
  api.post<Project>("/projects", { name });

export const fetchColumns = (projectId: string) =>
  api.get<Column[]>(`/projects/${projectId}/columns`);

// Tickets
export const fetchTickets = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return api.get<Ticket[]>(`/tickets${qs}`);
};

export const fetchTicket = (id: string) =>
  api.get<TicketWithSubtasks>(`/tickets/${id}`);

export const createTicket = (input: CreateTicketInput) =>
  api.post<Ticket>("/tickets", input);

export const updateTicket = (id: string, input: UpdateTicketInput) =>
  api.put<Ticket>(`/tickets/${id}`, input);

export const deleteTicket = (id: string) =>
  api.del<{ ok: boolean }>(`/tickets/${id}`);

export const moveTicket = (id: string, input: MoveTicketInput) =>
  api.put<Ticket>(`/tickets/${id}/move`, input);

export const createSubtask = (parentId: string, input: CreateSubtaskInput) =>
  api.post<Ticket>(`/tickets/${parentId}/subtasks`, input);

// Sessions
export const fetchSessions = () => api.get<Session[]>("/sessions");

export const createSession = (input: CreateSessionInput) =>
  api.post<Session>("/sessions", input);

export const deleteSession = (id: string) =>
  api.del<{ ok: boolean }>(`/sessions/${id}`);

// Settings
export interface SettingsResponse {
  theme: string;
  port: number;
  scrollMode: string;
  providers: {
    id: string;
    name: string;
    detected: boolean;
    installed: boolean;
  }[];
}

export const fetchSettings = () => api.get<SettingsResponse>("/settings");

export const updateSettings = (updates: { theme?: string; port?: number; scrollMode?: string }) =>
  api.put<{ ok: boolean }>("/settings", updates);

export const installProviderApi = (name: string) =>
  api.post<{ ok: boolean }>(`/settings/providers/${name}`, {});

export const removeProviderApi = (name: string) =>
  api.del<{ ok: boolean }>(`/settings/providers/${name}`);

export const exportDatabase = () =>
  fetch("/api/settings/export").then((res) => {
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  });

export const importDatabase = (data: ArrayBuffer, mode: "replace" | "merge" = "replace") =>
  api.upload<{ ok: boolean }>(`/settings/import?mode=${mode}`, data);

export const resetAll = () =>
  api.post<{ ok: boolean }>("/settings/reset", {});

// Projects (additions)
export const updateProject = (id: string, updates: { name?: string }) =>
  api.put<Project>(`/projects/${id}`, updates);

export const deleteProject = (id: string) =>
  api.del<{ ok: boolean }>(`/projects/${id}`);

// Columns (additions)
export const updateColumn = (id: string, updates: { name?: string; order?: number }) =>
  api.put<Column>(`/columns/${id}`, updates);

export const deleteColumn = (id: string) =>
  api.del<{ ok: boolean }>(`/columns/${id}`);

export const createColumn = (projectId: string, name: string, order: number) =>
  api.post<Column>(`/projects/${projectId}/columns`, { name, order });

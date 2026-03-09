import type { WSEvent, WSEventType } from "../shared/types.js";
import type { WSContext } from "hono/ws";

const clients = new Set<WSContext>();

export function addClient(ws: WSContext): void {
  clients.add(ws);
}

export function removeClient(ws: WSContext): void {
  clients.delete(ws);
}

export function broadcast<T>(type: WSEventType, data: T): void {
  const message = JSON.stringify({ type, data } satisfies WSEvent<T>);
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

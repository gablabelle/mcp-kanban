import { loadConfig } from "../cli/config.js";

export async function notifyServer(type: string, data: unknown): Promise<void> {
  try {
    const config = loadConfig();
    const port = config.port ?? 3010;
    const url = `http://localhost:${port}/internal/broadcast`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
    console.error(`[notify] POST ${url} → ${res.status}`);
  } catch (err) {
    console.error(`[notify] Failed:`, err);
  }
}

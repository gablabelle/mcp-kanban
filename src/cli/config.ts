import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".mcp-kanban");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface Config {
  providers: string[];
  port: number;
  dbPath: string;
  firstRunCompleted: boolean;
  theme: string;
  scrollMode: string;
}

const DEFAULT_CONFIG: Config = {
  providers: [],
  port: 3010,
  dbPath: path.join(CONFIG_DIR, "kanban.db"),
  firstRunCompleted: false,
  theme: "system",
  scrollMode: "column",
};

export function loadConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function resetConfig(): void {
  try {
    fs.unlinkSync(CONFIG_PATH);
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(path.join(CONFIG_DIR, "kanban.db"));
  } catch {
    // ignore
  }
}

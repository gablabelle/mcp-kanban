import type { ProviderAdapter } from "./types.js";
import { claudeProvider } from "./claude/index.js";
import { cursorProvider } from "./cursor/index.js";
import { codexProvider } from "./codex/index.js";

export type { ProviderAdapter } from "./types.js";

const providers: ProviderAdapter[] = [
  claudeProvider,
  cursorProvider,
  codexProvider,
];

const registry = new Map(providers.map((p) => [p.id, p]));

export function getProvider(id: string): ProviderAdapter | undefined {
  return registry.get(id);
}

export function listProviders(): ProviderAdapter[] {
  return providers;
}

export async function installProvider(id: string): Promise<void> {
  const provider = getProvider(id);
  if (!provider) throw new Error(`Unknown provider: ${id}`);

  const detected = await provider.detect();
  if (!detected) {
    console.log(`  Warning: ${provider.name} not detected on this system.`);
  }

  await provider.install();

  const verified = await provider.verify();
  if (verified) {
    console.log(`  ✓ ${provider.name} integration verified`);
  }
}

export async function uninstallProvider(id: string): Promise<void> {
  const provider = getProvider(id);
  if (!provider) throw new Error(`Unknown provider: ${id}`);
  await provider.uninstall();
}

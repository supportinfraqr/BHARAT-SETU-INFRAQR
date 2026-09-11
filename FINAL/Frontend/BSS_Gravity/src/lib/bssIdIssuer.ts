import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateVerhoeffDigit } from "@/lib/bssId";

type Registry = { version: 1; bySubject: Record<string, string>; issued: Record<string, { issuedAt: string }> };
const registryPath = process.env.BSS_ID_REGISTRY_PATH ?? path.join(process.cwd(), ".data", "bss-identities.json");
const lockPath = `${registryPath}.lock`;
const emptyRegistry = (): Registry => ({ version: 1, bySubject: {}, issued: {} });

function getHmacSecret(): string {
  const configured = process.env.BSS_ID_HMAC_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("BSS_ID_HMAC_SECRET must be at least 32 characters in production.");
  return "bss-local-development-secret-change-me";
}
function fingerprint(subject: string): string { return createHmac("sha256", getHmacSecret()).update(subject).digest("hex"); }
function candidateId(): string {
  let payload = String(randomInt(2, 10));
  for (let index = 0; index < 10; index += 1) payload += String(randomInt(0, 10));
  return `BSS${payload}${calculateVerhoeffDigit(payload)}`;
}
async function readRegistry(): Promise<Registry> {
  try {
    const parsed = JSON.parse(await readFile(registryPath, "utf8")) as Registry;
    if (parsed.version !== 1 || !parsed.bySubject || !parsed.issued) throw new Error("Unsupported BSS ID registry format.");
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyRegistry();
    throw error;
  }
}
async function acquireLock(): Promise<() => Promise<void>> {
  await mkdir(path.dirname(registryPath), { recursive: true, mode: 0o700 });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`);
      return async () => { await handle.close(); await unlink(lockPath).catch(() => undefined); };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = Date.now() - (await stat(lockPath)).mtimeMs;
      if (age > 30_000) await unlink(lockPath).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 20 + randomInt(0, 30)));
    }
  }
  throw new Error("BSS ID registry is busy. Please retry.");
}
export async function issueBssId(verifiedSubject: string): Promise<{ bssId: string; existing: boolean }> {
  const subjectKey = fingerprint(verifiedSubject);
  const release = await acquireLock();
  try {
    const registry = await readRegistry();
    const existing = registry.bySubject[subjectKey];
    if (existing) return { bssId: existing, existing: true };
    let bssId = candidateId();
    for (let collision = 0; registry.issued[bssId]; collision += 1) {
      if (collision >= 20) throw new Error("Unable to allocate a unique BSS ID.");
      bssId = candidateId();
    }
    registry.bySubject[subjectKey] = bssId;
    registry.issued[bssId] = { issuedAt: new Date().toISOString() };
    const temporaryPath = `${registryPath}.${process.pid}.${randomInt(1_000_000)}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, registryPath);
    return { bssId, existing: false };
  } finally { await release(); }
}

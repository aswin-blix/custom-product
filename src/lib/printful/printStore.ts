import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Temporary store for print files so the Printful Mockup Generator (which only
 * accepts URLs) can fetch them. Kept in memory and mirrored to the OS temp dir.
 */
interface Entry {
  buf: Buffer;
  type: string;
  exp: number;
}

const TTL_MS = 30 * 60 * 1000;
const DIR = path.join(os.tmpdir(), "custom-product-prints");
const g = globalThis as unknown as { __printStore?: Map<string, Entry> };
const store = (g.__printStore ??= new Map<string, Entry>());

function sweep() {
  const now = Date.now();
  for (const [k, e] of store) if (e.exp < now) store.delete(k);
}

export async function putPrint(buf: Buffer, type = "image/png") {
  sweep();
  const id = crypto.randomBytes(12).toString("hex");
  store.set(id, { buf, type, exp: Date.now() + TTL_MS });
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, `${id}.png`), buf);
  } catch {
    /* memory copy is enough */
  }
  return id;
}

export async function getPrint(id: string): Promise<Entry | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const e = store.get(id);
  if (e) return e;
  try {
    const buf = await fs.readFile(path.join(DIR, `${id}.png`));
    return { buf, type: "image/png", exp: Date.now() + TTL_MS };
  } catch {
    return null;
  }
}

/** Public origin Printful can reach, or null when we're only on localhost. */
export function publicBaseUrl(req: Request): string | null {
  const env = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (env) return env;
  // behind a tunnel / proxy (ngrok, cloudflared, Vercel) use the forwarded host
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin;
  return /localhost|127\.0\.0\.1|\[::1\]/.test(origin) ? null : origin;
}

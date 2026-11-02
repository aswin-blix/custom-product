import { NextResponse } from "next/server";
import { publicBaseUrl, putPrint } from "@/lib/printful/printStore";

/**
 * Host a print file temporarily so an external mockup generator can fetch it.
 * Responds 409 when the app is not reachable from the internet (localhost without
 * PUBLIC_BASE_URL) so the client can fall back to local template mockups.
 */
export async function POST(req: Request) {
  const base = publicBaseUrl(req);
  if (!base) {
    return NextResponse.json({ error: "no-public-url", hint: "Set PUBLIC_BASE_URL (e.g. an ngrok tunnel) so Printful can fetch print files." }, { status: 409 });
  }
  const { dataUrl } = (await req.json()) as { dataUrl?: string };
  const m = dataUrl?.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "dataUrl must be a base64 PNG/JPEG" }, { status: 400 });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 60 * 1024 * 1024) return NextResponse.json({ error: "print file too large" }, { status: 413 });
  const id = await putPrint(buf, m[1]);
  return NextResponse.json({ id, url: `${base}/api/prints/${id}` });
}

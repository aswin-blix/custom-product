import { getPrint } from "@/lib/printful/printStore";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getPrint(id);
  if (!e) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(e.buf), { headers: { "Content-Type": e.type, "Cache-Control": "public, max-age=1800" } });
}

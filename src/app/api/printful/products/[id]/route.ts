import { NextResponse } from "next/server";
import { getProductData, hasPrintfulKey, PrintfulError } from "@/lib/printful/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasPrintfulKey()) return NextResponse.json({ error: "PRINTFUL_API_KEY not configured" }, { status: 503 });
  try {
    const data = await getProductData(Number(id));
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    const err = e as PrintfulError;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}

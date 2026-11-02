import { NextResponse } from "next/server";
import { generateMockups, hasPrintfulKey, PrintfulError, type MockupRequestFile } from "@/lib/printful/server";

export const maxDuration = 120;

interface Body {
  productId: number;
  variantId: number;
  files: MockupRequestFile[];
  styleIds?: number[];
}

export async function POST(req: Request) {
  if (!hasPrintfulKey()) return NextResponse.json({ error: "PRINTFUL_API_KEY not configured" }, { status: 503 });
  const body = (await req.json()) as Body;
  if (!body?.productId || !body?.variantId || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "productId, variantId and files are required" }, { status: 400 });
  }
  try {
    const result = await generateMockups(body.productId, body.variantId, body.files, body.styleIds);
    return NextResponse.json(result);
  } catch (e) {
    const err = e as PrintfulError;
    return NextResponse.json({ error: err.message, detail: err.body }, { status: err.status ?? 500 });
  }
}

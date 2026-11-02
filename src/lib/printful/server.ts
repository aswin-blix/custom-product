import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { MockupResult, PfPlacementDims, PfVariant, ProductData, TemplateInfo } from "./types";

const API = "https://api.printful.com";
const CACHE_DIR = path.join(process.cwd(), ".cache", "printful");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function hasPrintfulKey() {
  const k = process.env.PRINTFUL_API_KEY;
  return !!k && !k.startsWith("paste-your");
}

export class PrintfulError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function pf<T>(pathname: string, init?: RequestInit): Promise<T> {
  const key = process.env.PRINTFUL_API_KEY;
  if (!hasPrintfulKey() || !key) throw new PrintfulError("PRINTFUL_API_KEY is not configured", 503);
  const r = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await r.json().catch(() => ({}))) as { result?: unknown; data?: unknown; error?: { message?: string } };
  if (!r.ok) throw new PrintfulError(body?.error?.message ?? `Printful ${pathname} failed (${r.status})`, r.status, body);
  return body as T;
}

/* ---------------- disk + memory cache ---------------- */

const mem = new Map<string, { t: number; v: unknown }>();

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const m = mem.get(key);
  if (m && now - m.t < CACHE_TTL_MS) return m.v as T;
  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as { t: number; v: T };
    if (now - raw.t < CACHE_TTL_MS) {
      mem.set(key, raw);
      return raw.v;
    }
  } catch {
    /* no cache */
  }
  const v = await loader();
  mem.set(key, { t: now, v });
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(file, JSON.stringify({ t: now, v }));
  } catch {
    /* read-only fs is fine */
  }
  return v;
}

/* ---------------- raw API shapes (only what we read) ---------------- */

interface V1Product {
  result: {
    product: {
      id: number;
      type: string;
      title: string;
      image: string;
      description: string;
      currency: string;
      options: { id: string; title: string; values: Record<string, string> | null }[];
    };
    variants: { id: number; name: string; size: string; color: string | null; color_code: string | null; image: string; price: string; in_stock: boolean }[];
  };
}
interface V1Printfiles {
  result: {
    available_placements: Record<string, string>;
    printfiles: { printfile_id: number; width: number; height: number; dpi: number; fill_mode: "cover" | "fit" }[];
    variant_printfiles: { variant_id: number; placements: Record<string, number> }[];
  };
}
interface V1Templates {
  result: {
    templates: {
      template_id: number;
      image_url: string;
      background_color: string | null;
      printfile_id: number;
      template_width: number;
      template_height: number;
      print_area_width: number;
      print_area_height: number;
      print_area_top: number;
      print_area_left: number;
    }[];
    variant_mapping: { variant_id: number; templates: { placement: string; template_id: number }[] }[];
  };
}
interface V2Images {
  data: { catalog_variant_id: number; images: { placement: string; image_url: string }[] }[];
}
interface V2Styles {
  data: { placement: string; display_name: string; print_area_width: number; print_area_height: number; mockup_styles: { id: number; category_name: string; view_name: string }[] }[];
}

/** Placements the design maker exposes (branding / labels are fulfilment-only). */
const HIDDEN = /^label_|^details$/;

export async function getProductData(id: number): Promise<ProductData> {
  return cached(`product-${id}`, async () => {
    const [prod, pfs, tpls, imgs, styles] = await Promise.all([
      pf<V1Product>(`/products/${id}`),
      pf<V1Printfiles>(`/mockup-generator/printfiles/${id}`),
      pf<V1Templates>(`/mockup-generator/templates/${id}`),
      pf<V2Images>(`/v2/catalog-products/${id}/images`).catch(() => ({ data: [] }) as V2Images),
      pf<V2Styles>(`/v2/catalog-products/${id}/mockup-styles`).catch(() => ({ data: [] }) as V2Styles),
    ]);

    const printfiles = new Map(pfs.result.printfiles.map((p) => [p.printfile_id, p]));
    const templates = new Map(tpls.result.templates.map((t) => [t.template_id, t]));
    const tplByVariant = new Map(tpls.result.variant_mapping.map((m) => [m.variant_id, m.templates]));
    const pfByVariant = new Map(pfs.result.variant_printfiles.map((m) => [m.variant_id, m.placements]));
    const imgByVariant = new Map(imgs.data.map((d) => [d.catalog_variant_id, d.images]));
    const styleByPlacement = new Map(styles.data.map((s) => [s.placement, s]));

    const placementIds = Object.keys(pfs.result.available_placements).filter((p) => !HIDDEN.test(p));

    const variants: PfVariant[] = prod.result.variants.map((v) => {
      const placements: Record<string, PfPlacementDims> = {};
      const pfMap = pfByVariant.get(v.id) ?? {};
      const tMap = new Map((tplByVariant.get(v.id) ?? []).map((t) => [t.placement, t.template_id]));
      const images = new Map((imgByVariant.get(v.id) ?? []).map((i) => [i.placement, i.image_url]));
      for (const pid of placementIds) {
        const file = printfiles.get(pfMap[pid]);
        if (!file) continue;
        const t = templates.get(tMap.get(pid) ?? -1);
        const template: TemplateInfo | null = t
          ? {
              templateId: t.template_id,
              imageUrl: t.image_url,
              templateWidth: t.template_width,
              templateHeight: t.template_height,
              printAreaWidth: t.print_area_width,
              printAreaHeight: t.print_area_height,
              printAreaLeft: t.print_area_left,
              printAreaTop: t.print_area_top,
              backgroundColor: t.background_color,
            }
          : null;
        placements[pid] = {
          printfileId: file.printfile_id,
          width: file.width,
          height: file.height,
          dpi: file.dpi,
          fillMode: file.fill_mode,
          template,
          blankImage: images.get(pid) ?? null,
        };
      }
      return {
        id: v.id,
        name: v.name,
        size: v.size,
        color: v.color,
        colorHex: v.color_code,
        price: parseFloat(v.price),
        image: v.image,
        inStock: v.in_stock,
        placements,
      };
    });

    const first = variants[0];
    const placements = placementIds
      .filter((pid) => first?.placements[pid])
      .map((pid) => {
        const s = styleByPlacement.get(pid);
        const d = first.placements[pid];
        return {
          id: pid,
          label: pfs.result.available_placements[pid].replace(/ print$/i, ""),
          widthIn: s?.print_area_width ?? d.width / d.dpi,
          heightIn: s?.print_area_height ?? d.height / d.dpi,
        };
      });

    const seen = new Set<number>();
    const mockupStyles = styles.data
      .flatMap((s) => s.mockup_styles)
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
      .map((m) => ({ id: m.id, category: m.category_name, view: m.view_name }));

    const p = prod.result.product;
    return {
      id: p.id,
      name: p.title,
      type: p.type,
      image: p.image,
      description: p.description,
      currency: p.currency,
      placements,
      options: p.options
        .filter((o) => o.values && o.id !== "license_type")
        .map((o) => ({ id: o.id, title: o.title, values: Object.entries(o.values!).map(([id, label]) => ({ id, label })) })),
      variants,
      mockupStyles,
      fetchedAt: Date.now(),
    };
  });
}

/* ---------------- mockup generator ---------------- */

export interface MockupRequestFile {
  placement: string;
  imageUrl: string;
  width: number;
  height: number;
}

export async function generateMockups(productId: number, variantId: number, files: MockupRequestFile[], styleIds?: number[]): Promise<{ mockups: MockupResult[]; printfiles: { placement: string; url: string }[] }> {
  const body: Record<string, unknown> = {
    variant_ids: [variantId],
    format: "jpg",
    files: files.map((f) => ({
      placement: f.placement,
      image_url: f.imageUrl,
      position: { area_width: f.width, area_height: f.height, width: f.width, height: f.height, top: 0, left: 0 },
    })),
  };
  if (styleIds?.length) body.mockup_style_ids = styleIds;

  const created = await pf<{ result: { task_key: string; status: string } }>(`/mockup-generator/create-task/${productId}`, { method: "POST", body: JSON.stringify(body) });
  const key = created.result.task_key;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 2500 : 3000));
    const t = await pf<{ result: { status: string; error?: string; mockups?: { placement: string; variant_ids: number[]; mockup_url: string; extra?: { title: string; url: string }[] }[]; printfiles?: { placement: string; url: string }[] } }>(`/mockup-generator/task?task_key=${key}`);
    if (t.result.status === "completed") {
      return {
        mockups: (t.result.mockups ?? []).map((m) => ({ placement: m.placement, variantIds: m.variant_ids, url: m.mockup_url, extra: (m.extra ?? []).map((e) => ({ title: e.title, url: e.url })) })),
        printfiles: t.result.printfiles ?? [],
      };
    }
    if (t.result.status === "failed") throw new PrintfulError(t.result.error ?? "Mockup generation failed", 502);
  }
  throw new PrintfulError("Mockup generation timed out", 504);
}

import "server-only";
import { cacheLife } from "next/cache";
import { PRODUCTS, getProduct, type ProductDef } from "./catalog";
import { getProductData, hasPrintfulKey, hasSnapshot } from "./printful/server";
import { mergeProduct } from "./printful/merge";

/**
 * Static definition enriched with catalog data: the offline snapshot in
 * data/printful/ when present, otherwise the live API (needs a key), otherwise
 * the built-in definition.
 */
export async function loadProduct(slug: string): Promise<ProductDef | undefined> {
  "use cache";
  cacheLife("hours");
  const base = getProduct(slug);
  if (!base) return undefined;
  if (!(await hasSnapshot(base.printfulId)) && !hasPrintfulKey()) return base;
  try {
    return mergeProduct(base, await getProductData(base.printfulId));
  } catch (e) {
    console.warn(`[printful] falling back to static data for ${slug}:`, (e as Error).message);
    return base;
  }
}

export async function loadAllProducts(): Promise<ProductDef[]> {
  "use cache";
  cacheLife("hours");
  return Promise.all(PRODUCTS.map((p) => loadProduct(p.slug).then((x) => x ?? p)));
}

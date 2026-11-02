import "server-only";
import { cacheLife } from "next/cache";
import { PRODUCTS, getProduct, type ProductDef } from "./catalog";
import { getProductData, hasPrintfulKey } from "./printful/server";
import { mergeProduct } from "./printful/merge";

/** Static definition enriched with live Printful data when a key is configured. */
export async function loadProduct(slug: string): Promise<ProductDef | undefined> {
  "use cache";
  cacheLife("hours");
  const base = getProduct(slug);
  if (!base) return undefined;
  if (!hasPrintfulKey()) return base;
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

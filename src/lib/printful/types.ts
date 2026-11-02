/** Normalized shape of what the designer needs from the Printful catalog. */

export interface TemplateInfo {
  templateId: number;
  imageUrl: string;
  templateWidth: number;
  templateHeight: number;
  printAreaWidth: number;
  printAreaHeight: number;
  printAreaLeft: number;
  printAreaTop: number;
  backgroundColor: string | null;
}

export interface PfPlacementDims {
  printfileId: number;
  /** print file pixels at `dpi` */
  width: number;
  height: number;
  dpi: number;
  fillMode: "cover" | "fit";
  template: TemplateInfo | null;
  /** blank placement image from the v2 /images endpoint (no-text template) */
  blankImage: string | null;
}

export interface PfVariant {
  id: number;
  name: string;
  size: string;
  color: string | null;
  colorHex: string | null;
  price: number;
  image: string;
  inStock: boolean;
  placements: Record<string, PfPlacementDims>;
}

export interface PfMockupStyle {
  id: number;
  category: string;
  view: string;
}

export interface ProductData {
  id: number;
  name: string;
  type: string;
  image: string;
  description: string;
  currency: string;
  /** placement id → human label, in catalog order (labels / branding excluded) */
  placements: { id: string; label: string; widthIn: number; heightIn: number }[];
  options: { id: string; title: string; values: { id: string; label: string }[] }[];
  variants: PfVariant[];
  mockupStyles: PfMockupStyle[];
  fetchedAt: number;
}

export interface MockupResult {
  placement: string;
  variantIds: number[];
  url: string;
  extra: { title: string; url: string }[];
}

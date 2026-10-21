/** DEBRODER Master Panduan Ukuran v1.0
 * Source: two reference images approved by the owner (21 Oct 2026).
 * Guidance only: never replace the product/PIM size, price, or stock data.
 */
export type KaosSleeve = "short" | "long";

export type MasterKaosSizeRow = Readonly<{
  size: string;
  chest: number;
  length: number;
  sleeve: number;
}>;

export const MASTER_KAOS_SIZE_GUIDES: Record<KaosSleeve, {
  title: string;
  illustration: string;
  rows: readonly MasterKaosSizeRow[];
}> = {
  short: {
    title: "Lengan Pendek",
    illustration: "/images/size-guide/kaos-lengan-pendek.webp",
    rows: [
      { size: "S", chest: 47, length: 67, sleeve: 19 },
      { size: "M", chest: 50, length: 70, sleeve: 19.5 },
      { size: "L", chest: 53, length: 73, sleeve: 20 },
      { size: "XL", chest: 56, length: 75, sleeve: 20.5 },
      { size: "2XL", chest: 59, length: 77, sleeve: 21 },
      { size: "3XL", chest: 62, length: 80, sleeve: 21.5 }
    ]
  },
  long: {
    title: "Lengan Panjang",
    illustration: "/images/size-guide/kaos-lengan-panjang.webp",
    rows: [
      { size: "S", chest: 47, length: 67, sleeve: 58 },
      { size: "M", chest: 50, length: 70, sleeve: 59 },
      { size: "L", chest: 53, length: 73, sleeve: 60 },
      { size: "XL", chest: 56, length: 75, sleeve: 61 },
      { size: "2XL", chest: 59, length: 77, sleeve: 62 },
      { size: "3XL", chest: 62, length: 80, sleeve: 63 },
      { size: "4XL", chest: 65, length: 83, sleeve: 64 },
      { size: "5XL", chest: 68, length: 86, sleeve: 65 }
    ]
  }
};

export const MASTER_KAOS_SIZE_TOLERANCE = "Toleransi ukuran 1–2,5 cm";

export function isKaosSizeGuideApplicable(...labels: (string | null | undefined)[]) {
  const value = labels.filter(Boolean).join(" ").toLowerCase();
  return /kaos|t[\s-]?shirt|cotton combed/.test(value)
    && !/jersey|jaket|jacket|hoodie|crewneck|kemeja|polo(?!s)/.test(value);
}

export function defaultKaosSleeve(...labels: (string | null | undefined)[]): KaosSleeve {
  return /lengan[\s-]*panjang|long[\s-]*sleeve|longsleeve/i.test(labels.join(" "))
    ? "long"
    : "short";
}

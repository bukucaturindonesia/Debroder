import type { PimProduct as Product } from "@/lib/types";

const categoryApparel = {
  id: "cat-apparel",
  name: "Apparel",
  slug: "apparel",
  description: "Produk pakaian siap custom.",
  status: "active" as const,
  sortOrder: 10
};

const sizes = {
  s: {
    id: "size-s",
    name: "S",
    slug: "s",
    sortOrder: 10,
    status: "active" as const,
    priceAdjustment: 0
  },
  m: {
    id: "size-m",
    name: "M",
    slug: "m",
    sortOrder: 20,
    status: "active" as const,
    priceAdjustment: 0
  },
  l: {
    id: "size-l",
    name: "L",
    slug: "l",
    sortOrder: 30,
    status: "active" as const,
    priceAdjustment: 0
  },
  xl: {
    id: "size-xl",
    name: "XL",
    slug: "xl",
    sortOrder: 40,
    status: "active" as const,
    priceAdjustment: 0
  },
  xxl: {
    id: "size-xxl",
    name: "XXL",
    slug: "xxl",
    sortOrder: 50,
    status: "active" as const,
    priceAdjustment: 3000
  }
};

export const sampleProducts: Product[] = [
  {
    id: "prod-kcc24",
    name: "Kaos Cotton Combed 24s",
    slug: "kaos-cotton-combed-24s",
    productCategoryId: categoryApparel.id,
    category: categoryApparel,
    basePrice: 45000,
    description:
      "Kaos cotton combed 24s untuk merchandise, event, komunitas, dan kebutuhan custom harian.",
    status: "active",
    sku: "KCC24",
    priceTiers: [
      {
        id: "tier-kcc24-1",
        productId: "prod-kcc24",
        minQuantity: 1,
        maxQuantity: 11,
        unitPrice: 45000,
        quoteRequired: false,
        status: "active",
        sortOrder: 10
      },
      {
        id: "tier-kcc24-12",
        productId: "prod-kcc24",
        minQuantity: 12,
        maxQuantity: 23,
        unitPrice: 42000,
        quoteRequired: false,
        status: "active",
        sortOrder: 20
      },
      {
        id: "tier-kcc24-24",
        productId: "prod-kcc24",
        minQuantity: 24,
        maxQuantity: 49,
        unitPrice: 39000,
        quoteRequired: false,
        status: "active",
        sortOrder: 30
      },
      {
        id: "tier-kcc24-50",
        productId: "prod-kcc24",
        minQuantity: 50,
        maxQuantity: null,
        unitPrice: null,
        quoteRequired: true,
        status: "active",
        sortOrder: 40
      }
    ],
    minimumRule: {
      id: "min-kcc24",
      productId: "prod-kcc24",
      minimumQuantity: 12,
      minimumForTierQuantity: 12,
      quotationQuantity: 50,
      status: "active"
    },
    variants: [
      {
        id: "var-kcc24-blk",
        productId: "prod-kcc24",
        name: "Hitam",
        slug: "hitam",
        hexCode: "#111111",
        sku: "KCC24-BLK",
        sortOrder: 10,
        isDefault: true,
        status: "active",
        priceAdjustment: 0,
        images: [
          {
            id: "img-kcc24-blk-front",
            variantId: "var-kcc24-blk",
            imageUrl:
              "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80",
            imageRole: "front",
            sortOrder: 10,
            altText: "Kaos cotton combed warna hitam tampak depan"
          },
          {
            id: "img-kcc24-blk-detail",
            variantId: "var-kcc24-blk",
            imageUrl:
              "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1000&q=80",
            imageRole: "detail",
            sortOrder: 30,
            altText: "Detail bahan kaos cotton combed warna hitam"
          }
        ],
        sizes: [
          {
            id: "vsize-kcc24-blk-s",
            variantId: "var-kcc24-blk",
            sizeId: sizes.s.id,
            sku: "KCC24-BLK-S",
            stockQuantity: 12,
            priceAdjustment: 0,
            status: "active",
            size: sizes.s
          },
          {
            id: "vsize-kcc24-blk-m",
            variantId: "var-kcc24-blk",
            sizeId: sizes.m.id,
            sku: "KCC24-BLK-M",
            stockQuantity: 20,
            priceAdjustment: 0,
            status: "active",
            size: sizes.m
          },
          {
            id: "vsize-kcc24-blk-l",
            variantId: "var-kcc24-blk",
            sizeId: sizes.l.id,
            sku: "KCC24-BLK-L",
            stockQuantity: 0,
            priceAdjustment: 0,
            status: "active",
            size: sizes.l
          },
          {
            id: "vsize-kcc24-blk-xl",
            variantId: "var-kcc24-blk",
            sizeId: sizes.xl.id,
            sku: "KCC24-BLK-XL",
            stockQuantity: 8,
            priceAdjustment: 0,
            status: "active",
            size: sizes.xl
          }
        ]
      },
      {
        id: "var-kcc24-wht",
        productId: "prod-kcc24",
        name: "Putih",
        slug: "putih",
        hexCode: "#F7F4ED",
        sku: "KCC24-WHT",
        sortOrder: 20,
        isDefault: false,
        status: "active",
        priceAdjustment: 0,
        images: [
          {
            id: "img-kcc24-wht-front",
            variantId: "var-kcc24-wht",
            imageUrl:
              "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
            imageRole: "front",
            sortOrder: 10,
            altText: "Kaos cotton combed warna putih tampak depan"
          },
          {
            id: "img-kcc24-wht-lifestyle",
            variantId: "var-kcc24-wht",
            imageUrl:
              "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80",
            imageRole: "lifestyle",
            sortOrder: 40,
            altText: "Kaos putih dipakai harian"
          }
        ],
        sizes: [
          {
            id: "vsize-kcc24-wht-s",
            variantId: "var-kcc24-wht",
            sizeId: sizes.s.id,
            sku: "KCC24-WHT-S",
            stockQuantity: 9,
            priceAdjustment: 0,
            status: "active",
            size: sizes.s
          },
          {
            id: "vsize-kcc24-wht-m",
            variantId: "var-kcc24-wht",
            sizeId: sizes.m.id,
            sku: "KCC24-WHT-M",
            stockQuantity: 16,
            priceAdjustment: 0,
            status: "active",
            size: sizes.m
          },
          {
            id: "vsize-kcc24-wht-xl",
            variantId: "var-kcc24-wht",
            sizeId: sizes.xl.id,
            sku: "KCC24-WHT-XL",
            stockQuantity: 4,
            priceAdjustment: 0,
            status: "active",
            size: sizes.xl
          },
          {
            id: "vsize-kcc24-wht-xxl",
            variantId: "var-kcc24-wht",
            sizeId: sizes.xxl.id,
            sku: "KCC24-WHT-XXL",
            stockQuantity: 2,
            priceAdjustment: 2000,
            status: "active",
            size: sizes.xxl
          }
        ]
      }
    ]
  }
];

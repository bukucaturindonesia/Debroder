import { z } from "zod";

export const basketSchema = z
  .array(
    z
      .object({
        variantSizeId: z.uuid(),
        quantity: z.number().int().min(1).max(100),
      })
      .strict(),
  )
  .min(1)
  .max(50)
  .refine(
    (items) =>
      new Set(items.map((item) => item.variantSizeId)).size === items.length &&
      items.reduce((sum, item) => sum + item.quantity, 0) <= 500,
  );
export type FastBasket = z.infer<typeof basketSchema>;
export const destinationSchema = z.object({
  id: z.number().int().positive(),
  label: z.string().min(3).max(500),
  province_name: z.string().min(1),
  city_name: z.string().min(1),
  district_name: z.string().min(1),
  subdistrict_name: z.string().min(1),
  zip_code: z.string().regex(/^\d{5}$/),
});
export type Destination = z.infer<typeof destinationSchema>;
export type ShippingRate = {
  code: string;
  name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};
export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{16,100}$/),
    items: basketSchema,
    customer: z.object({
      name: z.string().trim().min(2).max(150),
      phone: z.string().regex(/^(?:\+?62|0)[0-9]{8,13}$/),
      email: z.email().max(254),
    }),
    addressDetail: z.string().trim().max(500).default(""),
    fulfillment: z.enum(["shipping", "pickup"]),
    quoteToken: z.string().max(12000).optional(),
    pickupLocationId: z.uuid().optional(),
  })
  .strict();
export type FastCheckoutInput = z.infer<typeof checkoutSchema>;
export type FastQuote = {
  version: 1;
  fingerprint: string;
  origin: number;
  destination: Destination;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  rate: ShippingRate;
  subtotal: number;
  issuedAt: number;
  expiresAt: number;
  settingsVersion: string;
};
export type FastPreview = {
  subtotal: number;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  fingerprint: string;
};

export const PUBLIC_ROUTES = {
  home: "/",
  collection: "/koleksi",
  product: (slug: string) => `/produk/${encodeURIComponent(slug)}`,
  jersey: "/jersey",
  jerseyShop: "/jersey/shop",
  jerseyCustom: "/jersey/configurator",
  plainShirts: "/kaos-polos",
  plainShirtsShop: "/kaos-polos/shop",
  jackets: "/jaket-hoodie",
  jacketsShop: "/jaket-hoodie/shop",
  headwear: "/headwear",
  headwearShop: "/headwear/shop",
  dtf: "/sablon-dtf",
  sublimation: "/cetak-sublim",
  custom: "/custom",
  cart: "/cart",
  cartLocalized: "/keranjang",
  checkout: "/checkout",
  orderConfirmation: "/order-confirmation",
  orderConfirmationToken: (token: string) =>
    `/order-confirmation/${encodeURIComponent(token)}`,
  account: "/account",
  accountOrders: "/account/orders",
  accountOrder: (id: string) => `/account/orders/${encodeURIComponent(id)}`,
  tracking: "/track-order",
  trackingOrder: (orderNumber: string) =>
    `/track-order/${encodeURIComponent(orderNumber)}`,
  search: "/search",
  help: "/help",
  freshDrop: "/fresh-drop",
  store: "/store",
  orderGuide: "/cara-order"
} as const;

export const PUBLIC_SITEMAP_ROUTES = [
  PUBLIC_ROUTES.home,
  PUBLIC_ROUTES.collection,
  PUBLIC_ROUTES.custom,
  PUBLIC_ROUTES.plainShirts,
  PUBLIC_ROUTES.plainShirtsShop,
  PUBLIC_ROUTES.jersey,
  PUBLIC_ROUTES.jerseyShop,
  PUBLIC_ROUTES.jerseyCustom,
  PUBLIC_ROUTES.jackets,
  PUBLIC_ROUTES.jacketsShop,
  PUBLIC_ROUTES.headwear,
  PUBLIC_ROUTES.headwearShop,
  PUBLIC_ROUTES.dtf,
  PUBLIC_ROUTES.sublimation,
  PUBLIC_ROUTES.cart,
  PUBLIC_ROUTES.checkout,
  PUBLIC_ROUTES.orderConfirmation,
  PUBLIC_ROUTES.accountOrders,
  PUBLIC_ROUTES.tracking,
  PUBLIC_ROUTES.search,
  PUBLIC_ROUTES.help,
  PUBLIC_ROUTES.store,
  PUBLIC_ROUTES.orderGuide
] as const;

export function publicServiceHref(categoryKey: string | undefined, slug: string) {
  if (categoryKey === "sablon-dtf") return `/sablon-dtf/${encodeURIComponent(slug)}`;
  if (categoryKey === "cetak-sublim") return PUBLIC_ROUTES.sublimation;
  if (categoryKey === "maklon-dtf") return "/maklon-dtf";
  return PUBLIC_ROUTES.custom;
}

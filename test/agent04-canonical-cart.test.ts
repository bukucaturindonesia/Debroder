import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("renders canonical cart and redirects only legacy aliases", () => {
  const cart = readFileSync("app/cart/page.tsx", "utf8");
  expect(cart).toContain("CartPageContent");
  expect(cart).toContain('canonical: "/cart"');
  expect(cart).not.toContain("redirect(");
  for (const alias of ["app/keranjang/page.tsx", "app/order/page.tsx"]) {
    expect(readFileSync(alias, "utf8")).toContain('redirect("/cart")');
  }
});
it("cart revalidation follows the canonical cart surface", () => {
  const provider = readFileSync("components/CartProvider.tsx", "utf8");
  expect(provider).toContain('pathname === "/cart"');
  expect(provider).not.toContain('pathname === "/keranjang"');
});

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";

type MobileNavItem = {
  label: string;
  href: string;
  icon: "logoSymbolBlack" | "category" | "search" | "wishlist" | "user";
  active: boolean;
};

const FOCUSED_FLOW_PREFIXES = [
  "/checkout",
  "/payment",
  "/order-confirmation",
  "/persetujuan",
  "/quotation"
] as const;

function isFocusedFlow(pathname: string) {
  return FOCUSED_FLOW_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const customerAuth = useCustomerAuth();

  if (isFocusedFlow(pathname)) return null;

  const accountHref = customerAuth.profile ? "/account" : "/login";
  const items: MobileNavItem[] = [
    { label: "Beranda", href: "/", icon: "logoSymbolBlack", active: pathname === "/" },
    {
      label: "Belanja",
      href: "/koleksi",
      icon: "category",
      active: pathname === "/koleksi" || pathname.startsWith("/kaos-polos") || pathname.startsWith("/jaket-hoodie") || pathname.startsWith("/headwear") || pathname.startsWith("/jersey") || pathname.startsWith("/produk/")
    },
    { label: "Cari", href: "/search", icon: "search", active: pathname.startsWith("/search") },
    { label: "Wishlist", href: "/wishlist", icon: "wishlist", active: pathname.startsWith("/wishlist") },
    { label: customerAuth.profile ? "Akun" : "Masuk", href: accountHref, icon: "user", active: pathname.startsWith("/account") || pathname === "/login" || pathname === "/register" }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi mobile DEBRODER">
      <div className="mobile-bottom-nav-inner">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`mobile-bottom-nav-item ${item.active ? "is-active" : ""}`}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden="true">
              <BrandIcon name={item.icon} className="h-[19px] w-[19px]" />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

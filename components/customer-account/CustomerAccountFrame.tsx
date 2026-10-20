"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";

const links = [
  { href: "/account", label: "Ringkasan" },
  { href: "/account/orders", label: "Pesanan" },
  { href: "/account/addresses", label: "Alamat" },
  { href: "/account/profile", label: "Profil" }
];

export function CustomerAccountFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useCustomerAuth();
  const isSigningOut = useRef(false);

  useEffect(() => {
    if (!auth.loading && !auth.session && !isSigningOut.current) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/account")}`);
    }
  }, [auth.loading, auth.session, pathname, router]);

  if (auth.loading) return <AccountMessage title="Memuat akun pelanggan..." />;
  if (!auth.session) return <AccountMessage title="Mengalihkan ke halaman masuk..." />;
  if (!auth.profile) {
    return (
      <AccountMessage title="Akun pelanggan belum dapat dibuka" detail={auth.error || "Muat ulang halaman atau masuk kembali."}>
        <button type="button" onClick={() => void auth.signOut()} className="mt-5 min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white">Keluar dari sesi ini</button>
      </AccountMessage>
    );
  }

  return (
    <section data-ui-customer className="keep-section-bg customer-area bg-brand-offWhite py-8 sm:py-12">
      <div className="section-shell mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="customer-panel h-fit border border-black/10 bg-white p-4 sm:p-5 lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Akun pelanggan</p>
            <p className="mt-3 font-semibold">{auth.profile.fullName}</p>
            <p className="mt-1 break-all text-xs text-black/50">{auth.profile.email}</p>
            {auth.profile.phone ? <p className="mt-2 text-sm text-black/60">{auth.profile.phone}</p> : null}
            <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Navigasi akun pelanggan">
              {links.map((link) => {
                const active = link.href === "/account"
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${active ? "bg-black text-white" : "hover:bg-black/5"}`}>{link.label}</Link>;
              })}
            </nav>
            <button type="button" onClick={async () => { isSigningOut.current = true; await auth.signOut(); router.replace("/"); router.refresh(); }} className="mt-5 min-h-11 w-full rounded-full border border-black/15 px-4 text-sm font-semibold">Keluar</button>
            <Link href="/help" className="mt-3 flex min-h-11 items-center justify-center text-sm font-semibold underline underline-offset-4">Bantuan pelanggan</Link>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </section>
  );
}

export function AccountPanel({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return <div className="customer-panel border border-black/10 bg-white p-4 sm:p-8"><p className="public-eyebrow">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>{description ? <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60">{description}</p> : null}<div className="mt-7">{children}</div></div>;
}

export function AccountMessage({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) {
  return <section data-ui-customer className="keep-section-bg customer-area bg-brand-offWhite px-4 py-12"><div role="status" className="customer-panel mx-auto max-w-xl border border-black/10 bg-white p-6 text-center sm:p-8"><h1 className="text-2xl font-semibold">{title}</h1>{detail ? <p className="mt-3 text-sm leading-6 text-black/60">{detail}</p> : null}{children}</div></section>;
}

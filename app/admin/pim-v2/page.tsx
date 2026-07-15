import Link from "next/link";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { BulkCustomManager } from "@/components/admin/BulkCustomManager";

export default function AdminPimV2Page() {
  return (
    <div className="grid gap-6">
      <section className="border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Dependency sementara — bukan entry point Product Manager.</p>
        <p className="mt-1">Gunakan halaman ini hanya untuk color variant, size master, sellable SKU, stok, dan variant images. Product root serta lifecycle dikelola melalui <Link href="/admin/products" className="font-semibold underline">Product Manager</Link>.</p>
      </section>
      <AdminDashboard />
      <BulkCustomManager />
    </div>
  );
}

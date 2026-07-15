import Link from "next/link";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminPimManagerPage() {
  return (
    <div className="grid gap-6">
      <section className="border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-950">
        <p className="font-semibold">Owner/Super Admin Maintenance Utility</p>
        <p className="mt-1">Halaman ini menerapkan dan menormalkan blueprint kategori/model. Jangan digunakan untuk CRUD produk harian. Gunakan <Link href="/admin/products" className="font-semibold underline">Product Manager</Link> untuk pekerjaan produk.</p>
      </section>
      <AdminDashboard />
    </div>
  );
}

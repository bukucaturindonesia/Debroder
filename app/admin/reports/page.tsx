import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

export default function AdminReportsPage() {
  return (
    <AdminPageHeader
      eyebrow="LAPORAN"
      title="Laporan Operasional"
      description="Ringkasan operasional tersedia untuk Admin Guest melalui tampilan read-only yang disanitasi. Pengembangan export laporan berada di luar scope ini."
    />
  );
}

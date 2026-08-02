import { AdminAccountDetail } from "@/components/admin/AdminAccountDetail";

export const metadata = { title: "Detail Akun Admin | DEBRODER Admin" };

export default async function AdminAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminAccountDetail accountId={id} />;
}

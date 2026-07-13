import { NotificationDetailAdmin } from "@/components/admin/NotificationDetailAdmin";

export const metadata = {
  title: "Detail Notifikasi | DEBRODER Admin"
};

export default async function AdminNotificationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NotificationDetailAdmin notificationId={id} />;
}

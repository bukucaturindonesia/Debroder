import { NotificationInboxAdmin } from "@/components/admin/NotificationInboxAdmin";

export const metadata = {
  title: "Notifikasi | DEBRODER Admin"
};

export default async function AdminNotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  return <NotificationInboxAdmin initialScope={scope === "archive" ? "archive" : "active"} />;
}

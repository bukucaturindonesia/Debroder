import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicPage";
import { GuestOrderTracking } from "@/components/tracking/GuestOrderTracking";

export const metadata: Metadata = {
  title: "Detail Pelacakan Pesanan | DEBRODER",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function TrackOrderDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ "order-number": string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [{ "order-number": orderNumber }, query] = await Promise.all([
    params,
    searchParams
  ]);
  const token = Array.isArray(query.token) ? query.token[0] : query.token ?? "";
  return (
    <PublicShell theme="jersey-commerce">
      <GuestOrderTracking initialOrderNumber={decodeURIComponent(orderNumber)} token={token} />
    </PublicShell>
  );
}

import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicPage";
import { GuestOrderTracking } from "@/components/tracking/GuestOrderTracking";
import { getPublicContent } from "@/lib/public-data";

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
  const [{ "order-number": orderNumber }, query, content] = await Promise.all([
    params,
    searchParams,
    getPublicContent()
  ]);
  const token = Array.isArray(query.token) ? query.token[0] : query.token ?? "";
  return (
    <PublicShell content={content} theme="jersey-commerce">
      <GuestOrderTracking initialOrderNumber={decodeURIComponent(orderNumber)} token={token} />
    </PublicShell>
  );
}

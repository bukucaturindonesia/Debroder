import { PublicMockupApproval } from "@/components/public/PublicMockupApproval";
import { PublicShell } from "@/components/PublicPage";

export default async function PublicMockupApprovalPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <PublicShell>
      <PublicMockupApproval token={token} />
    </PublicShell>
  );
}

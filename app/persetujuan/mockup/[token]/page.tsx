import { PublicMockupApproval } from "@/components/public/PublicMockupApproval";

export default async function PublicMockupApprovalPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicMockupApproval token={token} />;
}

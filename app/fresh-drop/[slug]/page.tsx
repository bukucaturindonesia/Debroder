import { redirect } from "next/navigation";

export default async function FreshDropDetailAliasPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/produk/${encodeURIComponent(slug)}`);
}

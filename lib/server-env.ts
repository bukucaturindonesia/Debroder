import "server-only";

export function getAdminSupabaseEnv():
  | { url: string; serviceRoleKey: string }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

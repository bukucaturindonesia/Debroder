export function isAdminRequest(request: Request): boolean {
  const configuredToken = process.env.PIM_V2_ADMIN_TOKEN?.trim();

  if (!configuredToken) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${configuredToken}`;
}


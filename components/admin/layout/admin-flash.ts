export type AdminFlashType = "success" | "error" | "info";

export type AdminFlash = {
  message: string;
  type: AdminFlashType;
};

const STORAGE_KEY = "debroder_admin_flash";

export function setAdminFlash(
  message: string,
  type: AdminFlashType = "success"
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ message, type } satisfies AdminFlash)
  );
}

export function takeAdminFlash(): AdminFlash | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  window.sessionStorage.removeItem(STORAGE_KEY);

  try {
    const parsed = JSON.parse(stored) as Partial<AdminFlash>;
    if (!parsed.message) return null;
    return {
      message: parsed.message,
      type:
        parsed.type === "error" || parsed.type === "info"
          ? parsed.type
          : "success"
    };
  } catch {
    return null;
  }
}

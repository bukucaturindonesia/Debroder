type SnapWindow = Window & {
  snap?: { pay: (token: string, options: Record<string, () => void>) => void };
};
let loading: Promise<void> | null = null;
export async function openSnap(
  session: { token: string; redirectUrl: string; clientKey: string },
  onChange: () => void,
) {
  const url = new URL(session.redirectUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "app.sandbox.midtrans.com" ||
    !url.pathname.startsWith("/snap/")
  )
    throw new Error("Tautan pembayaran tidak valid.");
  try {
    if (!(window as SnapWindow).snap) {
      loading ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        script.dataset.clientKey = session.clientKey;
        const timer = setTimeout(
          () => reject(new Error("Pembayaran belum termuat")),
          10000,
        );
        script.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timer);
          reject(new Error("Pembayaran belum termuat"));
        };
        document.head.append(script);
      }).catch((error) => {
        loading = null;
        throw error;
      });
      await loading;
    }
    const snap = (window as SnapWindow).snap;
    if (!snap) throw new Error("Popup tidak tersedia");
    snap.pay(session.token, {
      onSuccess: onChange,
      onPending: onChange,
      onError: onChange,
      onClose: onChange,
    });
  } catch {
    window.location.assign(session.redirectUrl);
  }
}

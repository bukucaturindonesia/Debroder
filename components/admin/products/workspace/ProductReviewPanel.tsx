"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useProductWorkspace } from "@/components/admin/products/workspace/ProductWorkspaceShell";
import {
  loadProductReview,
  ProductReviewRequestError,
  runProductReviewAction
} from "@/lib/admin-product-review-api";
import {
  ProductLifecycleRequestError,
  runProductLifecycleAction,
  type ProductLifecycleMaintenanceAction
} from "@/lib/admin-product-lifecycle-api";
import type {
  ProductReviewAction,
  ProductReviewGroup,
  ProductReviewPayload
} from "@/lib/product-review";
import { lifecycleLabel } from "@/lib/product-manager";

type PendingLifecycleAction = ProductReviewAction | ProductLifecycleMaintenanceAction;

export function ProductReviewPanel() {
  const {
    product,
    updateWorkspaceProduct
  } = useProductWorkspace();
  const [payload, setPayload] = useState<ProductReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingLifecycleAction | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setConflict(false);
    setNotice("");
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    void loadProductReview(product.id, controller.signal)
      .then(setPayload)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          reason instanceof Error
            ? reason.message
            : "Review & Publish belum dapat dimuat."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [product.id, reloadToken]);

  const blockers = payload?.counts.blockers || 0;
  const warnings = payload?.counts.warnings || 0;
  const readyLabel = useMemo(() => {
    if (!payload) return "Memuat readiness";
    if (blockers > 0) return `${blockers} blocker harus diselesaikan`;
    if (payload.product.status === "draft") return "Siap Publish atau dapat diarsipkan";
    if (payload.product.status === "active") return "Produk Active — siap Archive bila diperlukan";
    return "Produk Archived — dapat dipulihkan ke Draft";
  }, [blockers, payload]);

  async function executeAction() {
    if (!pendingAction || !payload || working) return;
    const action = pendingAction;
    setWorking(true);
    setNotice("");
    setConflict(false);
    try {
      const result = action === "archive_draft" || action === "restore"
        ? await runProductLifecycleAction({
          productId: product.id,
          action,
          expectedUpdatedAt: payload.product.updatedAt
        })
        : await runProductReviewAction({
          productId: product.id,
          action,
          expectedUpdatedAt: payload.product.updatedAt,
          expectedReviewVersion: payload.reviewVersion
        });
      setPayload(result.payload);
      updateWorkspaceProduct({
        ...product,
        status: result.payload.product.status,
        updatedAt: result.payload.product.updatedAt
      });
      setNotice(result.message);
    } catch (reason) {
      const status = requestStatus(reason);
      if (status === 409) {
        setConflict(true);
        setNotice("Konflik versi: data telah berubah. Muat ulang data terbaru sebelum melanjutkan.");
      } else {
        setNotice(
          reason instanceof Error
            ? reason.message
            : "Perubahan lifecycle belum berhasil."
        );
        if (status === 422) reload();
      }
    } finally {
      setPendingAction(null);
      setWorking(false);
    }
  }

  if (loading) return <ReviewLoading />;
  if (loadError || !payload) {
    return (
      <section role="alert" className="border border-red-200 bg-red-50 p-6 text-red-950 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">WP-07 REVIEW &amp; PUBLISH</p>
        <h2 className="mt-2 text-2xl font-semibold">Readiness belum dapat dimuat</h2>
        <p className="mt-3 text-sm leading-6">{loadError || "Terjadi kesalahan saat memuat readiness."}</p>
        <button type="button" onClick={reload} className="mt-5 min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">
          Coba lagi
        </button>
      </section>
    );
  }

  const readOnly = !payload.capabilities.canPublish && !payload.capabilities.canArchive;
  const canArchiveDraft = Boolean(
    payload.capabilities.canArchive && payload.product.status === "draft"
  );
  const canRestore = Boolean(
    payload.capabilities.canArchive && payload.product.status === "archived"
  );

  return (
    <div className="grid gap-6">
      <section id="publish-readiness" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">WP-07 REVIEW &amp; PUBLISH</p>
            <h2 className="mt-2 text-2xl font-semibold">Readiness produk</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
              Validasi dikelompokkan agar masalah yang sama tidak berulang. Detail backend tetap tersedia pada setiap kelompok dan server menjalankan validasi terbaru sebelum perubahan status.
            </p>
          </div>
          <div className={blockers > 0
            ? "rounded-xl bg-amber-50 px-5 py-4 text-amber-950"
            : "rounded-xl bg-green-50 px-5 py-4 text-green-950"}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">STATUS READINESS</p>
            <p className="mt-1 font-semibold">{readyLabel}</p>
            <p className="mt-1 text-xs opacity-70">{warnings} peringatan non-blocking</p>
          </div>
        </div>

        {readOnly ? (
          <div className="mt-5 border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            MODE LIHAT SAJA — Publish, Archive, dan Restore hanya tersedia untuk Owner atau Super Admin.
          </div>
        ) : null}
        {notice ? (
          <div role="status" className={conflict
            ? "mt-5 border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-950"
            : "mt-5 border border-brand-softGray bg-brand-offWhite px-5 py-4 text-sm font-medium"}
          >
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Status" value={lifecycleLabel(payload.product.status)} />
          <Metric label="Varian aktif" value={`${payload.counts.activeVariants}/${payload.counts.variants}`} />
          <Metric label="SKU aktif" value={`${payload.counts.activeSellableSkus}/${payload.counts.sellableSkus}`} />
          <Metric label="Media terpasang" value={String(payload.counts.images)} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {payload.groups.map((group) => (
          <ReviewGroupCard key={group.key} group={group} />
        ))}
      </section>

      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">LIFECYCLE AUTHORITY</p>
            <h3 className="mt-2 text-xl font-semibold">{lifecycleMessage(payload.product.status)}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">
              Tidak ada delete atau hard delete. Server memeriksa capability, lifecycle, product version, dan review version sebelum perubahan status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {payload.canPublishNow ? (
              <button
                data-admin-mutation="true"
                type="button"
                disabled={working}
                onClick={() => setPendingAction("publish")}
                className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45"
              >
                Publish Draft
              </button>
            ) : null}
            {canArchiveDraft ? (
              <button
                data-admin-mutation="true"
                type="button"
                disabled={working}
                onClick={() => setPendingAction("archive_draft")}
                className="min-h-11 rounded-full border border-amber-300 px-6 text-sm font-semibold text-amber-900 disabled:opacity-45"
              >
                Arsipkan Draft
              </button>
            ) : null}
            {payload.canArchiveNow ? (
              <button
                data-admin-mutation="true"
                type="button"
                disabled={working}
                onClick={() => setPendingAction("archive")}
                className="min-h-11 rounded-full border border-amber-300 px-6 text-sm font-semibold text-amber-900 disabled:opacity-45"
              >
                Archive Active
              </button>
            ) : null}
            {canRestore ? (
              <button
                data-admin-mutation="true"
                type="button"
                disabled={working}
                onClick={() => setPendingAction("restore")}
                className="min-h-11 rounded-full border border-brand-green px-6 text-sm font-semibold text-brand-green disabled:opacity-45"
              >
                Pulihkan ke Draft
              </button>
            ) : null}
            <button
              type="button"
              disabled={working || loading}
              onClick={reload}
              className="min-h-11 rounded-full border border-brand-softGray px-6 text-sm font-semibold disabled:opacity-45"
            >
              Muat ulang data terbaru
            </button>
          </div>
        </div>
      </section>

      {pendingAction ? (
        <ConfirmationDialog
          action={pendingAction}
          working={working}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void executeAction()}
        />
      ) : null}
    </div>
  );
}

function ReviewGroupCard({ group }: { group: ProductReviewGroup }) {
  const tone = group.status === "blocked"
    ? "border-red-200"
    : group.status === "warning"
      ? "border-amber-200"
      : "border-green-200";
  const badge = group.status === "blocked"
    ? `${group.blockerCount} blocker`
    : group.status === "warning"
      ? `${group.warningCount} peringatan`
      : "Siap";
  return (
    <article className={`border bg-white p-5 sm:p-6 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{group.label}</p>
          <h3 className="mt-2 text-lg font-semibold">{badge}</h3>
        </div>
        <span className={group.status === "blocked"
          ? "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800"
          : group.status === "warning"
            ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
            : "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800"}
        >
          {group.status === "ready" ? "PASS" : group.issueCount}
        </span>
      </div>
      {group.summaries.length ? (
        <div className="mt-5 grid gap-4">
          {group.summaries.map((summary) => (
            <div key={`${group.key}-${summary.code}`} className="border-t border-brand-softGray pt-4">
              <p className="text-sm font-medium leading-6">
                {summary.message}
                {summary.count > 1 ? ` (${summary.count} item)` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.affected.slice(0, 8).map((affected, index) => (
                  <Link
                    key={`${affected.href}-${index}`}
                    href={affected.href}
                    className="rounded-full border border-brand-softGray px-3 py-2 text-xs font-semibold hover:bg-brand-offWhite"
                  >
                    {affected.label}
                  </Link>
                ))}
                {summary.affected.length > 8 ? (
                  <span className="inline-flex items-center px-2 text-xs text-brand-charcoal/55">
                    +{summary.affected.length - 8} lainnya
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-brand-charcoal/60">
          Tidak ada masalah pada kelompok ini.
        </p>
      )}
    </article>
  );
}

function ConfirmationDialog({
  action,
  working,
  onCancel,
  onConfirm
}: {
  action: PendingLifecycleAction;
  working: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = lifecycleConfirmationCopy(action);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="wp07-confirm-title" className="w-full max-w-lg bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">KONFIRMASI LIFECYCLE</p>
        <h2 id="wp07-confirm-title" className="mt-2 text-2xl font-semibold">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
          {copy.description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={working} onClick={onCancel} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:opacity-45">
            Batal
          </button>
          <button data-admin-mutation="true" type="button" disabled={working} onClick={onConfirm} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">
            {working ? "Memproses..." : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function lifecycleConfirmationCopy(action: PendingLifecycleAction) {
  if (action === "publish") {
    return {
      title: "Publish produk ini?",
      description: "Server akan memuat ulang readiness terbaru lalu hanya mengubah Draft menjadi Active bila seluruh blocker sudah kosong.",
      confirmLabel: "Ya, Publish"
    };
  }
  if (action === "restore") {
    return {
      title: "Pulihkan produk ke Draft?",
      description: "Produk Archived akan kembali menjadi Draft. Data produk, SKU, stok, dan media tetap utuh dan produk perlu direview sebelum Publish.",
      confirmLabel: "Ya, Pulihkan"
    };
  }
  if (action === "archive_draft") {
    return {
      title: "Arsipkan Draft ini?",
      description: "Draft akan dipindahkan ke Archived tanpa menghapus produk, SKU, stok, atau media. Produk dapat dipulihkan kembali ke Draft.",
      confirmLabel: "Ya, Arsipkan Draft"
    };
  }
  return {
    title: "Archive produk ini?",
    description: "Server hanya akan mengubah Active menjadi Archived. Data produk, SKU, stok, dan media tidak dihapus.",
    confirmLabel: "Ya, Archive"
  };
}

function requestStatus(reason: unknown) {
  if (
    reason instanceof ProductReviewRequestError ||
    reason instanceof ProductLifecycleRequestError
  ) {
    return reason.status;
  }
  return null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <dl className="bg-brand-offWhite p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</dt>
      <dd className="mt-2 text-lg font-semibold">{value}</dd>
    </dl>
  );
}

function lifecycleMessage(status: "draft" | "active" | "archived") {
  if (status === "draft") return "Draft dapat dipublish menjadi Active atau dipindahkan ke Archived.";
  if (status === "active") return "Active dapat diarsipkan menjadi Archived.";
  return "Archived dapat dipulihkan kembali menjadi Draft.";
}

function ReviewLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Memuat Review & Publish">
      <div className="h-64 animate-pulse border border-brand-softGray bg-white" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-52 animate-pulse border border-brand-softGray bg-white" />
        ))}
      </div>
    </div>
  );
}

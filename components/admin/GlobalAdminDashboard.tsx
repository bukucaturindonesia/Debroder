"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import type {
  DashboardMetric,
  DashboardTrendPoint,
  GlobalAdminDashboardReadModel
} from "@/lib/global-admin-dashboard/contracts";

type IconName =
  | "bag"
  | "wallet"
  | "receipt"
  | "orders"
  | "average"
  | "box"
  | "refresh"
  | "calendar"
  | "warning";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    bag: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    wallet: <><path d="M4 7h15v11H4z" /><path d="M4 9V6h12" /><path d="M15 12h4v3h-4z" /></>,
    receipt: <><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    orders: <><path d="M5 4h14v16H5z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    average: <><path d="M5 16l4-5 3 3 6-7" /><path d="M14 7h4v4" /></>,
    box: <><path d="M4 7l8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 20v-4h-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    warning: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17h.01" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatMoney(value: number | null): string {
  if (value === null) return "Disembunyikan";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatStatus(value: string): string {
  if (!value) return "Belum tersedia";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Makassar"
  }).format(date);
}

function formatMakassarDateInput(value: string, subtractDay = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const adjusted = new Date(date.getTime() + 8 * 60 * 60 * 1000 - (subtractDay ? 86_400_000 : 0));
  return adjusted.toISOString().slice(0, 10);
}

function KpiCard({
  label,
  metric,
  icon,
  currency = false,
  tone
}: {
  label: string;
  metric: DashboardMetric;
  icon: IconName;
  currency?: boolean;
  tone: string;
}) {
  const positive = (metric.changePercent ?? 0) >= 0;
  return (
    <article className="gad-kpi-card">
      <div className="gad-kpi-heading">
        <span className="gad-icon-chip" style={{ "--gad-accent": tone } as React.CSSProperties}>
          <Icon name={icon} />
        </span>
        <span>{label}</span>
        <span className="gad-info" title={`${label} dihitung dari data canonical dalam periode terpilih.`}>i</span>
      </div>
      <strong>{currency ? formatMoney(metric.value) : formatNumber(metric.value)}</strong>
      <p className={metric.changePercent === null ? "gad-muted" : positive ? "gad-positive" : "gad-negative"}>
        {metric.changePercent === null
          ? metric.visible ? "Belum ada pembanding" : "Tidak tersedia untuk role ini"
          : `${positive ? "↗" : "↘"} ${Math.abs(metric.changePercent).toFixed(1)}% ${metric.comparisonLabel}`}
      </p>
    </article>
  );
}

function TrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const width = 600;
  const height = 230;
  const padding = 34;
  const max = Math.max(1, ...points.flatMap((point) => [point.orderValue, point.paymentValue]));
  const pointFor = (value: number, index: number) => {
    const x = points.length <= 1
      ? width / 2
      : padding + index * ((width - padding * 2) / (points.length - 1));
    const y = height - padding - (value / max) * (height - padding * 2);
    return { x, y };
  };
  const pathFor = (key: "orderValue" | "paymentValue") =>
    points.map((point, index) => {
      const position = pointFor(point[key], index);
      return `${index === 0 ? "M" : "L"}${position.x},${position.y}`;
    }).join(" ");

  return (
    <div className="gad-chart-wrap">
      {points.length ? (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="gad-trend-title gad-trend-desc">
            <title id="gad-trend-title">Tren nilai pesanan dan pembayaran diterima</title>
            <desc id="gad-trend-desc">Grafik garis berdasarkan periode dan toko terpilih.</desc>
            {[0, 1, 2, 3, 4].map((line) => {
              const y = padding + line * ((height - padding * 2) / 4);
              return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} className="gad-grid-line" />;
            })}
            <path d={pathFor("orderValue")} className="gad-order-line" />
            <path d={pathFor("paymentValue")} className="gad-payment-line" />
            {points.map((point, index) => {
              const orderPoint = pointFor(point.orderValue, index);
              const paymentPoint = pointFor(point.paymentValue, index);
              return (
                <g key={point.key}>
                  <circle cx={orderPoint.x} cy={orderPoint.y} r="4" className="gad-order-dot"><title>{`${point.label}: ${formatMoney(point.orderValue)}`}</title></circle>
                  <circle cx={paymentPoint.x} cy={paymentPoint.y} r="4" className="gad-payment-dot"><title>{`${point.label}: ${formatMoney(point.paymentValue)}`}</title></circle>
                  <text x={orderPoint.x} y={height - 8} textAnchor="middle" className="gad-axis-label">{point.label}</text>
                </g>
              );
            })}
          </svg>
          <table className="sr-only">
            <caption>Data tren penjualan dan pembayaran</caption>
            <thead><tr><th>Tanggal</th><th>Nilai pesanan</th><th>Pembayaran</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.key}><td>{point.label}</td><td>{point.orderValue}</td><td>{point.paymentValue}</td></tr>)}</tbody>
          </table>
        </>
      ) : <div className="gad-empty">Belum ada data tren pada periode ini.</div>}
    </div>
  );
}

function DashboardContent({
  model,
  refreshing,
  onRefresh,
  onFilter
}: {
  model: GlobalAdminDashboardReadModel;
  refreshing: boolean;
  onRefresh: () => void;
  onFilter: (key: string, value: string) => void;
}) {
  const totalTypes = model.orderTypes.reduce((sum, item) => sum + item.count, 0);
  let currentDegree = 0;
  const donut = model.orderTypes.map((item) => {
    const start = currentDegree;
    currentDegree += totalTypes ? (item.count / totalTypes) * 360 : 0;
    return `${item.color} ${start}deg ${currentDegree}deg`;
  }).join(",");

  return (
    <main className="gad-root">
      <header className="gad-page-header">
        <div>
          <p className="gad-eyebrow">PUSAT KENDALI OPERASIONAL</p>
          <h1>Dashboard Global</h1>
          <p>Ringkasan performa semua toko dari transaksi canonical.</p>
        </div>
        <div className="gad-header-actions" aria-label="Filter dashboard">
          <label>
            <span className="sr-only">Pilih toko</span>
            <select value={model.filter.storeId ?? ""} onChange={(event) => onFilter("store", event.target.value)}>
              <option value="">Semua Toko</option>
              {model.availableStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Pilih periode</span>
            <select value={model.filter.period} onChange={(event) => onFilter("period", event.target.value)}>
              <option value="today">Hari Ini</option>
              <option value="7d">7 Hari</option>
              <option value="30d">30 Hari</option>
              <option value="custom">Tanggal Khusus</option>
            </select>
          </label>
          {model.filter.period === "custom" ? (
            <div className="gad-custom-dates">
              <label><span className="sr-only">Tanggal mulai</span><input type="date" value={formatMakassarDateInput(model.filter.start)} onChange={(event) => onFilter("start", event.target.value)} /></label>
              <label><span className="sr-only">Tanggal akhir</span><input type="date" value={formatMakassarDateInput(model.filter.end, true)} onChange={(event) => onFilter("end", event.target.value)} /></label>
            </div>
          ) : null}
          <button type="button" onClick={onRefresh} disabled={refreshing} className="gad-refresh">
            <Icon name="refresh" size={16} /> {refreshing ? "Memuat…" : "Refresh"}
          </button>
          <div className="gad-actor" title={`${model.actor.displayName} · ${model.actor.roleLabel}`}>
            <span>{model.actor.displayName.slice(0, 1).toUpperCase()}</span>
            <div><strong>{model.actor.displayName}</strong><small>{model.actor.roleLabel}</small></div>
          </div>
        </div>
        <p className="gad-updated">Terakhir diperbarui: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(model.projectedAt))} WITA</p>
      </header>

      {model.issues.length ? (
        <section className="gad-issue" role="status">
          <Icon name="warning" size={18} />
          <p>Beberapa modul belum dapat dibaca: {[...new Set(model.issues.map((issue) => issue.module))].join(", ")}. Nilai lain tetap berasal dari data canonical yang tersedia.</p>
        </section>
      ) : null}

      <section className="gad-kpi-grid" aria-label="KPI utama">
        <KpiCard label="Nilai Pesanan" metric={model.kpis.orderValue} icon="bag" currency tone="#7760df" />
        <KpiCard label="Pembayaran Diterima" metric={model.kpis.paymentReceived} icon="wallet" currency tone="#34a853" />
        <KpiCard label="Sisa Pembayaran" metric={model.kpis.remainingPayment} icon="receipt" currency tone="#d49335" />
        <KpiCard label="Jumlah Pesanan" metric={model.kpis.orderCount} icon="orders" tone="#3478d4" />
        <KpiCard label="Rata-rata Pesanan" metric={model.kpis.averageOrder} icon="average" currency tone="#d25c4f" />
        <KpiCard label="Produk Terjual" metric={model.kpis.itemsSold} icon="box" tone="#7351cf" />
      </section>

      <section className="gad-overview-grid">
        <article className="gad-panel gad-queue-panel">
          <div className="gad-panel-heading"><h2>Antrian Tindakan</h2><Link href="/admin/order-tasks">Lihat Semua</Link></div>
          <div className="gad-queue-grid">
            {model.queues.map((queue) => (
              <div key={queue.key} className={`gad-queue gad-queue-${queue.tone}`}>
                <span className="gad-queue-icon">{queue.label.slice(0, 1)}</span>
                <div><p>{queue.label}</p><strong>{formatNumber(queue.count)}</strong>{queue.href ? <Link href={queue.href}>Lihat →</Link> : <small>Belum tersedia</small>}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="gad-panel gad-trend-panel">
          <div className="gad-panel-heading">
            <div><h2>Tren Penjualan & Pembayaran</h2><div className="gad-legend"><span className="gad-legend-order">Nilai Pesanan</span><span className="gad-legend-payment">Pembayaran Diterima</span></div></div>
          </div>
          <TrendChart points={model.trend} />
        </article>

        <article className="gad-panel gad-type-panel">
          <div className="gad-panel-heading"><h2>Pesanan Berdasarkan Jenis</h2></div>
          <div className="gad-donut-layout">
            <div className="gad-donut" style={{ background: totalTypes ? `conic-gradient(${donut})` : "#27303b" }}><span>{totalTypes}</span></div>
            <ul>
              {model.orderTypes.map((item) => (
                <li key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.count} ({totalTypes ? ((item.count / totalTypes) * 100).toFixed(1) : "0.0"}%)</strong></li>
              ))}
            </ul>
          </div>
          <p className="gad-panel-total">Total: <strong>{totalTypes} Pesanan</strong></p>
        </article>
      </section>

      <section className="gad-panel gad-store-panel">
        <div className="gad-panel-heading"><h2>Ringkasan Per Toko</h2></div>
        <div className="gad-store-grid">
          {model.storeSummaries.map((store) => (
            <article key={store.id ?? "unallocated"} className="gad-store-card">
              <div className="gad-store-title"><span className="gad-store-icon">▦</span><h3>{store.name}</h3><span className={store.active ? "gad-store-active" : "gad-store-inactive"}>{store.active ? "↗ Aktif" : "Tidak aktif"}</span></div>
              <dl>
                <div><dt>Penjualan</dt><dd>{formatMoney(store.orderValue)}</dd></div>
                <div><dt>Pesanan Aktif</dt><dd>{store.activeOrders}</dd></div>
                <div><dt>Produk Terjual</dt><dd>{store.itemsSold}</dd></div>
                <div><dt>Menunggu Pickup</dt><dd>{store.pickupWaiting}</dd></div>
                <div><dt>Stok Menipis</dt><dd title="Ambang stok rendah belum canonical">{store.lowStock ?? "—"}</dd></div>
                <div><dt>Stok Habis</dt><dd>{store.outOfStock}</dd></div>
                <div><dt>Pesanan Bermasalah</dt><dd>{store.problemOrders}</dd></div>
              </dl>
              {store.href ? <Link href={store.href}>{store.id ? "Lihat Detail Toko" : "Lihat Pesanan"} →</Link> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="gad-bottom-grid">
        <article className="gad-panel gad-orders-panel">
          <div className="gad-panel-heading"><h2>Pesanan Terbaru</h2><Link href="/admin/orders">Lihat Semua</Link></div>
          {model.latestOrders.length ? (
            <>
              <div className="gad-table-wrap">
                <table>
                  <thead><tr><th>No. Pesanan</th><th>Pelanggan</th><th>Toko</th><th>Jenis</th><th>Total</th><th>Dibayar</th><th>Pembayaran</th><th>Status</th><th>Waktu</th><th><span className="sr-only">Aksi</span></th></tr></thead>
                  <tbody>{model.latestOrders.map((order) => <tr key={order.id}><td><Link href={order.href}>{order.orderNumber}</Link></td><td>{order.customerName}</td><td>{order.storeName}</td><td>{order.typeLabel}</td><td>{formatMoney(order.total)}</td><td>{formatMoney(order.paid)}</td><td><span className="gad-status gad-status-payment">{formatStatus(order.paymentStatus)}</span></td><td><span className="gad-status">{formatStatus(order.orderStatus)}</span></td><td>{formatTime(order.createdAt)}</td><td><Link href={order.href} aria-label={`Lihat ${order.orderNumber}`}>◉</Link></td></tr>)}</tbody>
                </table>
              </div>
              <div className="gad-order-cards">{model.latestOrders.map((order) => <article key={order.id}><div><Link href={order.href}>{order.orderNumber}</Link><time>{formatTime(order.createdAt)}</time></div><strong>{order.customerName}</strong><p>{order.storeName} · {order.typeLabel}</p><div><span>{formatMoney(order.total)}</span><span className="gad-status">{formatStatus(order.orderStatus)}</span></div></article>)}</div>
            </>
          ) : <div className="gad-empty">Belum ada pesanan pada periode dan toko ini.</div>}
        </article>

        <article className="gad-panel gad-alert-panel">
          <div className="gad-panel-heading"><h2>Peringatan Stok & PIM</h2><Link href="/admin/products">Lihat Semua</Link></div>
          <div className="gad-alert-grid">
            {model.alerts.map((alert) => (
              <div key={alert.key} className={`gad-alert gad-alert-${alert.tone}`}>
                <Icon name="warning" size={17} />
                <div><p>{alert.label}</p>{alert.note ? <small>{alert.note}</small> : null}</div>
                {alert.href ? <Link href={alert.href} aria-label={`Buka ${alert.label}`}>{alert.count === null ? "—" : `${alert.count} item`}</Link> : <strong>{alert.count ?? "—"}</strong>}
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export function GlobalAdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [model, setModel] = useState<GlobalAdminDashboardReadModel | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(true);
  const queryString = searchParams.toString();

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const supabase = createSupabaseClient();
      if (!supabase) throw new Error("Layanan data belum tersedia.");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesi admin tidak tersedia.");
      const response = await fetch(`/api/admin/global-dashboard${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({})) as GlobalAdminDashboardReadModel & {
        error?: string | { message?: string };
        message?: string;
      };
      if (!response.ok) {
        const responseMessage = typeof payload.error === "string"
          ? payload.error
          : payload.error?.message || payload.message;
        throw new Error(responseMessage || "Dashboard Global gagal dimuat.");
      }
      setModel(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard Global gagal dimuat.");
    } finally {
      setRefreshing(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const onFilter = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "period" && value !== "custom") {
      next.delete("start");
      next.delete("end");
    }
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadingCards = useMemo(() => Array.from({ length: 6 }, (_, index) => <div key={index} className="gad-skeleton gad-skeleton-kpi" />), []);

  if (!model && refreshing) {
    return <main className="gad-root" aria-busy="true"><div className="gad-skeleton gad-skeleton-header" /><section className="gad-kpi-grid">{loadingCards}</section><div className="gad-skeleton gad-skeleton-panel" /></main>;
  }
  if (!model || error) {
    return (
      <main className="gad-root">
        <section className="gad-fatal" role="alert">
          <Icon name="warning" />
          <h1>Dashboard Global belum dapat dimuat</h1>
          <p>{error || "Data dashboard tidak tersedia."}</p>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Coba Lagi</button>
        </section>
      </main>
    );
  }
  return <DashboardContent model={model} refreshing={refreshing} onRefresh={() => setRefreshKey((key) => key + 1)} onFilter={onFilter} />;
}

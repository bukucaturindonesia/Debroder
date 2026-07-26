export const GLOBAL_DASHBOARD_PERIODS = ["today", "7d", "30d", "custom"] as const;

export type GlobalDashboardPeriod = (typeof GLOBAL_DASHBOARD_PERIODS)[number];

export type GlobalDashboardFilter = {
  period: GlobalDashboardPeriod;
  start: string;
  end: string;
  storeId: string | null;
};

export type DashboardMetric = {
  value: number | null;
  visible: boolean;
  changePercent: number | null;
  comparisonLabel: string;
};

export type DashboardQueueItem = {
  key: string;
  label: string;
  count: number;
  href: string | null;
  tone: "blue" | "green" | "amber" | "red" | "violet";
};

export type DashboardTrendPoint = {
  key: string;
  label: string;
  orderValue: number;
  paymentValue: number;
};

export type DashboardOrderType = {
  key: "ready_stock" | "instant_custom" | "configured_product" | "custom_project" | "legacy_unsupported";
  label: string;
  count: number;
  color: string;
};

export type DashboardStoreSummary = {
  id: string | null;
  name: string;
  active: boolean;
  orderValue: number;
  activeOrders: number;
  itemsSold: number;
  pickupWaiting: number;
  lowStock: number | null;
  outOfStock: number;
  problemOrders: number;
  href: string | null;
};

export type DashboardLatestOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  storeName: string;
  typeLabel: string;
  total: number | null;
  paid: number | null;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  href: string;
};

export type DashboardAlert = {
  key: string;
  label: string;
  count: number | null;
  note: string | null;
  href: string | null;
  tone: "warning" | "danger";
};

export type DashboardModuleIssue = {
  module: "orders" | "payments" | "operations" | "inventory" | "stores";
  message: string;
};

export type GlobalAdminDashboardReadModel = {
  projectedAt: string;
  actor: {
    displayName: string;
    roleLabel: string;
  };
  filter: GlobalDashboardFilter;
  availableStores: Array<{ id: string; name: string; active: boolean }>;
  kpis: {
    orderValue: DashboardMetric;
    paymentReceived: DashboardMetric;
    remainingPayment: DashboardMetric;
    orderCount: DashboardMetric;
    averageOrder: DashboardMetric;
    itemsSold: DashboardMetric;
  };
  queues: DashboardQueueItem[];
  trend: DashboardTrendPoint[];
  orderTypes: DashboardOrderType[];
  storeSummaries: DashboardStoreSummary[];
  latestOrders: DashboardLatestOrder[];
  alerts: DashboardAlert[];
  issues: DashboardModuleIssue[];
};


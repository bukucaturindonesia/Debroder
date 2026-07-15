export type AdminViewerResourceSpec = {
  label: string;
  table: string;
  columns: readonly string[];
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
};

export type AdminViewerPanelSpec = {
  eyebrow: string;
  title: string;
  description: string;
  resources: readonly AdminViewerResourceSpec[];
};

const PRODUCT_COLUMNS = ["id", "nama", "name", "slug", "status", "base_price", "product_type", "pricing_mode", "has_variants", "updated_at"] as const;
const ORDER_COLUMNS = ["id", "order_number", "customer_name", "customer_phone", "customer_email", "status", "payment_status", "total_amount", "fulfillment_method", "created_at", "updated_at"] as const;
const QUOTATION_COLUMNS = ["id", "quotation_number", "customer_name", "customer_phone", "customer_email", "status", "total_amount", "created_at", "updated_at"] as const;

const panels = {
  pimV2: {
    eyebrow: "KATALOG",
    title: "PIM V2 — Dependency Produk",
    description: "Struktur color variant, ukuran, sellable SKU, harga, stok, dan galeri per warna. Seluruh data ditampilkan tanpa kontrol perubahan.",
    resources: [
      { label: "Product root", table: "products", columns: PRODUCT_COLUMNS, orderBy: "updated_at" },
      { label: "Color variant", table: "product_variants", columns: ["id", "product_id", "name", "variant_name", "color_name", "slug", "sku", "status", "is_active", "price_adjustment", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Sellable SKU", table: "product_variant_sizes", columns: ["id", "variant_id", "size_id", "size_name", "sku", "stock_quantity", "stock", "status", "is_active", "price_adjustment", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Variant image", table: "product_variant_images", columns: ["id", "variant_id", "image_role", "alt_text", "target_ratio", "is_cover", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Master warna", table: "product_color_master", columns: ["id", "name", "slug", "color_hex", "color_group", "is_active", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Master ukuran", table: "product_size_master", columns: ["id", "name", "slug", "size_group", "is_active", "sort_order"], orderBy: "sort_order", ascending: true }
    ]
  },
  maintenance: {
    eyebrow: "MAINTENANCE",
    title: "Maintenance PIM",
    description: "Blueprint kategori, model, layanan, dan master data ditampilkan sebagai referensi read-only. Utility penerapan dan normalisasi dinonaktifkan.",
    resources: [
      { label: "Kategori produk", table: "product_categories", columns: ["id", "name", "slug", "description", "status", "is_active", "category_kind", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Subkategori", table: "product_subcategories", columns: ["id", "category_id", "name", "slug", "description", "is_active", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Model layanan", table: "service_categories", columns: ["id", "name", "slug", "category_key", "status_aktif", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Layanan", table: "services", columns: ["id", "name", "slug", "description", "status_aktif", "sort_order"], orderBy: "sort_order", ascending: true }
    ]
  },
  cms: {
    eyebrow: "WEBSITE",
    title: "CMS & Tampilan Website",
    description: "Konten landing page, banner, hero, dan penempatan produk dapat ditinjau tanpa form editorial atau aksi publish.",
    resources: [
      { label: "Section landing", table: "homepage_sections", columns: ["id", "name", "slug", "status", "is_active", "sort_order", "publish_at", "updated_at"], orderBy: "sort_order", ascending: true },
      { label: "Item section", table: "homepage_section_items", columns: ["id", "section_id", "product_id", "service_id", "status", "is_active", "sort_order", "updated_at"], orderBy: "sort_order", ascending: true },
      { label: "Landing sections", table: "landing_sections", columns: ["id", "name", "slug", "status", "is_active", "sort_order", "updated_at"], orderBy: "sort_order", ascending: true },
      { label: "CMS banner", table: "cms_banners", columns: ["id", "experience_key", "title", "subtitle", "status", "is_active", "sort_order", "updated_at"], orderBy: "sort_order", ascending: true }
    ]
  },
  media: {
    eyebrow: "MEDIA",
    title: "Media Library",
    description: "Metadata aset publik dapat dilihat. Upload, replace, delete, private file, dan signed URL tidak tersedia.",
    resources: [
      { label: "Aset media publik", table: "media_assets", columns: ["id", "name", "media_type", "mime_type", "width", "height", "status_aktif", "created_at", "updated_at"], orderBy: "created_at" }
    ]
  },
  catalog: {
    eyebrow: "KATALOG",
    title: "Kategori & Master Data",
    description: "Kategori, subkategori, layanan produksi, dan cabang ditampilkan sebagai referensi read-only.",
    resources: [
      { label: "Kategori", table: "product_categories", columns: ["id", "name", "slug", "description", "status", "is_active", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Subkategori", table: "product_subcategories", columns: ["id", "category_id", "name", "slug", "description", "is_active", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Layanan produksi", table: "production_services", columns: ["id", "name", "slug", "description", "base_price", "unit_label", "is_active", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Layanan publik", table: "services", columns: ["id", "name", "slug", "description", "status_aktif", "sort_order"], orderBy: "sort_order", ascending: true }
    ]
  },
  orders: {
    eyebrow: "ORDER",
    title: "Order & Status Pelanggan",
    description: "Order dan item dapat ditinjau dengan kontak pelanggan termasking. Cancellation, status transition, archive, dan permanent delete tidak tersedia.",
    resources: [
      { label: "Pesanan", table: "orders", columns: ORDER_COLUMNS, orderBy: "created_at" },
      { label: "Item pesanan", table: "order_items", columns: ["id", "order_id", "product_id", "variant_size_id", "product_name", "variant_name", "size_name", "sku", "quantity", "unit_price", "subtotal", "status", "created_at"], orderBy: "created_at" },
      { label: "Riwayat status", table: "order_status_history", columns: ["id", "order_id", "from_status", "to_status", "reason", "actor_role", "created_at"], orderBy: "created_at" }
    ]
  },
  payments: {
    eyebrow: "PAYMENT",
    title: "Pembayaran",
    description: "Nominal dan status pembayaran dapat dilihat. Bukti pembayaran, private path, verification, adjustment, dan refund disembunyikan atau dinonaktifkan.",
    resources: [
      { label: "Pembayaran", table: "order_payments", columns: ["id", "payment_number", "order_id", "amount", "paid_at", "method", "channel_name", "status", "submitted_at", "verified_at", "rejection_reason", "created_at"], orderBy: "created_at" },
      { label: "Pesanan", table: "orders", columns: ORDER_COLUMNS, orderBy: "created_at" }
    ]
  },
  quotations: {
    eyebrow: "QUOTATION",
    title: "Quotation",
    description: "Draft, versi, item, nilai, dan status quotation ditampilkan read-only dengan data kontak termasking.",
    resources: [
      { label: "Quotation", table: "quotations", columns: QUOTATION_COLUMNS, orderBy: "created_at" },
      { label: "Quotation draft", table: "quotation_drafts", columns: ["id", "quotation_number", "customer_name", "customer_phone", "customer_email", "status", "total_amount", "created_at", "updated_at"], orderBy: "created_at" },
      { label: "Item quotation", table: "quotation_items", columns: ["id", "quotation_id", "product_name", "variant_name", "size_name", "sku", "quantity", "unit_price", "subtotal", "status", "created_at"], orderBy: "created_at" }
    ]
  },
  production: {
    eyebrow: "PRODUKSI",
    title: "Produksi & Work Item",
    description: "Job Order, Work Item, assignment, dan status produksi dapat ditinjau tanpa perubahan status atau penugasan.",
    resources: [
      { label: "Job Order", table: "job_orders", columns: ["id", "job_order_number", "order_id", "status", "priority", "planned_start_at", "planned_finish_at", "actual_start_at", "actual_finish_at", "created_at", "updated_at"], orderBy: "created_at" },
      { label: "Work Item", table: "work_items", columns: ["id", "work_item_number", "job_order_id", "title", "department", "status", "priority", "assigned_to", "planned_start_at", "planned_finish_at", "updated_at"], orderBy: "updated_at" },
      { label: "Riwayat Work Item", table: "work_item_status_history", columns: ["id", "work_item_id", "from_status", "to_status", "reason", "actor_role", "created_at"], orderBy: "created_at" }
    ]
  },
  qc: {
    eyebrow: "QUALITY CONTROL",
    title: "Quality Control",
    description: "Checklist dan status QC dapat dilihat. Bukti privat, signed URL, upload, rework, approval, dan delete tidak tersedia.",
    resources: [
      { label: "QC Record", table: "qc_records", columns: ["id", "qc_number", "work_item_id", "job_order_id", "status", "result", "inspected_at", "created_at", "updated_at"], orderBy: "created_at" },
      { label: "Checklist", table: "qc_checklist_results", columns: ["id", "qc_record_id", "check_key", "label", "result", "sort_order"], orderBy: "sort_order", ascending: true },
      { label: "Riwayat QC", table: "qc_status_history", columns: ["id", "qc_record_id", "from_status", "to_status", "reason", "actor_role", "created_at"], orderBy: "created_at" }
    ]
  },
  fulfillment: {
    eyebrow: "FULFILLMENT",
    title: "Pengiriman & Pickup",
    description: "Status fulfillment dan item dapat dilihat. Alamat dimasking; bukti privat, resi mutation, status transition, dan upload dinonaktifkan.",
    resources: [
      { label: "Fulfillment", table: "fulfillments", columns: ["id", "fulfillment_number", "order_id", "method", "status", "recipient_name", "recipient_phone", "delivery_address", "carrier_name", "scheduled_at", "completed_at", "created_at"], orderBy: "created_at" },
      { label: "Item fulfillment", table: "fulfillment_items", columns: ["id", "fulfillment_id", "order_item_id", "quantity", "status", "created_at"], orderBy: "created_at" },
      { label: "Riwayat fulfillment", table: "fulfillment_status_history", columns: ["id", "fulfillment_id", "from_status", "to_status", "reason", "actor_role", "created_at"], orderBy: "created_at" }
    ]
  },
  notifications: {
    eyebrow: "NOTIFIKASI",
    title: "Notifikasi",
    description: "Status dan kanal notifikasi dapat dilihat. Payload sensitif, delivery token, template mutation, archive, dan delete tidak tersedia.",
    resources: [
      { label: "Notifikasi", table: "notifications", columns: ["id", "title", "channel", "status", "entity_type", "entity_id", "created_at", "read_at", "archived_at"], orderBy: "created_at" },
      { label: "Template", table: "notification_templates", columns: ["id", "name", "slug", "channel", "status", "is_active", "updated_at"], orderBy: "updated_at" },
      { label: "Delivery", table: "notification_deliveries", columns: ["id", "notification_id", "channel", "status", "attempt_count", "sent_at", "delivered_at", "created_at"], orderBy: "created_at" }
    ]
  },
  access: {
    eyebrow: "ACCESS CONTROL",
    title: "Role & Permission",
    description: "Akun, role, dan matriks permission dapat ditinjau. Email dimasking; authentication metadata dan seluruh perubahan role/permission dinonaktifkan.",
    resources: [
      { label: "Profil Admin", table: "profiles", columns: ["id", "email", "role", "created_at", "updated_at"], orderBy: "created_at" },
      { label: "Permission definition", table: "permission_definitions", columns: ["permission_key", "module", "label", "description"], orderBy: "module", ascending: true },
      { label: "Role permission", table: "role_permissions", columns: ["role", "permission_key", "granted", "updated_at"], orderBy: "role", ascending: true }
    ]
  },
  audit: {
    eyebrow: "AUDIT",
    title: "Audit Sistem",
    description: "Entity, aksi, actor role, sumber, alasan, dan waktu dapat dilihat. Snapshot before/after, metadata autentikasi, token, dan request detail tidak dikirim.",
    resources: [
      { label: "System audit", table: "system_audit_log", columns: ["id", "entity_type", "entity_id", "action", "actor_role", "source", "reason", "created_at"], orderBy: "created_at" }
    ]
  },
  settings: {
    eyebrow: "SETTINGS",
    title: "Settings & Konfigurasi",
    description: "Nama konfigurasi dan status dapat dilihat. Value yang berpotensi menyimpan credential, secret, token, atau konfigurasi privat tidak dikirim.",
    resources: [
      { label: "Website settings", table: "website_settings", columns: ["id", "setting_key", "label", "description", "is_active", "updated_at"], orderBy: "setting_key", ascending: true },
      { label: "Penomoran dokumen", table: "document_number_rules", columns: ["id", "document_type", "prefix", "format_pattern", "reset_period", "is_active", "updated_at"], orderBy: "document_type", ascending: true }
    ]
  },
  reports: {
    eyebrow: "LAPORAN",
    title: "Laporan Operasional",
    description: "Ringkasan order, pembayaran, produksi, QC, dan fulfillment ditampilkan sebagai tabel read-only tanpa export atau perubahan data.",
    resources: [
      { label: "Order", table: "orders", columns: ORDER_COLUMNS, orderBy: "created_at" },
      { label: "Pembayaran", table: "order_payments", columns: ["id", "payment_number", "order_id", "amount", "method", "status", "submitted_at", "verified_at", "created_at"], orderBy: "created_at" },
      { label: "Job Order", table: "job_orders", columns: ["id", "job_order_number", "order_id", "status", "priority", "created_at", "updated_at"], orderBy: "created_at" },
      { label: "QC", table: "qc_records", columns: ["id", "qc_number", "job_order_id", "status", "result", "created_at"], orderBy: "created_at" },
      { label: "Fulfillment", table: "fulfillments", columns: ["id", "fulfillment_number", "order_id", "method", "status", "created_at"], orderBy: "created_at" }
    ]
  }
} satisfies Record<string, AdminViewerPanelSpec>;

export function getAdminViewerPanel(pathname: string): AdminViewerPanelSpec {
  if (pathname.startsWith("/admin/pim-v2")) return panels.pimV2;
  if (pathname.startsWith("/admin/pim-manager")) return panels.maintenance;
  if (pathname.startsWith("/admin/access-control")) return panels.access;
  if (pathname.startsWith("/admin/audit-log")) return panels.audit;
  if (pathname.startsWith("/admin/payments")) return panels.payments;
  if (pathname.startsWith("/admin/reports")) return panels.reports;
  if (pathname.startsWith("/admin/orders/quotations") || pathname.startsWith("/admin/quotations") || pathname.startsWith("/admin/repeat-orders")) return panels.quotations;
  if (pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/order")) return panels.orders;
  if (pathname.startsWith("/admin/job-orders") || pathname.startsWith("/admin/work-items") || pathname.startsWith("/admin/production")) return panels.production;
  if (pathname.startsWith("/admin/quality-control")) return panels.qc;
  if (pathname.startsWith("/admin/fulfillments")) return panels.fulfillment;
  if (pathname.startsWith("/admin/notifications")) return panels.notifications;
  if (pathname.startsWith("/admin/media") || pathname.startsWith("/admin/site-media")) return panels.media;
  if (pathname.startsWith("/admin/website-settings") || pathname.startsWith("/admin/document-numbering")) return panels.settings;
  if (pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/services") || pathname.startsWith("/admin/store") || pathname.startsWith("/admin/product-filters")) return panels.catalog;
  if (/^\/admin\/(homepage-sections|commerce\/jersey|page-hero|hero|banner|campaign-banners|featured-products|fresh-drop|shop-category|plain-category|trending|trust-about|contact-footer)/.test(pathname)) return panels.cms;
  return panels.reports;
}

export function isAdminGuestFullViewerPath(pathname: string) {
  return pathname.startsWith("/admin")
    && !pathname.startsWith("/admin/login")
    && pathname !== "/admin"
    && pathname !== "/admin/dashboard"
    && pathname !== "/admin/products";
}

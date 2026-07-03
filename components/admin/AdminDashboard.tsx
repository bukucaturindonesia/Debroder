"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MediaLibraryPanel } from "@/components/admin/MediaLibrary";
import { ProductAdminPanel } from "@/components/admin/ProductAdmin";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { HomepageSectionsAdmin } from "@/components/admin/HomepageSectionsAdmin";
import {
  createSupabaseClient,
  isSupabaseConfigured,
  WEBSITE_IMAGES_BUCKET
} from "@/lib/supabase";
import { formatRupiah } from "@/lib/url";

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "list"
  | "select"
  | "range"
  | "image"
  | "video";
type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  nullable?: boolean;
  options?: string[];
  helper?: string;
  min?: number;
  max?: number;
  step?: number;
};
type TableConfig = {
  key: string;
  label: string;
  navLabel: string;
  href: string;
  table: string;
  description: string;
  orderField?: string;
  fields: FieldConfig[];
};
type AdminValue = string | number | boolean | string[] | null | undefined;
type AdminRow = Record<string, AdminValue> & { id?: string };
type MediaChoice = { id: string; name: string; public_url: string; media_type: "image" | "video" };
type OverviewStats = {
  products: number;
  productsInactive: number;
  categories: number;
  services: number;
  media: number;
  stores: number;
  heroes: number;
  banners: number;
  pageHeroes: number;
};

const objectPositionOptions = [
  "center center",
  "center top",
  "center bottom",
  "left center",
  "right center",
  "left top",
  "left bottom",
  "right top",
  "right bottom"
];

const imageGuides = [
  ["Landing Hero Desktop", "1920 x 900", "32:15", "Hero utama homepage"],
  ["Landing Hero Mobile", "1080 x 1350", "4:5", "Hero utama homepage mobile"],
  ["Hero Sablon Desktop", "1920 x 800", "12:5", "Halaman Sablon DTF"],
  ["Hero Sablon Mobile", "1080 x 1350", "4:5", "Halaman Sablon DTF mobile"],
  ["Hero Jersey Desktop", "1920 x 800", "12:5", "Halaman Custom Jersey"],
  ["Hero Jersey Mobile", "1080 x 1350", "4:5", "Halaman Custom Jersey mobile"],
  ["Hero Maklon Desktop", "1920 x 800", "12:5", "Halaman Maklon DTF"],
  ["Hero Maklon Mobile", "1080 x 1350", "4:5", "Halaman Maklon DTF mobile"],
  ["Hero Cetak Sublim Desktop", "1920 x 800", "12:5", "Halaman Cetak Sublim"],
  ["Hero Cetak Sublim Mobile", "1080 x 1350", "4:5", "Halaman Cetak Sublim mobile"],
  ["Hero Kaos Polos Desktop", "1920 x 800", "12:5", "Halaman Kaos Polos"],
  ["Hero Kaos Polos Mobile", "1080 x 1350", "4:5", "Halaman Kaos Polos mobile"],
  ["Banner Instagram Desktop", "1920 x 800", "12:5", "Banner Instagram homepage"],
  ["Banner Instagram Mobile", "1080 x 1350", "4:5", "Banner Instagram mobile"],
  ["Benefit Images", "1200 x 900", "4:3", "Carousel keunggulan"],
  ["Product Images", "1200 x 1500", "4:5", "Katalog produk"],
  ["Store Images", "1200 x 800", "3:2", "Kartu store"],
  ["Logo SVG", "Vector", "Original", "Navbar, footer, admin"],
  ["Logo PNG", "2048 px sisi panjang", "Original", "Fallback logo transparan"],
  ["Favicon", "512 x 512", "1:1", "Browser icon"],
  ["Apple Touch Icon", "180 x 180", "1:1", "Icon iOS"]
];

const preferredProductCategories = [
  { label: "Semua", slug: "all" },
  { label: "Kaos Polos", slug: "kaos-polos" },
  { label: "Sablon Kaos", slug: "sablon-kaos" },
  { label: "Custom Jersey", slug: "custom-jersey" },
  { label: "Maklon DTF", slug: "maklon-dtf" },
  { label: "Cetak Sublim", slug: "cetak-sublim" },
  { label: "Kaos Cotton Combed", slug: "kaos-cotton-combed" }
];

const tableConfigs: TableConfig[] = [
  {
    key: "overview",
    label: "Dashboard",
    navLabel: "Dashboard",
    href: "/admin/dashboard",
    table: "",
    description: "Ringkasan konten toko online DE BRODER.",
    fields: []
  },
  {
    key: "homepage-sections",
    label: "Homepage Sections",
    navLabel: "Homepage Sections",
    href: "/admin/homepage-sections",
    table: "",
    description: "Atur judul, status, urutan section, dan penempatan Produk & Layanan di landing page.",
    fields: []
  },
  {
    key: "hero",
    label: "Hero Homepage",
    navLabel: "Hero Homepage",
    href: "/admin/hero",
    table: "hero_banners",
    description: "Atur banner utama, gambar, video, CTA, dan urutan slide.",
    orderField: "urutan",
    fields: [
      {
        name: "headline",
        label: "Judul highlight baris 1",
        type: "text",
        placeholder: "KAOS POLOS NEW STATE APPAREL",
        required: true
      },
      {
        name: "subheadline",
        label: "Subteks highlight baris 2",
        type: "textarea",
        placeholder: "Sablon DTF, Jersey, dan Custom Apparel",
        required: true
      },
      {
        name: "cta_primary_text",
        label: "Teks tombol CTA",
        type: "text",
        placeholder: "Beli Sekarang"
      },
      {
        name: "cta_primary_link",
        label: "Link CTA",
        type: "text",
        placeholder: "/koleksi"
      },
      {
        name: "image_url",
        label: "Upload Hero Desktop",
        type: "image",
        placeholder: "/images/debroder/hero/hero-home.jpg",
        helper: "Rekomendasi 1920x900."
      },
      {
        name: "mobile_image_url",
        label: "Upload Hero Mobile",
        type: "image",
        placeholder: "/images/debroder/hero/hero-home-mobile.jpg",
        helper: "Rekomendasi 1080x1350."
      },
      {
        name: "image_alt",
        label: "Teks alternatif gambar",
        type: "text",
        placeholder: "Hero utama DE BRODER"
      },
      {
        name: "hero_video_url",
        label: "Video hero desktop (kompatibilitas)",
        type: "video",
        placeholder: "https://..."
      },
      {
        name: "desktop_video_url",
        label: "Video hero desktop",
        type: "video",
        placeholder: "https://..."
      },
      {
        name: "mobile_video_url",
        label: "Video hero mobile",
        type: "video",
        placeholder: "https://..."
      },
      {
        name: "object_position",
        label: "Desktop Object Position",
        type: "select",
        options: objectPositionOptions
      },
      {
        name: "mobile_object_position",
        label: "Mobile Object Position",
        type: "select",
        options: objectPositionOptions
      },
      { name: "object_fit", label: "Skala gambar", type: "select", options: ["cover", "contain"] },
      { name: "focal_x", label: "Fokus horizontal (X)", type: "range", min: 0, max: 100, step: 1 },
      { name: "focal_y", label: "Fokus vertikal (Y)", type: "range", min: 0, max: 100, step: 1 },
      { name: "urutan", label: "Urutan slide", type: "number" },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "products",
    label: "Produk & Layanan",
    navLabel: "Produk & Layanan",
    href: "/admin/products",
    table: "products",
    description: "Kelola katalog produk, detail singkat, harga, dan gambar.",
    orderField: "urutan",
    fields: [
      {
        name: "nama",
        label: "Nama produk",
        type: "text",
        placeholder: "Kaos Polos Cotton Combed",
        required: true
      },
      {
        name: "short_detail",
        label: "Detail singkat",
        type: "textarea",
        placeholder: "Kaos polos import dan cotton combed"
      },
      {
        name: "deskripsi",
        label: "Deskripsi lengkap",
        type: "textarea",
        placeholder: "Detail produk atau layanan"
      },
      {
        name: "price",
        label: "Harga (angka)",
        type: "number",
        placeholder: "45000",
        nullable: true
      },
      {
        name: "kategori",
        label: "Kategori",
        type: "text",
        placeholder: "Kaos Polos"
      },
      {
        name: "slug",
        label: "Slug produk",
        type: "text",
        placeholder: "kaos-polos-cotton-combed"
      },
      {
        name: "image_url",
        label: "Gambar produk",
        type: "image",
        placeholder: "/images/debroder/products/kaos-polos.jpg",
        helper: "Rekomendasi 1200x1200."
      },
      {
        name: "image_alt",
        label: "Teks alternatif gambar",
        type: "text",
        placeholder: "Nama produk"
      },
      { name: "collection_tags", label: "Koleksi (satu per baris)", type: "list", placeholder: "best-seller\nnew-arrival" },
      { name: "color_tags", label: "Warna (slug, satu per baris)", type: "list", placeholder: "hitam\nputih" },
      { name: "size_tags", label: "Ukuran (satu per baris)", type: "list", placeholder: "s\nm\nl\nxl" },
      { name: "material_tags", label: "Bahan (slug, satu per baris)", type: "list", placeholder: "cotton-combed-24s" },
      { name: "brand", label: "Brand", type: "text", placeholder: "NSA" },
      { name: "object_fit", label: "Skala gambar", type: "select", options: ["cover", "contain"] },
      { name: "object_position", label: "Posisi gambar", type: "select", options: objectPositionOptions },
      {
        name: "link_url",
        label: "Link tujuan",
        type: "text",
        placeholder: "/kaos-polos"
      },
      {
        name: "whatsapp_link",
        label: "Link WhatsApp",
        type: "text",
        placeholder: "https://wa.me/6285355333364"
      },
      { name: "urutan", label: "Urutan tampil", type: "number" },
      { name: "featured", label: "Produk unggulan", type: "boolean" },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "product-filters",
    label: "Filter Kaos Polos",
    navLabel: "Filter Kaos Polos",
    href: "/admin/product-filters",
    table: "product_filters",
    description: "Kelola koleksi, warna, ukuran, bahan, brand, harga, dan urutan filter.",
    orderField: "urutan",
    fields: [
      { name: "filter_type", label: "Jenis filter", type: "select", options: ["collection", "color", "size", "material", "brand", "price"], required: true },
      { name: "name", label: "Nama pilihan", type: "text", placeholder: "Best Seller", required: true },
      { name: "slug", label: "Slug", type: "text", placeholder: "best-seller" },
      { name: "color_hex", label: "Kode warna", type: "text", placeholder: "#111111" },
      { name: "min_price", label: "Harga minimum", type: "number", nullable: true, placeholder: "0" },
      { name: "max_price", label: "Harga maksimum", type: "number", nullable: true, placeholder: "50000" },
      { name: "urutan", label: "Urutan", type: "number" },
      { name: "status_aktif", label: "Tampil", type: "boolean" }
    ]
  },
  {
    key: "categories",
    label: "Kategori Produk",
    navLabel: "Kategori Produk",
    href: "/admin/categories",
    table: "service_categories",
    description: "Atur kategori layanan dan halaman tujuannya.",
    orderField: "urutan",
    fields: [
      {
        name: "nama_kategori",
        label: "Nama kategori",
        type: "text",
        placeholder: "Kaos Polos",
        required: true
      },
      {
        name: "deskripsi",
        label: "Detail singkat",
        type: "textarea",
        placeholder: "Kaos polos import dan cotton combed"
      },
      {
        name: "gambar_url",
        label: "Gambar kategori",
        type: "image",
        placeholder: "/images/debroder/products/kaos-polos.jpg"
      },
      {
        name: "image_alt",
        label: "Teks alternatif gambar",
        type: "text",
        placeholder: "Nama kategori"
      },
      {
        name: "link_slug",
        label: "Link halaman",
        type: "text",
        placeholder: "kaos-polos"
      },
      { name: "category_key", label: "Kunci kategori", type: "text", placeholder: "jersey" },
      { name: "slug", label: "Slug detail", type: "text", placeholder: "jersey-futsal" },
      { name: "gallery_urls", label: "Galeri gambar (satu URL per baris)", type: "list" },
      { name: "color_options", label: "Pilihan warna (satu per baris)", type: "list" },
      { name: "collar_options", label: "Pilihan kerah (satu per baris)", type: "list" },
      { name: "sleeve_options", label: "Pilihan lengan (satu per baris)", type: "list" },
      { name: "material_options", label: "Pilihan bahan (satu per baris)", type: "list" },
      { name: "size_chart", label: "Size chart (satu ukuran per baris)", type: "list", placeholder: "S: Lebar 48 cm / Panjang 68 cm" },
      { name: "faq_items", label: "FAQ (satu tanya-jawab per baris)", type: "list" },
      { name: "object_fit", label: "Skala gambar", type: "select", options: ["cover", "contain"] },
      { name: "object_position", label: "Posisi gambar", type: "select", options: objectPositionOptions },
      { name: "seo_title", label: "SEO title", type: "text", placeholder: "Judul kategori untuk mesin pencari" },
      { name: "seo_description", label: "SEO description", type: "textarea", placeholder: "Ringkasan kategori untuk hasil pencarian" },
      { name: "og_image_url", label: "Open Graph image", type: "image", placeholder: "Pilih dari Media Library" },
      { name: "canonical_url", label: "Canonical URL", type: "text", placeholder: "/jersey" },
      { name: "urutan", label: "Urutan tampil", type: "number" },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "services",
    label: "Layanan",
    navLabel: "Layanan",
    href: "/admin/services",
    table: "services",
    description: "Kelola kartu pada bagian Layanan & Produk DEBRODER.",
    orderField: "urutan",
    fields: [
      { name: "nama", label: "Nama layanan", type: "text", placeholder: "Sablon DTF", required: true },
      { name: "slug", label: "Slug halaman", type: "text", placeholder: "sablon-dtf", required: true },
      { name: "category_key", label: "Kunci kategori", type: "text", placeholder: "sablon-dtf" },
      { name: "deskripsi", label: "Deskripsi singkat", type: "textarea", placeholder: "Hasil tajam untuk brand dan komunitas." },
      { name: "detail_body", label: "Detail layanan", type: "textarea", placeholder: "Penjelasan lengkap layanan, bahan, dan hasil." },
      { name: "available_sizes", label: "Pilihan ukuran (satu per baris)", type: "list", placeholder: "A4\nA3\nLebar 58 cm" },
      { name: "faq_items", label: "FAQ (satu tanya-jawab per baris)", type: "list" },
      { name: "production_estimate", label: "Estimasi produksi", type: "text", placeholder: "1-3 hari kerja" },
      { name: "harga_mulai", label: "Harga mulai", type: "number", nullable: true, placeholder: "5000" },
      { name: "image_url", label: "Foto layanan", type: "image", helper: "Rekomendasi 1200x1500 (4:5)." },
      { name: "image_alt", label: "Teks alternatif gambar", type: "text", placeholder: "Nama layanan" },
      { name: "object_fit", label: "Skala gambar", type: "select", options: ["cover", "contain"] },
      { name: "object_position", label: "Posisi gambar", type: "select", options: objectPositionOptions },
      { name: "urutan", label: "Urutan tampil", type: "number" },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "banner",
    label: "Banner Instagram",
    navLabel: "Banner Instagram",
    href: "/admin/banner",
    table: "instagram_banners",
    description: "Atur banner besar yang mengarah ke Instagram.",
    fields: [
      {
        name: "title",
        label: "Judul internal",
        type: "text",
        placeholder: "Instagram DE BRODER",
        required: true
      },
      {
        name: "image_url",
        label: "Upload Banner Desktop",
        type: "image",
        placeholder: "/images/debroder/banners/instagram-banner.jpg",
        helper: "Rekomendasi 1920x800."
      },
      {
        name: "mobile_image_url",
        label: "Upload Banner Mobile",
        type: "image",
        placeholder: "/images/debroder/banners/instagram-banner-mobile.jpg",
        helper: "Rekomendasi 1080x1350."
      },
      {
        name: "image_alt",
        label: "Teks alternatif gambar",
        type: "text",
        placeholder: "Banner Instagram DE BRODER"
      },
      {
        name: "link_url",
        label: "Link Instagram",
        type: "text",
        placeholder: "https://instagram.com/de_broder"
      },
      {
        name: "object_position",
        label: "Desktop Object Position",
        type: "select",
        options: objectPositionOptions
      },
      {
        name: "mobile_object_position",
        label: "Mobile Object Position",
        type: "select",
        options: objectPositionOptions
      },
      { name: "object_fit", label: "Skala gambar", type: "select", options: ["cover", "contain"] },
      { name: "focal_x", label: "Fokus horizontal (X)", type: "range", min: 0, max: 100, step: 1 },
      { name: "focal_y", label: "Fokus vertikal (Y)", type: "range", min: 0, max: 100, step: 1 },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "page-hero",
    label: "Page Hero",
    navLabel: "Page Hero",
    href: "/admin/page-hero",
    table: "page_heroes",
    description: "Hero pendek untuk halaman Koleksi, Kaos Polos, Sablon DTF, Jersey, Store, dan Cara Order.",
    orderField: "page_key",
    fields: [
      {
        name: "page_key",
        label: "Halaman",
        type: "select",
        options: [
          "koleksi",
          "kaos-polos",
          "sablon-dtf",
          "maklon-dtf",
          "jersey",
          "cetak-sublim",
          "store",
          "cara-order"
        ],
        required: true
      },
      {
        name: "label",
        label: "Label",
        type: "text",
        placeholder: "KOLEKSI",
        required: true
      },
      {
        name: "title",
        label: "Judul",
        type: "text",
        placeholder: "Layanan & Produk DE BRODER",
        required: true
      },
      {
        name: "subtitle",
        label: "Subtitle",
        type: "textarea",
        placeholder: "Temukan kebutuhan apparel dalam satu tempat."
      },
      {
        name: "image_url",
        label: "Upload Hero Desktop",
        type: "image",
        placeholder: "/images/debroder/page-heroes/hero-1.jpg",
        helper: "Rekomendasi 1920x800."
      },
      {
        name: "mobile_image_url",
        label: "Upload Hero Mobile",
        type: "image",
        placeholder: "/images/debroder/page-heroes/hero-1-mobile.jpg",
        helper: "Rekomendasi 1080x1350."
      },
      {
        name: "image_alt",
        label: "Teks alternatif gambar",
        type: "text",
        placeholder: "Judul halaman"
      },
      {
        name: "object_position",
        label: "Desktop Object Position",
        type: "select",
        options: objectPositionOptions
      },
      {
        name: "mobile_object_position",
        label: "Mobile Object Position",
        type: "select",
        options: objectPositionOptions
      },
      { name: "object_fit", label: "Skala gambar", type: "select", options: ["cover", "contain"] },
      { name: "focal_x", label: "Fokus horizontal (X)", type: "range", min: 0, max: 100, step: 1 },
      { name: "focal_y", label: "Fokus vertikal (Y)", type: "range", min: 0, max: 100, step: 1 },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "store",
    label: "Store / Cabang",
    navLabel: "Store / Cabang",
    href: "/admin/store",
    table: "stores",
    description: "Kelola store, alamat, WhatsApp, Maps, dan foto store.",
    orderField: "urutan",
    fields: [
      {
        name: "nama_store",
        label: "Nama store",
        type: "text",
        placeholder: "STORE PETTARANI",
        required: true
      },
      {
        name: "layanan_utama",
        label: "Layanan",
        type: "text",
        placeholder: "Sablon Kaos dan Jersey"
      },
      {
        name: "alamat",
        label: "Alamat",
        type: "textarea",
        placeholder: "Jl. AP Pettarani, Ruko New Zamrud Blok G No.7"
      },
      {
        name: "whatsapp",
        label: "Nomor WhatsApp",
        type: "text",
        placeholder: "0853-5533-3364"
      },
      {
        name: "whatsapp_link",
        label: "Link WhatsApp",
        type: "text",
        placeholder: "https://wa.me/6285355333364"
      },
      {
        name: "maps_link",
        label: "Link Google Maps",
        type: "text",
        placeholder: "https://www.google.com/maps/search/?api=1&query=..."
      },
      {
        name: "jam_operasional",
        label: "Jam operasional",
        type: "text",
        placeholder: "Senin–Sabtu, 09.00–21.00"
      },
      {
        name: "image_url",
        label: "Foto store",
        type: "image",
        placeholder: "/images/debroder/stores/store-pettarani.jpg",
        helper: "Rekomendasi 1200x800."
      },
      {
        name: "image_alt",
        label: "Teks alternatif gambar",
        type: "text",
        placeholder: "Foto Store DE BRODER"
      },
      { name: "urutan", label: "Urutan tampil", type: "number" },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "order",
    label: "Cara Order",
    navLabel: "Cara Order",
    href: "/admin/order",
    table: "order_steps",
    description: "Atur langkah singkat cara order.",
    orderField: "urutan",
    fields: [
      {
        name: "title",
        label: "Judul langkah",
        type: "text",
        placeholder: "Pilih layanan",
        required: true
      },
      {
        name: "description",
        label: "Detail singkat",
        type: "textarea",
        placeholder: "Tentukan kebutuhan apparel, sablon, jersey, atau custom."
      },
      { name: "urutan", label: "Urutan tampil", type: "number" },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "trust-about",
    label: "Trust & Tentang",
    navLabel: "Trust & Tentang",
    href: "/admin/trust-about",
    table: "trust_about_content",
    description: "Atur trust item dan paragraf Tentang Kami.",
    fields: [
      {
        name: "trust_items",
        label: "Trust item",
        type: "list",
        placeholder: "4 Store Aktif\nApparel & Custom\nSablon DTF",
        helper: "Gunakan teks singkat agar landing page tetap ringan."
      },
      {
        name: "about_body",
        label: "Paragraf Tentang Kami",
        type: "textarea",
        placeholder: "De Broder adalah perusahaan percetakan...",
        helper: "Gunakan teks singkat agar landing page tetap ringan."
      },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  },
  {
    key: "media",
    label: "Media Library",
    navLabel: "Media Library",
    href: "/admin/media",
    table: "",
    description: "Upload, cari, replace, dan kelola aset foto atau video.",
    fields: []
  },
  {
    key: "contact-footer",
    label: "Kontak & Footer",
    navLabel: "Kontak & Footer",
    href: "/admin/contact-footer",
    table: "contact_settings",
    description: "Atur kontak resmi dan teks footer.",
    fields: [
      {
        name: "email",
        label: "Email",
        type: "text",
        placeholder: "debroderapparel@gmail.com",
        required: true
      },
      {
        name: "whatsapp_utama",
        label: "WhatsApp utama",
        type: "text",
        placeholder: "0853-5533-3364"
      },
      {
        name: "whatsapp_link",
        label: "Link WhatsApp utama",
        type: "text",
        placeholder: "https://wa.me/6285355333364"
      },
      {
        name: "whatsapp_apparel",
        label: "WhatsApp Apparel",
        type: "text",
        placeholder: "0853-5533-3364"
      },
      {
        name: "whatsapp_express",
        label: "WhatsApp cadangan",
        type: "text",
        placeholder: "0853-5533-3364"
      },
      {
        name: "facebook",
        label: "Facebook",
        type: "text",
        placeholder: "https://www.facebook.com/debroderapparel/"
      },
      {
        name: "instagram",
        label: "Instagram",
        type: "text",
        placeholder: "https://instagram.com/de_broder"
      },
      {
        name: "copyright_text",
        label: "Copyright",
        type: "text",
        placeholder: "© 2026 DE BRODER. All rights reserved."
      },
      { name: "status_aktif", label: "Aktif", type: "boolean" }
    ]
  }
];

const routeToKey = tableConfigs.reduce<Record<string, string>>((acc, config) => {
  acc[config.href] = config.key;
  return acc;
}, {});

function emptyForm(fields: FieldConfig[]) {
  return fields.reduce<AdminRow>((acc, field) => {
    if (field.type === "boolean") acc[field.name] = true;
    else if (field.type === "number") acc[field.name] = field.nullable ? null : 0;
    else if (field.type === "range") acc[field.name] = 50;
    else if (field.type === "list") acc[field.name] = [];
    else if (field.type === "select") acc[field.name] = field.options?.[0] || "";
    else acc[field.name] = "";
    return acc;
  }, {});
}

function valueToText(value: AdminValue) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "Aktif" : "Nonaktif";
  return value?.toString() || "";
}

function friendlyError(message?: string) {
  if (!message) return "Aksi belum berhasil. Coba lagi sebentar.";
  if (message.toLowerCase().includes("storage")) {
    return "Upload belum berhasil. Anda tetap bisa memakai input URL manual.";
  }
  if (message.toLowerCase().includes("does not exist")) {
    return "Tabel belum tersedia. Jalankan schema Supabase terbaru terlebih dahulu.";
  }
  return "Aksi belum berhasil. Periksa data lalu coba lagi.";
}

function looksLikeUrlOrPath(value: string) {
  return (
    !value ||
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeProductCategory(value: string) {
  const slug = makeSlug(value.trim());

  if (["sablon-dtf", "sablon-kaos"].includes(slug)) return "sablon-kaos";
  if (["jersey", "custom-jersey"].includes(slug)) return "custom-jersey";
  return slug;
}

function productMatchesCategory(row: AdminRow, selectedCategory: string) {
  if (selectedCategory === "all") return true;

  const category = normalizeProductCategory(valueToText(row.kategori));
  const name = makeSlug(valueToText(row.nama));

  if (selectedCategory === "kaos-cotton-combed") {
    return category === selectedCategory || name.includes("cotton-combed");
  }

  return category === selectedCategory || name.includes(selectedCategory);
}

function previewUrl(row: AdminRow) {
  return (
    valueToText(row.image_url) ||
    valueToText(row.mobile_image_url) ||
    valueToText(row.gambar_url) ||
    valueToText(row.desktop_video_url) ||
    valueToText(row.mobile_video_url) ||
    valueToText(row.hero_video_url)
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeKey, setActiveKey] = useState(
    routeToKey[pathname] || "overview"
  );
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [form, setForm] = useState<AdminRow>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("Memeriksa akses...");
  const [isAllowed, setIsAllowed] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [mediaChoices, setMediaChoices] = useState<MediaChoice[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    products: 0,
    productsInactive: 0,
    categories: 0,
    services: 0,
    media: 0,
    stores: 0,
    heroes: 0,
    banners: 0,
    pageHeroes: 0
  });
  const [storageReady, setStorageReady] = useState(false);
  const [selectedProductCategory, setSelectedProductCategory] = useState("all");
  const configured = isSupabaseConfigured();

  const activeConfig = useMemo(
    () =>
      tableConfigs.find((config) => config.key === activeKey) ||
      tableConfigs[0],
    [activeKey]
  );

  const productCategoryOptions = useMemo(() => {
    const options = new Map(
      preferredProductCategories.map((category) => [category.slug, category])
    );

    rows.forEach((row) => {
      const label = valueToText(row.kategori).trim();
      const slug = normalizeProductCategory(label);
      if (label && slug && !options.has(slug)) options.set(slug, { label, slug });
    });

    return Array.from(options.values());
  }, [rows]);

  const visibleRows = useMemo(
    () =>
      activeKey === "products"
        ? rows.filter((row) => productMatchesCategory(row, selectedProductCategory))
        : rows,
    [activeKey, rows, selectedProductCategory]
  );

  useEffect(() => {
    const key = routeToKey[pathname] || "overview";
    setActiveKey(key);
  }, [pathname]);

  useEffect(() => {
    if (activeKey !== "products") setSelectedProductCategory("all");
  }, [activeKey]);

  useEffect(() => {
    async function checkAccess() {
      if (!configured) {
        setStatus("Supabase belum dikonfigurasi.");
        setIsDenied(true);
        return;
      }

      const supabase = createSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (profile?.role !== "superadmin") {
        setStatus("Akses ditolak. Akun ini bukan superadmin.");
        setIsDenied(true);
        return;
      }

      setIsAllowed(true);
      setStatus("");
    }

    checkAccess();
  }, [configured, router]);

  async function countActive(table: string) {
    const supabase = createSupabaseClient();
    if (!supabase) return 0;

    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status_aktif", true);

    if (error) return 0;
    return count || 0;
  }

  async function countInactive(table: string) {
    const supabase = createSupabaseClient();
    if (!supabase) return 0;
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status_aktif", false);
    return error ? 0 : count || 0;
  }

  async function checkStorageReady() {
    const supabase = createSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.storage
      .from(WEBSITE_IMAGES_BUCKET)
      .list("", { limit: 1 });

    return !error;
  }

  async function loadOverview() {
    const [products, productsInactive, categories, services, media, stores, heroes, banners, pageHeroes, uploadReady] =
      await Promise.all([
        countActive("products"),
        countInactive("products"),
        countActive("service_categories"),
        countActive("services"),
        countActive("media_assets"),
        countActive("stores"),
        countActive("hero_banners"),
        countActive("instagram_banners"),
        countActive("page_heroes"),
        checkStorageReady()
      ]);

    setStats({ products, productsInactive, categories, services, media, stores, heroes, banners, pageHeroes });
    setStorageReady(uploadReady);
  }

  async function loadRows(config = activeConfig) {
    const supabase = createSupabaseClient();
    if (!supabase || !config.table) return;

    setIsLoading(true);
    let query = supabase.from(config.table).select("*");
    if (config.orderField) {
      query = query.order(config.orderField, { ascending: true });
    }
    const { data, error } = await query;
    setIsLoading(false);

    if (error) {
      setStatus(friendlyError(error.message));
      return;
    }

    setRows((data || []) as AdminRow[]);
  }

  async function loadMediaChoices() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("media_assets")
      .select("id,name,public_url,media_type")
      .eq("status_aktif", true)
      .order("created_at", { ascending: false })
      .limit(100);
    setMediaChoices((data || []) as MediaChoice[]);
  }

  useEffect(() => {
    if (isAllowed) loadMediaChoices();
  }, [isAllowed]);

  useEffect(() => {
    setRows([]);
    setEditingId(null);
    setForm(emptyForm(activeConfig.fields));
    setStatus("");
    if (isAllowed && activeConfig.table) {
      loadRows(activeConfig);
    }
    if (isAllowed && activeKey === "overview") {
      loadOverview();
    }
    // loadRows and loadOverview intentionally use local state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConfig, activeKey, isAllowed]);

  function navigateTo(config: TableConfig) {
    setActiveKey(config.key);
    router.push(config.href);
  }

  function updateField(field: FieldConfig, value: string | boolean) {
    setForm((current) => {
      if (field.type === "boolean") {
        return { ...current, [field.name]: Boolean(value) };
      }
      if (field.type === "number" || field.type === "range") {
        if (typeof value !== "string" || value.trim() === "") {
          return { ...current, [field.name]: field.nullable ? null : 0 };
        }
        return { ...current, [field.name]: value };
      }
      if (field.type === "list" && typeof value === "string") {
        return {
          ...current,
          [field.name]: value
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean)
        };
      }
      return { ...current, [field.name]: value };
    });
  }

  function validatePayload(payload: AdminRow) {
    for (const field of activeConfig.fields) {
      const rawValue = payload[field.name];
      const textValue = valueToText(rawValue).trim();

      if (field.required && !textValue) {
        return `${field.label} wajib diisi.`;
      }

      if (field.type === "number") {
        if (!textValue && field.nullable) {
          payload[field.name] = null;
          continue;
        }

        const numberValue =
          typeof rawValue === "number" ? rawValue : Number(textValue);

        if (Number.isNaN(numberValue)) {
          return `${field.label} wajib berupa angka.`;
        }

        const minimum = field.min ?? 0;
        const maximum = field.max;

        if (numberValue < minimum) {
          return `${field.label} minimal ${minimum}.`;
        }

        if (maximum !== undefined && numberValue > maximum) {
          return `${field.label} maksimal ${maximum}.`;
        }

        payload[field.name] = numberValue;
      }

      if (
        [
          "image_url",
          "mobile_image_url",
          "gambar_url",
          "desktop_video_url",
          "mobile_video_url",
          "hero_video_url",
          "video_url",
          "link_url",
          "maps_link"
        ].includes(field.name) &&
        textValue &&
        !looksLikeUrlOrPath(textValue)
      ) {
        return `${field.label} harus berupa link lengkap atau path lokal.`;
      }

      if (
        ["instagram", "facebook"].includes(field.name) &&
        textValue &&
        !textValue.startsWith("http")
      ) {
        return `${field.label} harus diawali http atau https.`;
      }
    }

    return null;
  }

  function preparePayload() {
    const payload: AdminRow = { ...form };
    const error = validatePayload(payload);

    if (error) {
      return { error, payload: null };
    }

    if (activeKey === "products") {
      payload.deskripsi =
        valueToText(payload.deskripsi) || valueToText(payload.short_detail);
      payload.gambar_url =
        valueToText(payload.image_url) ||
        valueToText(payload.gambar_url) ||
        "/images/debroder/fallback/fallback-product.jpg";
      payload.whatsapp_link =
        valueToText(payload.whatsapp_link) || "https://wa.me/6285355333364";
      payload.kategori = valueToText(payload.kategori) || "Produk";
      payload.slug = valueToText(payload.slug) || makeSlug(valueToText(payload.nama));
      payload.image_alt = valueToText(payload.image_alt) || valueToText(payload.nama);
      payload.object_fit = valueToText(payload.object_fit) || "cover";
      payload.object_position = valueToText(payload.object_position) || "center center";
    }

    if (activeKey === "product-filters") {
      payload.slug = valueToText(payload.slug) || makeSlug(valueToText(payload.name));
    }

    if (activeKey === "services") {
      payload.slug = valueToText(payload.slug) || makeSlug(valueToText(payload.nama));
      payload.image_url =
        valueToText(payload.image_url) ||
        "/images/debroder/fallback/fallback-product.jpg";
      payload.deskripsi = valueToText(payload.deskripsi);
      payload.image_alt = valueToText(payload.image_alt) || valueToText(payload.nama);
      const serviceSlug = valueToText(payload.slug);
      payload.category_key =
        valueToText(payload.category_key) ||
        (serviceSlug.startsWith("sablon-dtf") ? "sablon-dtf" : serviceSlug);
      payload.object_fit = valueToText(payload.object_fit) || "cover";
      payload.object_position = valueToText(payload.object_position) || "center center";
    }

    if (activeKey === "hero") {
      payload.title = valueToText(payload.headline);
      payload.subtitle = valueToText(payload.subheadline);
      payload.cta_text = valueToText(payload.cta_primary_text);
      payload.cta_link = valueToText(payload.cta_primary_link);
      payload.cta_secondary_text = valueToText(payload.cta_secondary_text);
      payload.cta_secondary_link = valueToText(payload.cta_secondary_link);
      payload.mobile_object_position =
        valueToText(payload.mobile_object_position) ||
        valueToText(payload.object_position) ||
        "center center";
      payload.image_alt =
        valueToText(payload.image_alt) || valueToText(payload.headline);
    }

    if (activeKey === "banner") {
      payload.object_position =
        valueToText(payload.object_position) || "center center";
      payload.mobile_object_position =
        valueToText(payload.mobile_object_position) ||
        valueToText(payload.object_position) ||
        "center center";
      payload.image_alt =
        valueToText(payload.image_alt) || valueToText(payload.title);
    }

    if (activeKey === "page-hero") {
      payload.image_alt =
        valueToText(payload.image_alt) || valueToText(payload.title);
      payload.object_position = valueToText(payload.object_position) || "center center";
      payload.mobile_object_position =
        valueToText(payload.mobile_object_position) ||
        valueToText(payload.object_position) ||
        "center center";
    }

    if (activeKey === "categories") {
      payload.image_alt =
        valueToText(payload.image_alt) || valueToText(payload.nama_kategori);
      payload.slug =
        valueToText(payload.slug) || makeSlug(valueToText(payload.nama_kategori));
      payload.link_slug =
        valueToText(payload.link_slug) || makeSlug(valueToText(payload.nama_kategori));
      payload.category_key =
        valueToText(payload.category_key) || valueToText(payload.link_slug);
      payload.object_fit = valueToText(payload.object_fit) || "cover";
      payload.object_position = valueToText(payload.object_position) || "center center";
    }

    if (activeKey === "store") {
      payload.whatsapp = valueToText(payload.whatsapp) || "0853-5533-3364";
      payload.whatsapp_link =
        valueToText(payload.whatsapp_link) || "https://wa.me/6285355333364";
      payload.maps_link = valueToText(payload.maps_link) || "https://www.google.com/maps";
      payload.image_alt =
        valueToText(payload.image_alt) ||
        `Foto ${valueToText(payload.nama_store)} DE BRODER`;
    }

    return { error: null, payload };
  }

  function startEdit(row: AdminRow) {
    const normalized = { ...row };

    if (activeKey === "products" && !normalized.image_url) {
      normalized.image_url = normalized.gambar_url;
    }

    setEditingId(row.id || null);
    setForm(normalized);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(activeConfig.fields));
  }

  async function uploadAsset(field: FieldConfig, file?: File) {
    if (!file) return;

    const isVideo = field.type === "video";
    const allowed = isVideo
      ? ["video/mp4", "video/webm", "video/quicktime"]
      : ["image/jpeg", "image/png", "image/webp"];
    const limit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      setStatus(isVideo ? "Format video harus MP4, WebM, atau MOV." : "Format foto harus JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > limit) {
      setStatus(isVideo ? "Ukuran video maksimal 100 MB." : "Ukuran foto maksimal 10 MB.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      setStatus("Upload belum tersedia. Isi URL manual terlebih dahulu.");
      return;
    }

    setUploadingField(field.name);
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-|-$/g, "");
    const path = `${activeKey}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from(WEBSITE_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type
      });

    if (error) {
      setUploadingField(null);
      setStatus("Upload belum berhasil. Input URL manual tetap bisa dipakai.");
      return;
    }

    const { data } = supabase.storage.from(WEBSITE_IMAGES_BUCKET).getPublicUrl(path);
    setForm((current) => ({
      ...current,
      [field.name]: field.type === "list"
        ? [...(Array.isArray(current[field.name]) ? current[field.name] as string[] : []), data.publicUrl]
        : data.publicUrl,
      ...(isVideo || field.type === "list" || valueToText(current.image_alt)
        ? {}
        : { image_alt: file.name.replace(/\.[^.]+$/, "") })
    }));
    const { data: sessionData } = await supabase.auth.getSession();
    const folderMap: Record<string, string> = {
      hero: "Hero",
      products: "Produk",
      services: "Produk",
      categories: "Kategori",
      store: "Store",
      banner: "Galeri",
      "page-hero": "Hero"
    };
    await supabase.from("media_assets").insert({
      name: file.name,
      bucket_id: WEBSITE_IMAGES_BUCKET,
      storage_path: path,
      public_url: data.publicUrl,
      media_type: isVideo ? "video" : "image",
      mime_type: file.type,
      size_bytes: file.size,
      folder: isVideo ? "Video" : folderMap[activeKey] || "Galeri",
      uploaded_by: sessionData.session?.user.id || null
    });
    loadMediaChoices();
    setUploadingField(null);
    setStatus("Upload berhasil. Jangan lupa Simpan Perubahan.");
  }

  async function saveRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !activeConfig.table) return;

    const prepared = preparePayload();
    if (prepared.error || !prepared.payload) {
      setStatus(prepared.error || "Data belum valid.");
      return;
    }

    setIsLoading(true);
    const payload: AdminRow = {
      ...prepared.payload,
      updated_at: new Date().toISOString()
    };
    const result = editingId
      ? await supabase
          .from(activeConfig.table)
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single()
      : await supabase.from(activeConfig.table).insert(payload).select("*").single();
    setIsLoading(false);

    if (result.error) {
      setStatus(friendlyError(result.error.message));
      return;
    }

    const savedRow = result.data as AdminRow;
    const imageFields = ["image_url", "mobile_image_url", "gambar_url"];
    const imageMismatch = imageFields.some(
      (fieldName) =>
        valueToText(payload[fieldName]) &&
        valueToText(savedRow[fieldName]) !== valueToText(payload[fieldName])
    );

    if (imageMismatch) {
      setStatus("Data tersimpan, tetapi URL gambar belum terverifikasi. Muat ulang lalu periksa kembali.");
      return;
    }

    setStatus(
      editingId
        ? "Perubahan tersimpan dan sudah diverifikasi dari database."
        : "Data baru tersimpan dan sudah diverifikasi dari database."
    );
    resetForm();
    await Promise.all([loadRows(), loadOverview(), loadMediaChoices()]);
    router.refresh();
  }

  async function deleteRow(row: AdminRow) {
    if (!row.id || !activeConfig.table) return;
    if (!window.confirm("Hapus data ini?")) return;

    const supabase = createSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from(activeConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      setStatus(friendlyError(error.message));
      return;
    }

    setStatus("Data dihapus.");
    loadRows();
    loadOverview();
  }

  async function logout() {
    const supabase = createSupabaseClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
  }

  function renderField(field: FieldConfig) {
    const commonClass =
      "mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-sm font-medium outline-none transition focus:border-brand-charcoal";

    if (field.type === "list" && field.name === "gallery_urls") {
      const urls = Array.isArray(form[field.name]) ? form[field.name] as string[] : [];

      return (
        <div className="mt-2 grid gap-3">
          <textarea
            value={urls.join("\n")}
            onChange={(event) => updateField(field, event.target.value)}
            rows={5}
            placeholder="Satu URL gambar per baris"
            className={commonClass}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold transition hover:border-brand-charcoal">
              {uploadingField === field.name ? "Mengupload..." : "Upload ke galeri"}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => uploadAsset(field, event.target.files?.[0])} />
            </label>
            {mediaChoices.some((asset) => asset.media_type === "image") ? (
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value) updateField(field, [...urls, event.target.value].join("\n"));
                }}
                className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold"
                aria-label="Tambahkan gambar dari Media Library"
              >
                <option value="">Tambah dari Media Library...</option>
                {mediaChoices.filter((asset) => asset.media_type === "image").map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}
              </select>
            ) : null}
          </div>
          {urls.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {urls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative overflow-hidden bg-brand-offWhite">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Preview galeri ${index + 1}`} className="aspect-square w-full object-cover" />
                  <button type="button" onClick={() => updateField(field, urls.filter((_, itemIndex) => itemIndex !== index).join("\n"))} className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">Hapus</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea" || field.type === "list") {
      return (
        <textarea
          value={valueToText(form[field.name])}
          onChange={(event) => updateField(field, event.target.value)}
          rows={field.type === "list" ? 5 : 4}
          placeholder={field.placeholder}
          className={commonClass}
        />
      );
    }

    if (field.type === "boolean") {
      return (
        <span className="mt-2 flex items-center gap-3 rounded-lg border border-brand-softGray px-4 py-3">
          <input
            type="checkbox"
            checked={Boolean(form[field.name])}
            onChange={(event) => updateField(field, event.target.checked)}
          />
          Aktif
        </span>
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={valueToText(form[field.name])}
          onChange={(event) => updateField(field, event.target.value)}
          className={commonClass}
        >
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "range") {
      const rawValue = form[field.name];
      const parsedValue = Number(rawValue);
      const value = rawValue === null || rawValue === undefined || rawValue === "" || !Number.isFinite(parsedValue)
        ? 50
        : parsedValue;

      return (
        <span className="mt-2 grid gap-2 rounded-lg border border-brand-softGray px-4 py-3">
          <span className="flex items-center justify-between text-xs font-medium text-brand-charcoal/60">
            <span>{field.min ?? 0}%</span>
            <output className="font-semibold text-brand-charcoal">{value}%</output>
            <span>{field.max ?? 100}%</span>
          </span>
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={value}
            onChange={(event) => updateField(field, event.target.value)}
            className={`${field.name === "focal_y" ? "h-36 w-8 place-self-center" : "w-full"} accent-brand-charcoal`}
            style={field.name === "focal_y" ? { writingMode: "vertical-lr", direction: "rtl" } : undefined}
          />
        </span>
      );
    }

    if (field.type === "image" || field.type === "video") {
      const url = valueToText(form[field.name]);
      const rawFocalX = form.focal_x;
      const rawFocalY = form.focal_y;
      const focalX = Number(rawFocalX);
      const focalY = Number(rawFocalY);
      const hasFocal = rawFocalX !== null && rawFocalX !== undefined && rawFocalX !== "" && rawFocalY !== null && rawFocalY !== undefined && rawFocalY !== "" && Number.isFinite(focalX) && Number.isFinite(focalY);
      const objectPosition = hasFocal
        ? `${Math.max(0, Math.min(100, focalX))}% ${Math.max(0, Math.min(100, focalY))}%`
        : field.name === "mobile_image_url"
          ? valueToText(form.mobile_object_position) || "center center"
          : valueToText(form.object_position) || "center center";
      const objectFit = valueToText(form.object_fit) === "contain" ? "contain" : "cover";
      const isMobileImage = field.name === "mobile_image_url";
      const focusPrefix = isMobileImage ? "mobile_" : "";
      const editorFocalX = Number(form[`${focusPrefix}focal_x`] ?? (isMobileImage ? form.focal_x : 50));
      const editorFocalY = Number(form[`${focusPrefix}focal_y`] ?? (isMobileImage ? form.focal_y : 50));
      const editorZoom = Number(form[`${focusPrefix}focal_zoom`] ?? 1);
      const editorRatio = valueToText(form[`${focusPrefix}target_ratio`]) || (isMobileImage ? "4:5-mobile" : activeKey === "banner" ? "12:5" : "16:7");

      return (
        <div className="mt-2 grid gap-3">
          <input
            type="text"
            value={url}
            onChange={(event) => updateField(field, event.target.value)}
            placeholder={field.placeholder}
            className={commonClass}
          />
          {mediaChoices.some((asset) => asset.media_type === field.type) ? (
            <select
              value=""
              onChange={(event) => updateField(field, event.target.value)}
              className={commonClass}
              aria-label={`Pilih media lama untuk ${field.label}`}
            >
              <option value="">Pilih dari Media Library...</option>
              {mediaChoices
                .filter((asset) => asset.media_type === field.type)
                .map((asset) => (
                  <option key={asset.id} value={asset.public_url}>{asset.name}</option>
                ))}
            </select>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold text-brand-charcoal transition hover:border-brand-charcoal">
              {uploadingField === field.name ? "Mengupload..." : "Upload"}
              <input
                type="file"
                accept={field.type === "video" ? "video/*" : "image/*"}
                className="sr-only"
                onChange={(event) => uploadAsset(field, event.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold text-brand-charcoal transition hover:border-brand-charcoal"
              onClick={() => updateField(field, "")}
            >
              Hapus
            </button>
          </div>
          <p className="text-xs font-medium leading-5 text-brand-charcoal/60">
            File diunggah ke Supabase Storage bucket {WEBSITE_IMAGES_BUCKET}.
            URL publik akan disimpan saat Anda menekan Simpan Perubahan.
          </p>
          {url ? (
            field.type === "video" ? (
              <video
                src={url}
                className="aspect-video w-full bg-brand-offWhite object-cover"
                muted
                playsInline
                controls
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={`Preview ${field.label}`}
                className={`${field.name === "mobile_image_url" ? "aspect-[4/5]" : "aspect-video"} w-full bg-brand-offWhite`}
                style={{ objectFit, objectPosition }}
              />
            )
          ) : null}
          {url && field.type === "image" && field.name !== "og_image_url" ? (
            <FocalPointEditor
              src={url}
              alt={`Atur fokus ${field.label}`}
              compact
              value={{
                focal_x: Number.isFinite(editorFocalX) ? editorFocalX : 50,
                focal_y: Number.isFinite(editorFocalY) ? editorFocalY : 50,
                zoom: Number.isFinite(editorZoom) ? editorZoom : 1,
                target_ratio: editorRatio
              }}
              onChange={(next) => setForm((current) => ({
                ...current,
                [`${focusPrefix}focal_x`]: next.focal_x,
                [`${focusPrefix}focal_y`]: next.focal_y,
                [`${focusPrefix}focal_zoom`]: next.zoom,
                [`${focusPrefix}target_ratio`]: next.target_ratio,
                ...(isMobileImage
                  ? { mobile_object_position: `${next.focal_x}% ${next.focal_y}%` }
                  : { object_position: `${next.focal_x}% ${next.focal_y}%` })
              }))}
              onSave={() => setStatus("Fokus diperbarui di formulir. Tekan Simpan Perubahan untuk menerbitkan.")}
            />
          ) : null}
        </div>
      );
    }

    return (
      <input
        type={field.type === "number" ? "number" : "text"}
        min={field.type === "number" ? 0 : undefined}
        step={field.type === "number" ? 1 : undefined}
        value={valueToText(form[field.name])}
        onChange={(event) => updateField(field, event.target.value)}
        placeholder={field.placeholder}
        className={commonClass}
      />
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-offWhite p-6 text-brand-charcoal">
        <div className="mx-auto mt-20 max-w-lg rounded-xl border border-brand-softGray bg-white p-8 text-center shadow-soft">
          <h1 className="text-3xl font-semibold">
            {isDenied ? "Akses Ditolak" : "Memuat Dashboard"}
          </h1>
          <p className="mt-4 text-sm font-medium text-brand-charcoal/70">
            {status}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-offWhite text-brand-charcoal">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <aside className="hidden min-h-screen border-r border-brand-softGray bg-white p-5 lg:block">
          <Logo variant="primary-dark" size="md" />
          <nav className="mt-8 grid gap-2">
            {tableConfigs.map((config) => (
              <button
                key={config.key}
                type="button"
                onClick={() => navigateTo(config)}
                className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                  activeKey === config.key
                    ? "bg-brand-charcoal text-white"
                    : "hover:bg-brand-offWhite"
                }`}
              >
                {config.navLabel}
              </button>
            ))}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Logout
            </button>
          </nav>
        </aside>

        <section className="p-4 sm:p-6 lg:p-8">
          <header className="border border-brand-softGray bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-charcoal/50">
                  Super Admin
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                  {activeConfig.label}
                </h1>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/70">
                  {activeConfig.description}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-5 py-3 text-sm font-semibold text-brand-charcoal transition hover:border-brand-charcoal"
              >
                Logout
              </button>
            </div>
            <select
              value={activeKey}
              onChange={(event) => {
                const next = tableConfigs.find(
                  (config) => config.key === event.target.value
                );
                if (next) navigateTo(next);
              }}
              className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3 text-sm font-semibold lg:hidden"
            >
              {tableConfigs.map((config) => (
                <option key={config.key} value={config.key}>
                  {config.navLabel}
                </option>
              ))}
            </select>
          </header>

          {status ? (
            <p className="mt-5 border border-brand-softGray bg-white p-4 text-sm font-semibold text-brand-charcoal">
              {status}
            </p>
          ) : null}

          {activeKey === "overview" ? (
            <div className="mt-6 grid gap-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Supabase",
                    configured ? "Supabase Connected" : "Supabase Not Connected",
                    configured
                  ],
                  ["Auth", isAllowed ? "Auth Active" : "Auth Not Ready", isAllowed],
                  [
                    "Hero",
                    stats.heroes > 0 ? "Hero Data Found" : "Hero Data Empty",
                    stats.heroes > 0
                  ],
                  [
                    "Product",
                    stats.products > 0
                      ? "Product Data Found"
                      : "Product Data Empty",
                    stats.products > 0
                  ],
                  [
                    "Store",
                    stats.stores > 0 ? "Store Data Found" : "Store Data Empty",
                    stats.stores > 0
                  ],
                  [
                    "Page Hero",
                    stats.pageHeroes > 0
                      ? "Page Hero Data Found"
                      : "Page Hero Data Empty",
                    stats.pageHeroes > 0
                  ],
                  [
                    "Storage",
                    storageReady
                      ? "Storage Upload Ready"
                      : "Storage Upload Not Ready",
                    storageReady
                  ]
                ].map(([label, value, ready]) => (
                  <article key={label.toString()} className="bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                      {label}
                    </p>
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        ready ? "text-brand-charcoal" : "text-brand-charcoal/55"
                      }`}
                    >
                      {value}
                    </p>
                  </article>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Total produk aktif", stats.products],
                  ["Produk nonaktif", stats.productsInactive],
                  ["Kategori aktif", stats.categories],
                  ["Layanan aktif", stats.services],
                  ["Total media", stats.media],
                  ["Total store aktif", stats.stores],
                  ["Hero aktif", stats.heroes],
                  ["Banner aktif", stats.banners]
                ].map(([label, value]) => (
                  <article key={label} className="bg-white p-5">
                    <p className="text-sm font-medium text-brand-charcoal/60">
                      {label}
                    </p>
                    <p className="mt-3 text-4xl font-semibold">{value}</p>
                  </article>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {tableConfigs
                  .filter((config) =>
                    ["hero", "products", "services", "media", "store", "page-hero"].includes(
                      config.key
                    )
                  )
                  .map((config) => (
                    <button
                      key={config.key}
                      type="button"
                      onClick={() => navigateTo(config)}
                      className="bg-white p-5 text-left transition hover:bg-brand-charcoal hover:text-white"
                    >
                      <p className="text-lg font-semibold">{config.label}</p>
                      <p className="mt-2 text-sm leading-6 opacity-70">
                        Edit cepat
                      </p>
                    </button>
                  ))}
              </div>
              <div className="border border-brand-softGray bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">Media terbaru</p>
                    <h2 className="mt-2 text-2xl font-semibold">Aset yang baru diupload</h2>
                  </div>
                  <button type="button" onClick={() => navigateTo(tableConfigs.find((item) => item.key === "media")!)} className="text-sm font-semibold text-brand-green hover:underline">Buka library</button>
                </div>
                {mediaChoices.length ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {mediaChoices.slice(0, 5).map((asset) => (
                      <article key={asset.id} className="min-w-0">
                        {asset.media_type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.public_url} alt={asset.name} className="aspect-square w-full bg-brand-offWhite object-cover" />
                        ) : (
                          <div className="grid aspect-square place-items-center bg-brand-charcoal text-xs font-semibold text-white">VIDEO</div>
                        )}
                        <p className="mt-2 truncate text-xs font-semibold">{asset.name}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="mt-5 bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Belum ada media. Tambahkan aset pertama melalui Media Library.</p>}
              </div>
              <div className="border border-brand-softGray bg-white p-5">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
                    Panduan Upload
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Image Dimension Guide
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">
                    Gunakan ukuran berikut agar gambar tetap tajam, responsif,
                    dan konsisten di mobile maupun desktop.
                  </p>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-softGray text-xs uppercase tracking-[0.16em] text-brand-charcoal/50">
                        <th className="py-3 pr-4 font-semibold">Nama gambar</th>
                        <th className="py-3 pr-4 font-semibold">Ukuran ideal</th>
                        <th className="py-3 pr-4 font-semibold">Aspect ratio</th>
                        <th className="py-3 font-semibold">Lokasi penggunaan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imageGuides.map(([name, size, ratio, location]) => (
                        <tr
                          key={name}
                          className="border-b border-brand-softGray last:border-0"
                        >
                          <td className="py-3 pr-4 font-semibold text-brand-charcoal">
                            {name}
                          </td>
                          <td className="py-3 pr-4 text-brand-charcoal/70">
                            {size}
                          </td>
                          <td className="py-3 pr-4 text-brand-charcoal/70">
                            {ratio}
                          </td>
                          <td className="py-3 text-brand-charcoal/70">
                            {location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeKey === "homepage-sections" ? (
            <HomepageSectionsAdmin />
          ) : activeKey === "products" ? (
            <ProductAdminPanel />
          ) : activeKey === "media" ? (
            <MediaLibraryPanel />
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <form
                onSubmit={saveRow}
                className="border border-brand-softGray bg-white p-5"
              >
                <h2 className="text-2xl font-semibold">
                  {editingId ? "Edit Data" : "Tambah Baru"}
                </h2>
                <div className="mt-5 grid gap-4">
                  {activeConfig.fields.map((field) => (
                    <label key={field.name} className="text-sm font-semibold">
                      {field.label}
                      {renderField(field)}
                      {field.helper ? (
                        <span className="mt-1 block text-xs font-medium text-brand-charcoal/60">
                          {field.helper}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold text-brand-charcoal transition hover:border-brand-charcoal"
                  >
                    Reset
                  </button>
                </div>
              </form>

              <div className="border border-brand-softGray bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold">Data</h2>
                  <button
                    type="button"
                    onClick={() => loadRows()}
                    className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold text-brand-charcoal transition hover:border-brand-charcoal"
                  >
                    Refresh
                  </button>
                </div>
                {activeKey === "products" ? (
                  <div className="mt-5 border-y border-brand-softGray py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/50">
                      Filter kategori
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter kategori produk admin">
                      {productCategoryOptions.map((category) => {
                        const active = selectedProductCategory === category.slug;
                        return (
                          <button
                            key={category.slug}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedProductCategory(category.slug)}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                              active
                                ? "border-brand-charcoal bg-brand-charcoal text-white"
                                : "border-brand-softGray bg-white text-brand-charcoal hover:border-brand-charcoal"
                            }`}
                          >
                            {category.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="mt-5 grid gap-4">
                  {visibleRows.map((row) => {
                    const image = previewUrl(row);
                    const price = formatRupiah(
                      (row.price || row.harga || row.base_price || row.price_label) as
                        | string
                        | number
                        | null
                        | undefined
                    );

                    return (
                      <article
                        key={row.id || JSON.stringify(row)}
                        className="border border-brand-softGray bg-brand-offWhite p-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image}
                              alt="Preview data"
                              className="aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="aspect-square bg-white" />
                          )}
                          <div className="grid gap-1 text-sm">
                            {activeConfig.fields.slice(0, 5).map((field) => (
                              <p key={field.name}>
                                <span className="font-semibold">
                                  {field.label}:{" "}
                                </span>
                                <span className="text-brand-charcoal/70">
                                  {valueToText(row[field.name]).slice(0, 120)}
                                </span>
                              </p>
                            ))}
                            {price ? (
                              <p className="font-medium text-brand-charcoal">
                                {price}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRow(row)}
                            className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white"
                          >
                            Hapus
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!visibleRows.length ? (
                    <p className="bg-brand-offWhite p-4 text-sm font-medium text-brand-charcoal/70">
                      {activeKey === "products" && selectedProductCategory !== "all"
                        ? "Belum ada produk di kategori ini."
                        : "Belum ada data atau tabel belum tersedia."}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

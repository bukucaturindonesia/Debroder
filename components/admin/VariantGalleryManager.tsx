/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createSupabaseClient, WEBSITE_IMAGES_BUCKET } from "@/lib/supabase";
import {
  isFourFiveRatio,
  mediaDimensionLabel,
  PRODUCT_GALLERY_LIMIT,
  PRODUCT_IMAGE_ROLE_ORDER,
  PRODUCT_IMAGE_SLOTS,
  productImageRoleFromIndex,
  type ProductImageRole
} from "@/lib/product-gallery";
import type { ProductVariantImage } from "@/lib/types";

type VariantChoice = {
  id?: string;
  variant_name?: string;
  color_name?: string;
  color_hex?: string;
  image_url?: string | null;
};

type MediaChoice = {
  id: string;
  name: string;
  public_url: string;
  alt_text?: string;
  folder?: string;
  width?: number | null;
  height?: number | null;
};

type StatusMessage = { type: "info" | "success" | "error"; text: string };

type Props = {
  variants: VariantChoice[];
  images: ProductVariantImage[];
  onChanged: () => Promise<void> | void;
  onStatus: (message: StatusMessage) => void;
};

function variantLabel(variant?: VariantChoice | null) {
  return variant?.variant_name || variant?.color_name || "Varian";
}

function roleOfLegacyImage(image: ProductVariantImage, fallbackIndex: number): ProductImageRole {
  if (image.image_role && image.image_role in PRODUCT_IMAGE_ROLE_ORDER) return image.image_role;
  if (image.is_cover) return "front";
  return productImageRoleFromIndex(fallbackIndex);
}

function slotMapForImages(images: ProductVariantImage[]) {
  const result = new Map<ProductImageRole, ProductVariantImage>();
  [...images]
    .sort((a, b) => Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .forEach((image, index) => {
      const role = roleOfLegacyImage(image, index);
      if (!result.has(role)) result.set(role, image);
    });
  return result;
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "image";
}

async function readDimensions(file: File) {
  return await new Promise<{ width: number; height: number }>((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

async function fileHash(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function VariantGalleryManager({ variants, images, onChanged, onStatus }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || "");
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [pickerRole, setPickerRole] = useState<ProductImageRole | null>(null);
  const [busyRole, setBusyRole] = useState<ProductImageRole | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(variants[0]?.id || "");
    }
  }, [selectedVariantId, variants]);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    void supabase
      .from("media_assets")
      .select("id,name,public_url,alt_text,folder,width,height")
      .eq("status_aktif", true)
      .eq("media_type", "image")
      .order("created_at", { ascending: false })
      .then(({ data }) => setMedia((data || []) as MediaChoice[]));
  }, []);

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || null;
  const selectedImages = useMemo(
    () => images.filter((image) => image.variant_id === selectedVariantId),
    [images, selectedVariantId]
  );
  const slots = useMemo(() => slotMapForImages(selectedImages), [selectedImages]);
  const completeCount = PRODUCT_IMAGE_SLOTS.filter((slot) => slots.has(slot.key)).length;
  const filteredMedia = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return media;
    return media.filter((item) => `${item.name} ${item.folder || ""} ${item.alt_text || ""}`.toLowerCase().includes(needle));
  }, [media, query]);

  async function saveSlot(role: ProductImageRole, url: string, altText?: string) {
    const supabase = createSupabaseClient();
    if (!supabase || !selectedVariantId || !url.trim()) return;
    setBusyRole(role);

    const existing = slots.get(role);
    const payload = {
      variant_id: selectedVariantId,
      image_url: url.trim(),
      image_role: role,
      alt_text: altText?.trim() || `${variantLabel(selectedVariant)} ${PRODUCT_IMAGE_SLOTS[PRODUCT_IMAGE_ROLE_ORDER[role]].shortLabel}`,
      object_fit: existing?.object_fit || "cover",
      object_position: existing?.object_position || "center center",
      focal_x: existing?.focal_x ?? 50,
      focal_y: existing?.focal_y ?? 50,
      focal_zoom: existing?.focal_zoom ?? 1,
      target_ratio: "4:5",
      is_cover: role === "front",
      sort_order: PRODUCT_IMAGE_ROLE_ORDER[role]
    };

    if (role === "front") {
      await supabase.from("product_variant_images").update({ is_cover: false }).eq("variant_id", selectedVariantId);
    }

    const request = existing?.id
      ? supabase.from("product_variant_images").update(payload).eq("id", existing.id)
      : supabase.from("product_variant_images").insert(payload);
    const { error } = await request;

    if (!error && role === "front") {
      await supabase.from("product_variants").update({ image_url: url.trim() }).eq("id", selectedVariantId);
    }

    setBusyRole(null);
    if (error) {
      onStatus({ type: "error", text: `Foto varian gagal disimpan: ${error.message}` });
      return;
    }
    onStatus({ type: "success", text: `${PRODUCT_IMAGE_SLOTS[PRODUCT_IMAGE_ROLE_ORDER[role]].label} berhasil disimpan.` });
    setPickerRole(null);
    await onChanged();
  }

  async function removeSlot(role: ProductImageRole) {
    const existing = slots.get(role);
    if (!existing?.id) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setBusyRole(role);
    const { error } = await supabase.from("product_variant_images").delete().eq("id", existing.id);
    if (!error && role === "front" && selectedVariantId) {
      await supabase.from("product_variants").update({ image_url: null }).eq("id", selectedVariantId);
    }
    setBusyRole(null);
    if (error) onStatus({ type: "error", text: `Foto gagal dihapus: ${error.message}` });
    else {
      onStatus({ type: "success", text: "Foto varian dihapus dari slot. File asli tetap aman di Media Library." });
      await onChanged();
    }
  }

  async function uploadToSlot(event: ChangeEvent<HTMLInputElement>, role: ProductImageRole) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedVariantId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      onStatus({ type: "error", text: "Gunakan JPG, PNG, atau WebP maksimal 10 MB." });
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setBusyRole(role);
    const dimensions = await readDimensions(file);
    const hash = await fileHash(file);
    const { data: duplicate } = await supabase.from("media_assets").select("public_url").eq("content_hash", hash).limit(1).maybeSingle();
    let publicUrl = duplicate?.public_url as string | undefined;

    if (!publicUrl) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `product-variant/${selectedVariantId}/${Date.now()}-${safeFileName(file.name.replace(/\.[^.]+$/, ""))}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(WEBSITE_IMAGES_BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type
      });
      if (uploadError) {
        setBusyRole(null);
        onStatus({ type: "error", text: `Upload gagal: ${uploadError.message}` });
        return;
      }
      publicUrl = supabase.storage.from(WEBSITE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
      const { data: session } = await supabase.auth.getSession();
      await supabase.from("media_assets").insert({
        name: file.name,
        storage_path: path,
        bucket_id: WEBSITE_IMAGES_BUCKET,
        public_url: publicUrl,
        media_type: "image",
        mime_type: file.type,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        alt_text: `${variantLabel(selectedVariant)} ${PRODUCT_IMAGE_SLOTS[PRODUCT_IMAGE_ROLE_ORDER[role]].shortLabel}`,
        tags: ["product", "variant", role],
        content_hash: hash,
        folder: "Product Variants",
        uploaded_by: session.session?.user.id || null
      });
      setMedia((current) => [{
        id: crypto.randomUUID(),
        name: file.name,
        public_url: publicUrl || "",
        alt_text: `${variantLabel(selectedVariant)} ${role}`,
        folder: "Product Variants",
        width: dimensions.width,
        height: dimensions.height
      }, ...current]);
    }

    const ratioWarning = isFourFiveRatio(dimensions.width, dimensions.height) === false
      ? " Foto bukan 4:5 dan akan dicrop pada tampilan publik."
      : "";
    await saveSlot(role, publicUrl || "", `${variantLabel(selectedVariant)} ${PRODUCT_IMAGE_SLOTS[PRODUCT_IMAGE_ROLE_ORDER[role]].shortLabel}`);
    if (ratioWarning) onStatus({ type: "info", text: `Foto berhasil dipasang.${ratioWarning}` });
    setBusyRole(null);
  }

  if (!variants.length) {
    return <div className="bg-white p-5 text-sm font-medium text-brand-charcoal/55 sm:p-7">Buat varian warna terlebih dahulu sebelum mengisi galeri per warna.</div>;
  }

  return (
    <section className="bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">Galeri Per Varian Warna</p>
          <h3 className="mt-2 text-xl font-semibold">Empat slot yang konsisten</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/55">Pilih foto dari Media Library atau upload langsung. Urutan peran dikunci: depan, belakang, detail, lalu lifestyle.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${completeCount === PRODUCT_GALLERY_LIMIT ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
          {completeCount} / {PRODUCT_GALLERY_LIMIT} foto
        </span>
      </div>

      <label className="mt-5 block text-sm font-semibold">
        Varian warna
        <select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-4 sm:max-w-md">
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variantLabel(variant)}</option>)}
        </select>
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PRODUCT_IMAGE_SLOTS.map((slot) => {
          const role = slot.key;
          const image = slots.get(role);
          const busy = busyRole === role;
          return (
            <article key={role} className="border border-brand-softGray bg-brand-offWhite p-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold">{slot.label}</p><p className="mt-1 text-xs leading-5 text-brand-charcoal/50">{slot.description}</p></div>
                {role === "front" ? <span className="rounded-full bg-brand-green px-2 py-1 text-[10px] font-semibold text-white">UTAMA</span> : null}
              </div>
              <div className="relative mt-3 aspect-[4/5] overflow-hidden bg-white">
                {image?.image_url ? <img src={image.image_url} alt={image.alt_text || slot.label} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center text-xs font-semibold text-brand-charcoal/35">Belum ada foto</div>}
              </div>
              <div className="mt-3 grid gap-2">
                <button type="button" disabled={busy} onClick={() => setPickerRole(role)} className="min-h-10 border border-brand-charcoal bg-white px-3 text-xs font-semibold disabled:opacity-50">Pilih dari Media Library</button>
                <label className="grid min-h-10 cursor-pointer place-items-center bg-brand-charcoal px-3 text-center text-xs font-semibold text-white">
                  {busy ? "Memproses..." : image ? "Ganti lewat upload" : "Upload foto"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => void uploadToSlot(event, role)} />
                </label>
                {image ? <button type="button" disabled={busy} onClick={() => void removeSlot(role)} className="min-h-9 text-xs font-semibold text-red-700 disabled:opacity-50">Kosongkan slot</button> : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className={`mt-5 border-l-2 pl-3 text-xs leading-5 ${completeCount === 4 ? "border-brand-green text-brand-green" : "border-amber-500 text-brand-charcoal/60"}`}>
        {completeCount === 4
          ? "Galeri varian lengkap. Saat pelanggan memilih warna ini, keempat foto otomatis ikut berubah."
          : "Lengkapi empat slot agar pengalaman produk konsisten. Varian yang belum lengkap tetap dapat disimpan sebagai pekerjaan berjalan."}
      </div>

      {pickerRole ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Pilih media untuk galeri varian">
          <div className="mx-auto max-w-6xl bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">Media Library</p><h3 className="mt-2 text-xl font-semibold">Pilih {PRODUCT_IMAGE_SLOTS[PRODUCT_IMAGE_ROLE_ORDER[pickerRole]].label}</h3></div>
              <button type="button" onClick={() => setPickerRole(null)} className="grid h-10 w-10 place-items-center rounded-full bg-brand-offWhite text-xl">×</button>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, folder, atau alt text..." className="mt-5 min-h-11 w-full border border-brand-softGray px-4" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {filteredMedia.map((item) => {
                const used = Array.from(slots.values()).some((image) => image.image_url === item.public_url && image.image_role !== pickerRole);
                const ratioOk = isFourFiveRatio(item.width, item.height);
                return (
                  <button key={item.id} type="button" disabled={used || busyRole === pickerRole} onClick={() => void saveSlot(pickerRole, item.public_url, item.alt_text)} className="overflow-hidden border border-brand-softGray bg-white text-left disabled:cursor-not-allowed disabled:opacity-40">
                    <div className="aspect-[4/5] overflow-hidden bg-brand-offWhite"><img src={item.public_url} alt={item.alt_text || item.name} className="h-full w-full object-cover" /></div>
                    <div className="p-3"><p className="truncate text-xs font-semibold">{item.name}</p><p className="mt-1 text-[10px] text-brand-charcoal/50">{mediaDimensionLabel(item.width, item.height)}</p><p className={`mt-1 text-[10px] font-semibold ${ratioOk === false ? "text-amber-700" : "text-brand-green"}`}>{ratioOk === false ? "Akan dicrop ke 4:5" : ratioOk ? "Rasio 4:5" : "Dimensi belum tersedia"}</p>{used ? <p className="mt-1 text-[10px] font-semibold text-red-700">Sudah dipakai di slot lain</p> : null}</div>
                  </button>
                );
              })}
            </div>
            {!filteredMedia.length ? <p className="mt-6 bg-brand-offWhite p-5 text-sm text-brand-charcoal/55">Tidak ada media yang sesuai pencarian.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

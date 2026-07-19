/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseClient, WEBSITE_IMAGES_BUCKET } from "@/lib/supabase";

type MediaAsset = {
  id: string;
  name: string;
  storage_path: string;
  bucket_id?: string;
  public_url: string;
  media_type: "image" | "video";
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  alt_text?: string;
  tags?: string[];
  content_hash?: string | null;
  folder: string;
  thumbnail_url?: string | null;
  uploaded_by?: string | null;
  used_by?: string[];
  created_at: string;
  updated_at?: string;
};

type UsageRow = Record<string, unknown>;

const folders = [
  "hero",
  "hero-mobile",
  "products",
  "categories",
  "services",
  "page-hero",
  "jersey",
  "featured",
  "trending",
  "fresh-drop",
  "store",
  "banner",
  "about",
  "benefits",
  "social-preview"
];
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/webm"];
const MB = 1024 * 1024;

function readableSize(bytes: number) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function safeFileName(name: string) {
  const parts = name.toLowerCase().split(".");
  const extension = parts.length > 1 ? `.${parts.pop()}` : "";
  const base = parts.join(".").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset";
  return `${base}${extension}`;
}

function validateFile(file: File) {
  const isImage = imageTypes.includes(file.type);
  const isVideo = videoTypes.includes(file.type);
  if (!isImage && !isVideo) return "Format tidak didukung. Gunakan JPG, PNG, WebP, MP4, atau WebM.";
  if (isImage && file.size > 10 * MB) return `${file.name} melebihi batas foto 10 MB.`;
  if (isVideo && file.size > 100 * MB) return `${file.name} melebihi batas video 100 MB.`;
  return "";
}

async function hashFile(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function imageDimensions(file: File) {
  if (!imageTypes.includes(file.type)) return { width: null, height: null };
  try {
    const bitmap = await createImageBitmap(file);
    const value = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return value;
  } catch {
    return { width: null, height: null };
  }
}

async function optimizeImage(file: File) {
  if (!imageTypes.includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

async function createVideoThumbnail(file: File) {
  return new Promise<Blob | null>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (blob: Blob | null) => { URL.revokeObjectURL(url); resolve(blob); };
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    video.onloadeddata = () => { video.currentTime = Math.min(0.2, Math.max(0, video.duration / 3)); };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(finish, "image/jpeg", 0.78);
    };
    video.onerror = () => finish(null);
  });
}

function usageName(row: UsageRow, prefix: string) {
  return `${prefix}: ${String(row.nama || row.nama_kategori || row.nama_store || row.headline || row.title || row.page_key || "Konten")}`;
}

function valueUsesUrl(value: unknown, url: string): boolean {
  if (value === url) return true;
  if (Array.isArray(value)) return value.some((item) => valueUsesUrl(item, url));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => valueUsesUrl(item, url));
  }
  return false;
}

function rowUsesUrl(row: UsageRow, url: string) {
  return Object.values(row).some((value) => valueUsesUrl(value, url));
}

export function MediaLibraryPanel() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folder, setFolder] = useState("products");
  const [folderFilter, setFolderFilter] = useState("Semua");
  const [tagFilter, setTagFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Partial<MediaAsset>>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  async function deriveUsages(mediaAssets: MediaAsset[]) {
    const supabase = createSupabaseClient();
    if (!supabase) return mediaAssets;
    const sources = [
      ["products", "id,nama,image_url,gambar_url,gallery_urls,og_image_url", "Product"],
      ["service_categories", "id,nama_kategori,gambar_url,gallery_urls,og_image_url", "Category"],
      ["services", "id,nama,image_url", "Service"],
      ["hero_banners", "id,headline,image_url,mobile_image_url", "Hero Landing"],
      ["instagram_banners", "id,title,image_url,mobile_image_url", "Banner"],
      ["page_heroes", "id,page_key,title,image_url,mobile_image_url", "Page Hero"],
      ["stores", "id,nama_store,image_url", "Store"],
      ["homepage_section_items", "id,custom_title,custom_image_url,custom_mobile_image_url", "Homepage Item"],
      ["landing_sections", "id,title,desktop_image_url,mobile_image_url,video_url", "Landing Section"],
      ["cms_banners", "id,name,desktop_media_url,mobile_media_url,poster_url", "Campaign Banner"],
      ["trust_about_content", "id,image_url,mobile_image_url,video_url", "Tentang"],
      ["website_settings", "id,label,value", "Pengaturan Website"]
    ] as const;
    const results = await Promise.all(sources.map(async ([table, select, prefix]) => {
      const result = await supabase.from(table).select(select);
      return { rows: (result.data || []) as unknown as UsageRow[], prefix };
    }));
    return mediaAssets.map((asset) => {
      const usages = results.flatMap(({ rows, prefix }) => rows.filter((row) => rowUsesUrl(row, asset.public_url)).map((row) => usageName(row, prefix)));
      return { ...asset, used_by: Array.from(new Set([...(asset.used_by || []), ...usages])) };
    });
  }

  async function loadAssets() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const slowTimer = window.setTimeout(() => setStatus("Supabase sedang merespons. Media tetap dimuat..."), 900);
    const { data, error } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
    window.clearTimeout(slowTimer);
    setLoading(false);
    if (error) {
      setStatus("Pustaka media belum dapat dimuat. Coba lagi.");
      return;
    }
    const withUsages = await deriveUsages((data || []) as MediaAsset[]);
    setAssets(withUsages);
    setEditing(Object.fromEntries(withUsages.map((asset) => [asset.id, { alt_text: asset.alt_text || "", tags: asset.tags || [], folder: asset.folder }])));
    setStatus("");
  }

  // Initial load only; user actions call loadAssets after each mutation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAssets(); }, []);

  const availableFolders = useMemo(() => {
    const legacyFolders = assets
      .map((asset) => asset.folder)
      .filter((item) => item && !folders.includes(item))
      .sort();

    return [...folders, ...Array.from(new Set(legacyFolders))];
  }, [assets]);
  const availableTags = useMemo(() => Array.from(new Set(assets.flatMap((asset) => asset.tags || []))).sort(), [assets]);
  const visibleAssets = useMemo(() => assets.filter((asset) => {
    const needle = query.trim().toLowerCase();
    const searchable = `${asset.name} ${asset.folder} ${asset.alt_text || ""} ${(asset.tags || []).join(" ")}`.toLowerCase();
    return (!needle || searchable.includes(needle))
      && (folderFilter === "Semua" || asset.folder === folderFilter)
      && (!tagFilter || (asset.tags || []).includes(tagFilter))
      && (typeFilter === "Semua" || asset.media_type === typeFilter);
  }), [assets, folderFilter, query, tagFilter, typeFilter]);

  async function replaceWithFile(asset: MediaAsset, originalFile: File) {
    const supabase = createSupabaseClient();
    if (!supabase) return false;
    const file = await optimizeImage(originalFile);
    const dimensions = await imageDimensions(file);
    const hash = await hashFile(originalFile);
    const bucket = asset.bucket_id || WEBSITE_IMAGES_BUCKET;
    const { error } = await supabase.storage.from(bucket).upload(asset.storage_path, file, { contentType: file.type, cacheControl: "0", upsert: true });
    if (error) {
      setStatus("Media belum dapat diganti. File lama tetap aman.");
      return false;
    }
    const { error: updateError } = await supabase.from("media_assets").update({
      name: originalFile.name,
      mime_type: file.type,
      media_type: imageTypes.includes(file.type) ? "image" : "video",
      size_bytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      content_hash: hash,
      updated_at: new Date().toISOString()
    }).eq("id", asset.id);
    if (updateError) setStatus(`File terganti, tetapi metadata gagal diperbarui: ${updateError.message}`);
    return !updateError;
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    if (files.length > 20) { setStatus("Maksimal 20 file dalam satu kali upload."); return; }
    const invalid = files.map(validateFile).find(Boolean);
    if (invalid) { setStatus(invalid); return; }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    setUploading(true);
    setProgress(0);

    for (let index = 0; index < files.length; index += 1) {
      const originalFile = files[index];
      setStatus(`Memproses ${originalFile.name}...`);
      const hash = await hashFile(originalFile);
      const { data: duplicate } = await supabase.from("media_assets").select("*").eq("content_hash", hash).limit(1).maybeSingle();
      if (duplicate) {
        const choice = window.prompt(`File ${originalFile.name} sama dengan ${duplicate.name}. Ketik: reuse, replace, atau new.`, "reuse")?.toLowerCase();
        if (!choice || choice === "reuse") {
          setProgress(Math.round(((index + 1) / files.length) * 100));
          continue;
        }
        if (choice === "replace") {
          await replaceWithFile(duplicate as MediaAsset, originalFile);
          setProgress(Math.round(((index + 1) / files.length) * 100));
          continue;
        }
      }

      const file = await optimizeImage(originalFile);
      const mediaType = imageTypes.includes(file.type) ? "image" : "video";
      const storageFolder = folder;
      const path = `${slugFolder(storageFolder)}/${Date.now()}-${index}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(WEBSITE_IMAGES_BUCKET).upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) { setStatus(`File ${file.name} belum dapat diunggah. Periksa file lalu coba lagi.`); setUploading(false); return; }
      const publicUrl = supabase.storage.from(WEBSITE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
      const dimensions = await imageDimensions(file);
      let thumbnailUrl: string | null = null;
      if (mediaType === "video") {
        const thumbnail = await createVideoThumbnail(file);
        if (thumbnail) {
          const thumbnailPath = path.replace(/\.[^.]+$/, "-thumbnail.jpg");
          const result = await supabase.storage.from(WEBSITE_IMAGES_BUCKET).upload(thumbnailPath, thumbnail, { cacheControl: "3600", contentType: "image/jpeg", upsert: true });
          if (!result.error) thumbnailUrl = supabase.storage.from(WEBSITE_IMAGES_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
        }
      }
      const { error: insertError } = await supabase.from("media_assets").insert({
        name: originalFile.name,
        bucket_id: WEBSITE_IMAGES_BUCKET,
        storage_path: path,
        public_url: publicUrl,
        media_type: mediaType,
        mime_type: file.type,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        alt_text: originalFile.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        tags: [],
        content_hash: hash,
        folder: storageFolder,
        thumbnail_url: thumbnailUrl,
        uploaded_by: sessionData.session?.user.id || null
      });
      if (insertError) {
        await supabase.storage.from(WEBSITE_IMAGES_BUCKET).remove([path]);
        setStatus(`Pencatatan ${file.name} gagal: ${insertError.message}`);
        setUploading(false);
        return;
      }
      setProgress(Math.round(((index + 1) / files.length) * 100));
    }

    setUploading(false);
    setStatus(`${files.length} file selesai diproses.`);
    if (inputRef.current) inputRef.current.value = "";
    await loadAssets();
  }

  async function replaceAsset(asset: MediaAsset, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const errorMessage = validateFile(file);
    if (errorMessage) { setStatus(errorMessage); return; }
    setStatus(`Mengganti ${asset.name} secara global...`);
    const success = await replaceWithFile(asset, file);
    if (success) setStatus("Media diganti. Semua konten tetap memakai URL media yang sama.");
    await loadAssets();
  }

  async function saveMetadata(asset: MediaAsset) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const draft = editing[asset.id] || {};
    const { error } = await supabase.from("media_assets").update({ alt_text: draft.alt_text || "", tags: draft.tags || [], folder: draft.folder || "products", updated_at: new Date().toISOString() }).eq("id", asset.id);
    setStatus(error ? "Informasi media belum dapat disimpan. Coba lagi." : "Informasi media tersimpan.");
    if (!error) await loadAssets();
  }

  async function deleteAsset(asset: MediaAsset) {
    const usages = asset.used_by || [];
    if (usages.length) {
      setStatus(`Media tidak dapat dihapus karena masih digunakan di: ${usages.join(", ")}. Ganti referensinya terlebih dahulu.`);
      return;
    }
    if (!window.confirm("Hapus media ini secara permanen?")) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const bucket = asset.bucket_id || WEBSITE_IMAGES_BUCKET;
    const paths = [asset.storage_path];
    const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
    if (storageError) { setStatus(`Media belum dapat dihapus: ${storageError.message}`); return; }
    const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
    setStatus(error ? "Media belum dapat dihapus. Coba lagi." : "Media dihapus.");
    if (!error) await loadAssets();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setStatus("URL media disalin.");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    uploadFiles(event.dataTransfer.files);
  }

  return (
    <div className="mt-6 grid gap-5">
      <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="border border-dashed border-brand-green/40 bg-white p-6 text-center sm:p-8">
        <p className="text-lg font-semibold">Tarik foto atau video ke sini</p>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Unggah sekali, lalu pilih aset yang sama dari editor produk, kategori, gambar utama, atau banner.</p>
        <div className="mx-auto mt-5 flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <select value={folder} onChange={(event) => setFolder(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm font-semibold">{availableFolders.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-brand-green px-6 text-sm font-semibold text-white">{uploading ? "Mengupload..." : "Pilih File"}<input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" disabled={uploading} onChange={(event) => event.target.files && uploadFiles(event.target.files)} /></label>
        </div>
        {uploading || progress > 0 ? <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-brand-softGray"><div className="h-full bg-brand-green transition-all" style={{ width: `${progress}%` }} /></div> : null}
      </div>

      {status ? <p role="status" className="border border-brand-softGray bg-white p-4 text-sm font-semibold">{status}</p> : null}

      <div className="grid gap-3 bg-white p-4 md:grid-cols-4">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari filename, folder, tag, atau alt text..." className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm outline-none focus:border-brand-green" />
        <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm font-semibold"><option>Semua</option>{availableFolders.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="">Semua tag</option>{availableTags.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="Semua">Semua tipe</option><option value="image">Foto</option><option value="video">Video</option></select>
      </div>

      {loading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="aspect-square animate-pulse bg-white" />)}</div> : visibleAssets.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleAssets.map((asset) => {
            const draft = editing[asset.id] || {};
            return <article key={asset.id} className="border border-brand-softGray bg-white p-4">
              {asset.media_type === "video" ? <video src={asset.public_url} muted playsInline preload="metadata" controls poster={asset.thumbnail_url || undefined} className="aspect-video w-full bg-brand-offWhite object-cover" /> : <img src={asset.public_url} alt={asset.alt_text || asset.name} loading="lazy" onError={(event) => { event.currentTarget.src = "/brand/debroder/open-graph-logo.png"; }} className="aspect-video w-full bg-brand-offWhite object-cover" />}
              <h3 className="mt-3 truncate text-sm font-semibold" title={asset.name}>{asset.name}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-brand-charcoal/55"><div><dt className="font-semibold">Dimensi</dt><dd>{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "—"}</dd></div><div><dt className="font-semibold">Ukuran</dt><dd>{readableSize(asset.size_bytes)}</dd></div><div><dt className="font-semibold">Diunggah</dt><dd>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(asset.created_at))}</dd></div><div><dt className="font-semibold">Tipe</dt><dd>{asset.mime_type}</dd></div></dl>
              <div className="mt-3 grid gap-2">
                <input aria-label={`Alt text ${asset.name}`} value={String(draft.alt_text || "")} onChange={(event) => setEditing((current) => ({ ...current, [asset.id]: { ...current[asset.id], alt_text: event.target.value } }))} placeholder="Alt text" className="min-h-10 rounded-lg border border-brand-softGray px-3 text-xs" />
                <input aria-label={`Tags ${asset.name}`} value={(draft.tags || []).join(", ")} onChange={(event) => setEditing((current) => ({ ...current, [asset.id]: { ...current[asset.id], tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } }))} placeholder="tag, dipisahkan koma" className="min-h-10 rounded-lg border border-brand-softGray px-3 text-xs" />
                <select aria-label={`Folder ${asset.name}`} value={String(draft.folder || asset.folder)} onChange={(event) => setEditing((current) => ({ ...current, [asset.id]: { ...current[asset.id], folder: event.target.value } }))} className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-xs font-semibold">{availableFolders.map((item) => <option key={item}>{item}</option>)}</select>
              </div>
              <div className={`mt-3 rounded-lg p-3 text-xs ${asset.used_by?.length ? "bg-amber-50 text-amber-900" : "bg-brand-offWhite text-brand-charcoal/55"}`}><p className="font-semibold">Used In</p><p className="mt-1 leading-5">{asset.used_by?.length ? asset.used_by.join(", ") : "Belum digunakan"}</p></div>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => saveMetadata(asset)} className="rounded-full bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white">Simpan metadata</button><button type="button" onClick={() => copyUrl(asset.public_url)} className="rounded-full border border-brand-softGray px-3 py-2 text-xs font-semibold">Salin URL</button><label className="cursor-pointer rounded-full border border-brand-softGray px-3 py-2 text-xs font-semibold">Replace<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,.mov" onChange={(event) => replaceAsset(asset, event)} /></label><button type="button" onClick={() => deleteAsset(asset)} className="rounded-full px-3 py-2 text-xs font-semibold text-red-700">Hapus</button></div>
            </article>;
          })}
        </div>
      ) : <div className="bg-white p-8 text-center"><p className="text-lg font-semibold">Tidak ada media</p><p className="mt-2 text-sm text-brand-charcoal/60">Unggah file pertama atau ubah filter pencarian.</p></div>}
    </div>
  );
}

function slugFolder(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gallery";
}

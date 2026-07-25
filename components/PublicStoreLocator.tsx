"use client";

import { useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages, getStoreImage } from "@/lib/fallback-data";
import type { Store } from "@/lib/types";
import { whatsappLinkWithMessage } from "@/lib/url";

function storeKey(store: Store, index: number) {
  return store.id || `${store.nama_store}-${index}`;
}

export function PublicStoreLocator({ stores }: { stores: Store[] }) {
  const visibleStores = stores.filter((store) => store.status_aktif !== false);
  const [activeKey, setActiveKey] = useState(() => visibleStores[0] ? storeKey(visibleStores[0], 0) : "");
  const activeIndex = Math.max(0, visibleStores.findIndex((store, index) => storeKey(store, index) === activeKey));
  const activeStore = visibleStores[activeIndex];

  if (!activeStore) return null;

  const whatsappHref = whatsappLinkWithMessage(
    activeStore.whatsapp_link || activeStore.whatsapp,
    `Halo DEBRODER, saya ingin bertanya tentang toko ${activeStore.nama_store}.`
  );

  return (
    <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <div aria-label="Daftar toko DEBRODER">
        {visibleStores.map((store, index) => {
          const key = storeKey(store, index);
          const isActive = key === storeKey(activeStore, activeIndex);

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              aria-controls="active-store-visual"
              onClick={() => setActiveKey(key)}
              className={`public-divider flex w-full items-start justify-between gap-4 border-b py-4 text-left transition first:pt-0 ${isActive ? "text-[#111]" : "text-black/55 hover:text-[#111]"}`}
            >
              <span className="min-w-0">
                <span className="block text-base font-semibold">{store.nama_store}</span>
                <span className="mt-2 block text-sm leading-6">{store.alamat}</span>
              </span>
              <span className="mt-1 shrink-0 text-xs font-semibold" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      <div id="active-store-visual" aria-live="polite">
        <SafeImage
          src={getStoreImage(activeStore)}
          fallbackSrc={fallbackImages.store}
          alt={activeStore.image_alt || `Foto ${activeStore.nama_store} DEBRODER`}
          className="aspect-[4/3] w-full object-cover"
          sizes="(min-width: 1024px) 60vw, 100vw"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#111]">{activeStore.nama_store}</p>
            {activeStore.jam_operasional ? <p className="public-muted-copy mt-1 text-xs">{activeStore.jam_operasional}</p> : null}
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            {activeStore.maps_link ? <a href={activeStore.maps_link} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">Lihat Lokasi</a> : null}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  );
}

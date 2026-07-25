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
    <div className="landing-store-locator grid gap-7 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.72fr)] lg:gap-12">
      <div className="landing-store-tabs no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto lg:block" aria-label="Daftar toko DEBRODER">
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
              className={`landing-store-tab public-divider flex min-w-[78vw] snap-start items-start justify-between gap-5 border-b px-0 py-5 text-left transition first:pt-0 sm:min-w-[46vw] lg:min-w-0 lg:w-full ${isActive ? "is-active text-[#111]" : "text-black/50 hover:text-[#111]"}`}
            >
              <span className="min-w-0">
                <span className="landing-store-name block text-lg font-medium tracking-[-0.02em]">{store.nama_store}</span>
                <span className="landing-store-address mt-2 block text-sm leading-6">{store.alamat}</span>
              </span>
              <span className="landing-store-index mt-1 shrink-0 text-xs font-medium" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      <div id="active-store-visual" className="landing-store-visual" aria-live="polite">
        <div className="landing-store-media overflow-hidden bg-[#f5f5f5]">
          <SafeImage
            src={getStoreImage(activeStore)}
            fallbackSrc={fallbackImages.store}
            alt={activeStore.image_alt || `Foto ${activeStore.nama_store} DEBRODER`}
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/10] lg:aspect-[16/9]"
            sizes="(min-width: 1024px) 68vw, 100vw"
          />
        </div>
        <div className="landing-store-meta mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-medium text-[#111]">{activeStore.nama_store}</p>
            {activeStore.jam_operasional ? <p className="public-muted-copy mt-1 text-sm">{activeStore.jam_operasional}</p> : null}
          </div>
          <div className="landing-store-actions flex flex-wrap gap-2">
            {activeStore.maps_link ? <a href={activeStore.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/25 px-5 text-sm font-semibold transition hover:border-black">Lihat Lokasi</a> : null}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-5 text-sm font-semibold text-white transition hover:bg-black/70">WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  );
}

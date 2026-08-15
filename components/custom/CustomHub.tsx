import Link from "next/link";
import { PublicProductCard } from "@/components/PublicProductCard";
import { SafeImage } from "@/components/SafeImage";
import type { CustomCategory } from "@/lib/custom-commerce/types";
import { fallbackImages } from "@/lib/fallback-data";
import type { Product } from "@/lib/types";

const customSteps = [
  "Pilih jalur Custom T-Shirt atau Jersey Custom.",
  "Pilih produk dasar dan kebutuhan utama.",
  "Tentukan jumlah, ukuran, warna, dan layanan.",
  "Unggah materi desain dan tulis catatan produksi.",
  "Periksa ringkasan kebutuhan sebelum dikirim.",
  "DEBRODER meninjau kelayakan dan harga canonical.",
  "Setujui quotation dan proof desain final.",
  "Pesanan diproses melalui order, pembayaran, produksi, dan pelacakan."
] as const;

const faqItems = [
  {
    question: "Apakah harga custom langsung final?",
    answer: "Harga hanya dinyatakan final ketika sistem atau quotation resmi telah memverifikasi seluruh konfigurasi, jumlah, bahan, dan layanan yang dipilih."
  },
  {
    question: "Apakah Jersey Custom memakai form yang sama?",
    answer: "Tidak. Jersey Custom tetap memakai Jersey Configurator agar model, desain, ukuran, nama, dan nomor tim tercatat dalam struktur yang tepat."
  },
  {
    question: "Kapan produksi dimulai?",
    answer: "Produksi mengikuti persetujuan proof final, status pembayaran atau uang muka, serta kesiapan bahan yang tercatat pada pesanan."
  },
  {
    question: "Apakah konsultasi WhatsApp membuat pesanan?",
    answer: "Tidak. WhatsApp adalah jalur bantuan. Pesanan tetap dibuat dan dicatat melalui alur transaksi DEBRODER."
  }
] as const;

function categoryHref(category: CustomCategory) {
  return category.entryType === "jersey_configurator"
    ? category.targetRoute || "/jersey/configurator"
    : `/custom/${category.slug}`;
}

function CategoryPathCard({
  category,
  label
}: {
  category: CustomCategory;
  label: string;
}) {
  return (
    <Link
      href={categoryHref(category)}
      className="group grid overflow-hidden bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#efefef] md:aspect-auto md:min-h-[420px]">
        <SafeImage
          src={category.imageUrl}
          fallbackSrc={fallbackImages.product}
          alt={category.imageAlt || category.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
          sizes="(min-width:768px) 40vw, 100vw"
        />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="public-eyebrow">{label}</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight">{category.name}</h3>
        {category.shortDescription ? (
          <p className="mt-4 text-sm leading-7 text-black/60">{category.shortDescription}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-black/55">
          <span className="rounded-full bg-[#f5f5f5] px-3 py-1.5">{category.minimumOrderDisplay}</span>
          <span className="rounded-full bg-[#f5f5f5] px-3 py-1.5">{category.leadTimeDisplay}</span>
        </div>
        <span className="mt-7 inline-flex min-h-12 w-fit items-center rounded-full bg-black px-6 text-sm font-semibold text-white">
          Mulai konfigurasi
        </span>
      </div>
    </Link>
  );
}

export function CustomHub({
  categories,
  products
}: {
  categories: CustomCategory[];
  products: Product[];
}) {
  if (!categories.length) {
    return (
      <section className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-2xl bg-white p-8 text-center sm:p-10">
          <p className="public-eyebrow">Custom DEBRODER</p>
          <h1 className="mt-3 text-3xl font-semibold">Katalog custom sedang diperbarui</h1>
          <p className="mt-3 text-sm leading-7 text-black/60">
            Kategori akan tampil otomatis setelah konten CMS dipublikasikan dan terhubung ke produk PIM aktif.
          </p>
          <Link href="/koleksi" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-black px-6 text-sm font-semibold text-white">
            Lihat koleksi
          </Link>
        </div>
      </section>
    );
  }

  const jerseyCategory = categories.find((category) => category.entryType === "jersey_configurator");
  const apparelCategory = categories.find((category) => category.entryType !== "jersey_configurator");
  const heroCategory = apparelCategory || jerseyCategory || categories[0];
  const baseProducts = products
    .filter((product) => product.sales_mode === "custom" || product.sales_mode === "both")
    .slice(0, 4);
  const inspirationCategories = categories.slice(0, 4);

  return (
    <div className="custom-experience-v2 bg-white text-[#111]">
      <section className="grid min-h-[min(620px,calc(100svh-60px))] bg-brand-offWhite text-brand-charcoal lg:grid-cols-2">
        <div className="section-shell flex flex-col justify-center py-12 lg:py-16 lg:pr-12">
          <p className="public-eyebrow">Custom DEBRODER</p>
          <h1 className="home-page-title mt-4 max-w-3xl">
            Mulai dari kebutuhanmu.
          </h1>
          <p className="public-secondary-copy mt-5 max-w-xl text-base leading-8 sm:text-lg">
            Pilih jalur yang sesuai. Custom T-Shirt dan Jersey Custom menggunakan konfigurasi, harga, serta alur transaksi canonical yang berbeda.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {apparelCategory ? (
              <Link href={categoryHref(apparelCategory)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                Mulai Custom T-Shirt
              </Link>
            ) : null}
            {jerseyCategory ? (
              <Link href={categoryHref(jerseyCategory)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/20 px-6 text-sm font-semibold text-black transition hover:border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                Buka Jersey Configurator
              </Link>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-[360px] bg-[#efefef] lg:min-h-full">
          <SafeImage
            src={heroCategory.imageUrl}
            fallbackSrc={fallbackImages.pageHero}
            alt={heroCategory.imageAlt || `${heroCategory.name} DEBRODER`}
            fill
            priority
            className="object-cover"
            sizes="(min-width:1024px) 50vw, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>
      </section>

      <section className="bg-[#f5f5f5] py-12 sm:py-16 lg:py-24" aria-labelledby="custom-path-heading">
        <div className="section-shell">
          <p className="public-eyebrow">Pilih jalur</p>
          <h2 id="custom-path-heading" className="public-section-title mt-3">Dua kebutuhan, dua alur yang tepat</h2>
          <div className="mt-8 grid gap-5">
            {apparelCategory ? <CategoryPathCard category={apparelCategory} label="Custom T-Shirt" /> : null}
            {jerseyCategory ? <CategoryPathCard category={jerseyCategory} label="Jersey Custom" /> : null}
          </div>
        </div>
      </section>

      {apparelCategory ? (
        <section className="bg-white py-12 sm:py-16 lg:py-24">
          <div className="section-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="public-eyebrow">Custom T-Shirt</p>
              <h2 className="public-editorial-title mt-3">Produk dasar tetap berasal dari PIM.</h2>
            </div>
            <p className="public-secondary-copy max-w-2xl text-base leading-8">
              Gunakan produk yang memang tersedia untuk mode Custom. Pilihan ukuran, warna, layanan, jumlah, dan harga akan diperiksa lagi dalam builder sebelum pesanan dibuat.
            </p>
          </div>
        </section>
      ) : null}

      {baseProducts.length >= 3 ? (
        <section className="bg-white pb-12 sm:pb-16 lg:pb-24" aria-labelledby="custom-base-products-heading">
          <div className="section-shell">
            <div className="flex items-end justify-between gap-5">
              <h2 id="custom-base-products-heading" className="public-section-title">Pilih produk dasar</h2>
              {apparelCategory ? (
                <Link href={categoryHref(apparelCategory)} className="hidden text-sm font-semibold underline underline-offset-4 sm:inline-flex">Buka semua pilihan</Link>
              ) : null}
            </div>
            <div data-ui-grid="product" className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {baseProducts.map((product) => (
                <PublicProductCard key={product.id || product.slug || product.nama} product={product} imageSizes="(min-width:1024px) 25vw, 50vw" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="keep-section-bg bg-black py-12 text-white sm:py-16 lg:py-24" aria-labelledby="custom-capability-heading">
        <div className="section-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Satu alur transaksi</p>
          <h2 id="custom-capability-heading" className="mt-3 max-w-4xl text-white text-[clamp(2.3rem,5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Dari kebutuhan sampai produksi, setiap keputusan tetap tercatat.
          </h2>
          <div className="mt-10 grid gap-px bg-white/15 md:grid-cols-3">
            {[
              ["Konfigurasi terstruktur", "Jumlah, ukuran, warna, desain, dan layanan disimpan sebagai kebutuhan pesanan."],
              ["Quotation dan proof", "Harga nonstandar serta desain final memerlukan persetujuan sebelum produksi."],
              ["Order sebelum pembayaran", "Pembayaran penuh atau DP memperbarui order yang sama, bukan membuat transaksi baru."]
            ].map(([title, body]) => (
              <article key={title} className="bg-black p-6 sm:p-8">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/60">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {inspirationCategories.length >= 2 ? (
        <section className="bg-[#f5f5f5] py-12 sm:py-16 lg:py-24" aria-labelledby="custom-inspiration-heading">
          <div className="section-shell">
            <p className="public-eyebrow">Inspirasi jalur custom</p>
            <h2 id="custom-inspiration-heading" className="public-section-title mt-3">Pilih format yang sesuai kebutuhan</h2>
            <div className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4">
              {inspirationCategories.map((category) => (
                <Link key={category.id || category.slug} href={categoryHref(category)} className="group w-[78vw] max-w-[380px] shrink-0 snap-start sm:w-[42vw] lg:w-[calc((100%_-_48px)/4)]">
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#efefef]">
                    <SafeImage
                      src={category.imageUrl}
                      fallbackSrc={fallbackImages.product}
                      alt={category.imageAlt || category.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.02]"
                      sizes="(min-width:1024px) 25vw, 78vw"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{category.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white py-12 sm:py-16 lg:py-24" aria-labelledby="custom-process-heading">
        <div className="section-shell">
          <p className="public-eyebrow">Cara order</p>
          <h2 id="custom-process-heading" className="public-section-title mt-3">Delapan langkah yang dapat ditelusuri</h2>
          <ol className="mt-9 grid gap-x-8 gap-y-7 md:grid-cols-2 lg:grid-cols-4">
            {customSteps.map((step, index) => (
              <li key={step} className="border-t border-black/15 pt-4">
                <span className="text-xs font-semibold text-black/45">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-3 text-sm font-medium leading-7">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {jerseyCategory ? (
        <section className="bg-[#063d24] py-12 text-white sm:py-16 lg:py-24">
          <div className="section-shell flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Jersey Custom</p>
              <h2 className="mt-3 max-w-4xl text-[clamp(2.5rem,5vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
                Konfigurasi tim membutuhkan jalur khusus.
              </h2>
            </div>
            <Link href={categoryHref(jerseyCategory)} className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-white px-6 text-sm font-semibold text-[#063d24]">
              Buka Jersey Configurator
            </Link>
          </div>
        </section>
      ) : null}

      <section className="bg-[#f5f5f5] py-12 sm:py-16 lg:py-24" aria-labelledby="custom-faq-heading">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="public-eyebrow">FAQ</p>
            <h2 id="custom-faq-heading" className="public-section-title mt-3">Hal penting sebelum mulai</h2>
          </div>
          <div>
            {faqItems.map((item) => (
              <details key={item.question} className="group border-b border-black/15">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 font-semibold marker:hidden">
                  {item.question}
                  <span aria-hidden="true" className="text-xl transition group-open:rotate-45">+</span>
                </summary>
                <p className="pb-6 text-sm leading-7 text-black/60">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 text-center sm:py-20 lg:py-28">
        <div className="section-shell">
          <h2 className="mx-auto max-w-5xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.045em]">
            Siap memulai kebutuhan custom?
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {apparelCategory ? (
              <Link href={categoryHref(apparelCategory)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">
                Mulai Custom T-Shirt
              </Link>
            ) : null}
            <Link href="/help" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/20 px-6 text-sm font-semibold">
              Baca pusat bantuan
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

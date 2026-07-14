function ProductSkeleton({ desktopOnly = false }: { desktopOnly?: boolean }) {
  return (
    <div className={`${desktopOnly ? "hidden lg:block" : ""} animate-pulse`}>
      <div className="aspect-[4/5] w-full bg-brand-charcoal/5" />
      <div className="mt-3 h-3 w-2/3 bg-brand-charcoal/5" />
      <div className="mt-3 h-5 w-full bg-brand-charcoal/5" />
      <div className="mt-2 h-10 w-full bg-brand-charcoal/5" />
      <div className="mt-2 h-5 w-1/2 bg-brand-charcoal/5" />
    </div>
  );
}

export default function KaosPolosLoading() {
  return (
    <main className="min-h-screen bg-brand-offWhite" aria-busy="true" aria-label="Memuat katalog Kaos Polos">
      <div className="aspect-[4/5] w-full animate-pulse bg-brand-charcoal/5 sm:aspect-[16/5] sm:min-h-[260px] lg:aspect-[16/4.5]" />
      <section className="section-shell py-7">
        <div className="h-8 w-72 max-w-full animate-pulse bg-brand-charcoal/5" />
        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className={`${index === 0 ? "col-span-2 lg:col-span-1" : ""} h-10 animate-pulse bg-brand-charcoal/5`} />)}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          {Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} desktopOnly={index >= 4} />)}
        </div>
      </section>
    </main>
  );
}

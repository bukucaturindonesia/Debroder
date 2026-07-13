export default function JerseyShopLoading() {
  return (
    <main className="min-h-screen bg-white text-black" aria-busy="true" aria-label="Memuat katalog Jersey">
      <div className="h-14 border-b border-black/10" />
      <header className="section-shell py-10 sm:py-14">
        <div className="h-3 w-32 animate-pulse bg-black/10 motion-reduce:animate-none" />
        <div className="mt-4 h-12 w-3/4 max-w-xl animate-pulse bg-black/10 motion-reduce:animate-none sm:h-16" />
      </header>
      <div className="h-14 border-y border-black/10 bg-white" />
      <section className="section-shell grid grid-cols-2 gap-x-3 gap-y-10 py-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-6">
        {Array.from({ length: 9 }).map((_, index) => (
          <article key={index}>
            <div className="aspect-[4/5] animate-pulse bg-black/[0.06] motion-reduce:animate-none" />
            <div className="mt-4 h-3 w-1/3 animate-pulse bg-black/10 motion-reduce:animate-none" />
            <div className="mt-2 h-5 w-4/5 animate-pulse bg-black/10 motion-reduce:animate-none" />
            <div className="mt-2 h-4 w-1/2 animate-pulse bg-black/10 motion-reduce:animate-none" />
          </article>
        ))}
      </section>
    </main>
  );
}

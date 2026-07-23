export default function Loading() {
  return (
    <main className="min-h-screen bg-white" aria-label="Memuat detail produk">
      <div className="section-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:gap-14">
        <div className="aspect-[4/5] animate-pulse bg-black/[0.06] motion-reduce:animate-none" />
        <div className="space-y-4 pt-4">
          <div className="h-4 w-32 animate-pulse bg-black/10 motion-reduce:animate-none" />
          <div className="h-10 w-3/4 animate-pulse bg-black/10 motion-reduce:animate-none" />
          <div className="h-6 w-40 animate-pulse bg-black/10 motion-reduce:animate-none" />
          <div className="h-40 animate-pulse bg-black/[0.06] motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}

export default function JerseyLoading() {
  return (
    <main className="min-h-screen bg-[#050505] text-white" aria-busy="true" aria-label="Memuat halaman Jersey">
      <div className="h-14 bg-[#0a0a0a] md:h-16" />
      <div className="aspect-[4/5] w-full animate-pulse bg-[#101010] motion-reduce:animate-none md:aspect-[16/7]" />
      <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 md:py-14">
        <div className="mx-auto h-4 w-28 animate-pulse bg-[#101010] motion-reduce:animate-none" />
        <div className="mx-auto mt-5 h-12 w-4/5 animate-pulse bg-[#101010] motion-reduce:animate-none md:h-16" />
        <div className="mx-auto mt-5 h-5 w-3/5 animate-pulse bg-[#101010] motion-reduce:animate-none" />
      </div>
      <section className="overflow-hidden py-14" aria-hidden="true">
        <div className="mx-4 h-10 w-2/3 animate-pulse bg-[#101010] motion-reduce:animate-none sm:mx-6 md:mx-10 md:w-1/3" />
        <div className="mt-7 flex gap-3 overflow-hidden px-4 sm:px-6 md:px-10">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/5] w-[78vw] shrink-0 animate-pulse bg-[#101010] motion-reduce:animate-none md:w-[29vw]" />
          ))}
        </div>
      </section>
    </main>
  );
}

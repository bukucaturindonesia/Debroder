export default function Loading() {
  return (
    <main className="min-h-screen bg-brand-offWhite text-brand-charcoal">
      <div className="section-shell py-10">
        <div className="rounded-[32px] border border-brand-softGray bg-white p-6 shadow-soft sm:p-10">
          <div className="h-4 w-36 animate-pulse rounded-full bg-brand-softGray" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded-2xl bg-brand-softGray" />
          <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded-full bg-brand-softGray" />
          <div className="mt-2 h-5 w-2/3 animate-pulse rounded-full bg-brand-softGray" />
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-[var(--ink)] uppercase">Prep / Kit</Link>
        <Link href="/sign-in" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">Sign in</Link>
      </nav>
      <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-6 text-sm font-semibold tracking-[0.22em] text-[var(--accent)] uppercase">Interview preparation, made concrete</p>
          <h1 className="max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-7xl">Turn the job description into your next good conversation.</h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[var(--muted)]">Prep / Kit researches the role and company, then shapes the work into questions, flashcards, and a plan you can actually finish.</p>
          <Link href="/sign-in" className="mt-10 inline-flex rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]">Start preparing</Link>
        </div>
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--ink)] p-8 text-white shadow-2xl shadow-[var(--ink)]/15 sm:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[24px] border-[var(--accent)]/80" />
          <p className="relative text-sm font-semibold tracking-[0.18em] text-[var(--accent-light)] uppercase">Your preparation kit</p>
          <div className="relative mt-12 space-y-5">
            {["Company brief", "Role breakdown", "Questions by category", "A day-by-day schedule"].map((item, index) => (
              <div key={item} className="flex items-center gap-4 border-t border-white/15 pt-4"><span className="text-sm text-[var(--accent-light)]">0{index + 1}</span><span className="text-lg">{item}</span></div>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-[var(--line)] py-5 text-sm text-[var(--muted)]">A focused workspace for thoughtful preparation.</footer>
    </main>
  );
}

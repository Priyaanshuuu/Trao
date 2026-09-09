import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authenticatedBackendFetch } from "@/lib/backend-auth";

type KitSummary = {
  id: string;
  companyUrl: string;
  requestedDays: number;
  status: "pending" | "running" | "completed" | "failed";
  error: { message: string } | null;
  createdAt: string;
};

async function createKit(formData: FormData) {
  "use server";
  const response = await authenticatedBackendFetch("/api/kits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jobDescription: formData.get("jobDescription"),
      companyUrl: formData.get("companyUrl"),
      days: formData.get("days"),
    }),
  });
  if (response.ok) redirect("/dashboard");
  redirect(`/dashboard?error=${encodeURIComponent("We could not create that kit. Check the fields and try again.")}`);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const response = await authenticatedBackendFetch("/api/kits");
  const body = response.ok ? await response.json() as { kits: KitSummary[] } : { kits: [] };
  const kits = body.kits ?? [];
  const { error } = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <header className="flex items-center justify-between border-b border-[var(--line)] pb-6">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--ink)] uppercase">Prep / Kit</p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]" type="submit">Sign out</button></form>
      </header>
      <section className="grid gap-12 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">Your workspace</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Build a kit for the conversation ahead.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">Start with the role, the company, and the time you have. Your preparation stays organized from first research to final practice.</p>
          <p className="mt-8 text-sm text-[var(--muted)]">Signed in as {session.user.email ?? session.user.name ?? "your GitHub account"}.</p>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white/55 p-7 sm:p-9">
          <div className="flex items-baseline justify-between gap-4">
            <div><p className="text-sm font-semibold tracking-[0.15em] text-[var(--accent)] uppercase">New kit</p><h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Make the preparation specific.</h2></div>
            <span className="text-sm text-[var(--muted)]">01</span>
          </div>
          {error && <p className="mt-5 border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--accent)]">{error}</p>}
          <form action={createKit} className="mt-8 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Job description</span><textarea required minLength={20} maxLength={50000} name="jobDescription" rows={7} placeholder="Paste the complete job description" className="w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]" /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Company website</span><input required type="url" name="companyUrl" placeholder="https://company.com" className="w-full rounded-full border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]" /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Days until interview</span><input required type="number" name="days" min={1} max={60} defaultValue={7} className="w-32 rounded-full border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]" /></label>
            <button type="submit" className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]">Create preparation kit</button>
          </form>
        </div>
      </section>

      <section className="border-t border-[var(--line)] py-12">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-[0.15em] text-[var(--accent)] uppercase">Saved kits</p><h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">Your preparation in progress.</h2></div><span className="text-sm text-[var(--muted)]">{kits.length} {kits.length === 1 ? "kit" : "kits"}</span></div>
        {kits.length === 0 ? <p className="mt-8 text-[var(--muted)]">Your first kit will appear here after you create it.</p> : <div className="mt-8 grid gap-4 md:grid-cols-2">{kits.map((kit) => <Link key={kit.id} href={`/dashboard/${kit.id}`} className="group rounded-2xl border border-[var(--line)] bg-white/40 p-5 transition hover:border-[var(--accent)]"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-[var(--ink)]">{new URL(kit.companyUrl).hostname}</p><p className="mt-1 text-sm text-[var(--muted)]">{kit.requestedDays} days to prepare</p></div><span className="text-xs font-semibold tracking-[0.12em] text-[var(--accent)] uppercase">{kit.status}</span></div><p className="mt-6 text-sm text-[var(--muted)]">{kit.error?.message ?? "Open kit details"} <span className="text-[var(--accent)] transition group-hover:ml-1">-&gt;</span></p></Link>)}</div>}
      </section>
    </main>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authenticatedBackendFetch } from "@/lib/backend-auth";

type KitRecord = {
  id: string;
  companyUrl: string;
  requestedDays: number;
  status: "pending" | "running" | "completed" | "failed";
  error: { message: string } | null;
  kit: {
    roleBreakdown: { title: string; seniority: string; responsibilities: string[] };
    requirements: Array<{ id: string; text: string; priority: string }>;
    questions: Array<{ id: string; prompt: string; category: string; difficulty: number }>;
    schedule: Array<{ day: number; focus: string; minutes: number }>;
  } | null;
};

export default async function KitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const { id } = await params;
  const response = await authenticatedBackendFetch(`/api/kits/${encodeURIComponent(id)}`);
  if (!response.ok) redirect("/dashboard");
  const { kit } = await response.json() as { kit: KitRecord };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <Link href="/dashboard" className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]">&lt;- Back to workspace</Link>
      <header className="border-b border-[var(--line)] pb-10 pt-14"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">Preparation kit</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{new URL(kit.companyUrl).hostname}</h1><p className="mt-3 text-[var(--muted)]">{kit.requestedDays} days available</p></div><span className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--accent)] uppercase">{kit.status}</span></div></header>
      {kit.status !== "completed" || !kit.kit ? <section className="py-20"><h2 className="text-3xl font-semibold text-[var(--ink)]">Your kit is {kit.status === "failed" ? "waiting for another attempt" : "being prepared"}.</h2><p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">{kit.error?.message ?? "The generation pipeline will fill this workspace with your company brief, role breakdown, questions, flashcards, and schedule."}</p></section> : <section className="grid gap-5 py-12 md:grid-cols-2"><div className="rounded-2xl bg-[var(--ink)] p-7 text-white md:col-span-2"><p className="text-sm font-semibold tracking-[0.16em] text-[var(--accent-light)] uppercase">Role</p><h2 className="mt-3 text-3xl font-semibold">{kit.kit.roleBreakdown.title}</h2><p className="mt-2 text-white/65">{kit.kit.roleBreakdown.seniority}</p></div><div className="rounded-2xl border border-[var(--line)] p-7"><p className="text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">Requirements</p><ul className="mt-5 space-y-3">{kit.kit.requirements.map((requirement) => <li key={requirement.id} className="flex gap-3 text-sm text-[var(--ink)]"><span className="text-[var(--accent)]">/</span>{requirement.text}<span className="ml-auto text-xs text-[var(--muted)]">{requirement.priority}</span></li>)}</ul></div><div className="rounded-2xl border border-[var(--line)] p-7"><p className="text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">Questions</p><p className="mt-5 text-5xl font-semibold text-[var(--ink)]">{kit.kit.questions.length}</p><p className="mt-2 text-sm text-[var(--muted)]">organized prompts ready to practice</p></div><div className="rounded-2xl border border-[var(--line)] p-7 md:col-span-2"><p className="text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">Schedule</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{kit.kit.schedule.map((day) => <div key={day.day} className="border-t border-[var(--line)] pt-3"><p className="text-xs font-semibold text-[var(--accent)] uppercase">Day {day.day}</p><p className="mt-2 text-sm text-[var(--ink)]">{day.focus}</p><p className="mt-1 text-xs text-[var(--muted)]">{day.minutes} minutes</p></div>)}</div></div></section>}
    </main>
  );
}
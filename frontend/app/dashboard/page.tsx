import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <header className="flex items-center justify-between border-b border-[var(--line)] pb-6">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--ink)] uppercase">Prep / Kit</p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]" type="submit">Sign out</button></form>
      </header>
      <section className="py-20">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">Your workspace</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Ready when you are.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">Your first interview kit will appear here. Kit creation is the next build step.</p>
        <p className="mt-10 text-sm text-[var(--muted)]">Signed in as {session.user.email ?? session.user.name ?? "your GitHub account"}.</p>
      </section>
    </main>
  );
}
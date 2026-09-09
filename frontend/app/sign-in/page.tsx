import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-white/60 p-8 shadow-xl shadow-[var(--ink)]/5 sm:p-10">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">Prep / Kit</p>
        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Keep your preparation in one place.</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">Sign in to create and revisit your interview kits.</p>
        <form className="mt-10" action={async () => { "use server"; await signIn("github", { redirectTo: "/dashboard" }); }}>
          <button className="w-full rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]" type="submit">Continue with GitHub</button>
        </form>
      </div>
    </main>
  );
}
"use client";

import { useMemo, useState } from "react";

type Flashcard = { id: string; question: string; answer: string; requirementIds: string[] };
type Progress = { confidence: number | null; completed: boolean };

export default function PracticePanel({ kitId, flashcards, initialProgress }: { kitId: string; flashcards: Flashcard[]; initialProgress: Record<string, Progress> }) {
  const [progress, setProgress] = useState(initialProgress);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const ordered = useMemo(() => [...flashcards].sort((left, right) => (progress[left.id]?.confidence ?? 0) - (progress[right.id]?.confidence ?? 0)), [flashcards, progress]);
  const card = ordered[index];
  if (!card) return null;

  async function update(values: Partial<Progress>) {
    const next = { ...progress[card.id], ...values };
    setProgress({ ...progress, [card.id]: next });
    await fetch(`/api/practice/${encodeURIComponent(kitId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ flashcardId: card.id, ...values }) });
  }

  return <section className="rounded-[2rem] bg-[var(--ink)] p-7 text-white sm:p-9"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold tracking-[0.16em] text-[var(--accent-light)] uppercase">Practice mode</p><h2 className="mt-2 text-2xl font-semibold">One card at a time.</h2></div><span className="text-sm text-white/60">{index + 1} / {ordered.length}</span></div><div className="mt-8 rounded-2xl bg-white/10 p-6"><p className="text-xl leading-8">{card.question}</p>{revealed && <p className="mt-6 border-t border-white/15 pt-5 leading-7 text-white/70">{card.answer}</p>}</div><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setRevealed(!revealed)} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)]">{revealed ? "Hide answer" : "Reveal answer"}</button>{revealed && [1, 2, 3].map((level) => <button key={level} type="button" onClick={() => update({ confidence: level, completed: true })} className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${progress[card.id]?.confidence === level ? "border-[var(--accent-light)] text-[var(--accent-light)]" : "border-white/25 text-white/75"}`}>Confidence {level}</button>)}<button type="button" onClick={() => { setIndex((index + 1) % ordered.length); setRevealed(false); }} className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white/80">Next card</button></div></section>;
}
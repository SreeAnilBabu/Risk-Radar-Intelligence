import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { AIBriefing } from "../../types/domain";
import { fetchDailyBriefing, submitRiskQuestion } from "./briefing.service";
import { LoadingSkeleton } from "../../components/feedback/LoadingSkeleton";
import { ErrorState } from "../../components/feedback/ErrorState";

export function BriefingPanel() {
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBriefing() {
    try {
      setLoading(true);
      setError(null);
      const nextBriefing = await fetchDailyBriefing();
      setBriefing(nextBriefing);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load briefing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBriefing();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    const response = await submitRiskQuestion(trimmedQuestion);
    setAnswer(response.answer);
    setQuestion("");
  }

  if (loading) {
    return <LoadingSkeleton lines={6} className="h-full" />;
  }

  if (error || !briefing) {
    return <ErrorState message={error ?? "Briefing data is unavailable."} onRetry={() => void loadBriefing()} />;
  }

  return (
    <motion.section
      layout
      className="rounded-md border border-line bg-white shadow-widget overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2 bg-cardHdr text-cardHdrText border-b border-line">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">⚡</span>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">Executive Briefing</p>
            <h2 className="text-[13px] font-bold leading-tight">Daily risk briefing</h2>
          </div>
        </div>
        <span className="rounded border border-cardHdrText/30 px-2 py-0.5 text-[10px] font-semibold">
          {briefing.latencyMs}ms
        </span>
      </header>
      <div className="p-3">
        <p className="text-[12px] leading-6 text-ink">{briefing.narrative}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <BriefingList title="Top risks" items={briefing.topRisks} />
          <BriefingList title="Changes" items={briefing.changesSinceYesterday} />
          <BriefingList title="Actions" items={briefing.recommendedActions} />
        </div>
        <form className="mt-4 flex flex-col gap-2 md:flex-row" onSubmit={handleSubmit}>
          <input
            aria-label="Ask a follow-up question"
            className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2 text-[12px] text-ink placeholder:text-inkDim focus:outline-none focus:border-wkblue"
            placeholder="Ask a follow-up question"
            value={question}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuestion(event.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-wkblue px-4 py-2 text-[12px] font-semibold text-white hover:opacity-95"
          >
            Ask
          </button>
        </form>
        {answer ? (
          <p className="mt-3 rounded border border-risk-blue/30 bg-riskBg-blue p-3 text-[12px] text-ink">{answer}</p>
        ) : null}
      </div>
    </motion.section>
  );
}

function BriefingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border border-line bg-rowAlt p-2.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-inkDim">{title}</p>
      <ul className="mt-1.5 space-y-1.5 text-[12px] text-ink">
        {items.map((item) => (
          <li key={item} className="leading-5">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

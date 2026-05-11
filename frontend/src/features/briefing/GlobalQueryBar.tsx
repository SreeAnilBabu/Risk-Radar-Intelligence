import { useState, type ChangeEvent, type FormEvent } from "react";
import { submitRiskQuestion } from "./briefing.service";
import { useQueryHighlight } from "../../app/state/queryHighlightContext";

export function GlobalQueryBar() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { setHighlight, clearHighlight } = useQueryHighlight();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    setLoading(true);
    const response = await submitRiskQuestion(trimmedQuestion);
    setMessage(response.answer);
    if (response.relatedJurisdictionIds.length > 0) {
      setHighlight(response.relatedJurisdictionIds, response.answer);
    } else {
      clearHighlight();
    }
    setLoading(false);
    setQuestion("");
  }

  return (
    <div className="rounded-md border border-line bg-white shadow-widget p-3">
      <form className="flex flex-col gap-2 md:flex-row" onSubmit={handleSubmit}>
        <input
          aria-label="Global risk query"
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2 text-[12px] text-ink placeholder:text-inkDim focus:outline-none focus:border-wkblue"
          placeholder="Ask RiskRadar a natural-language question"
          value={question}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setQuestion(event.target.value)}
        />
        <button
          type="submit"
          className="rounded border border-wkblue px-4 py-2 text-[12px] font-semibold text-wkblue bg-white hover:bg-riskBg-blue"
        >
          {loading ? "Thinking..." : "Query"}
        </button>
      </form>
      {message ? <p className="mt-2 text-[12px] text-ink">{message}</p> : null}
    </div>
  );
}

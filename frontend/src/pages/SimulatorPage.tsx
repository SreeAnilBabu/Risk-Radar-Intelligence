import { useState, type ChangeEvent } from "react";
import { useSimulation } from "../features/simulator/useSimulation";
import { SimulationComparison } from "../features/simulator/SimulationComparison";
import { ErrorState } from "../components/feedback/ErrorState";

export function SimulatorPage() {
  const [prompt, setPrompt] = useState("Employment filings surge in California and Texas");
  const { result, loading, error, submit } = useSimulation();

  return (
    <div className="px-4 py-3 max-w-[1500px] mx-auto space-y-3">
      <section className="rounded-md border border-line bg-white p-4 shadow-widget">
        <p className="text-[10px] uppercase tracking-wider text-inkDim font-bold">FR-023 nearest-preset fallback</p>
        <h2 className="mt-1 text-[18px] font-extrabold text-ink">What-if risk simulator</h2>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(prompt, ["US-CA", "US-NY", "US-TX"]);
          }}
        >
          <textarea
            aria-label="Scenario prompt"
            className="min-h-28 rounded border border-line bg-white px-3 py-2 text-[12px] text-ink placeholder:text-inkDim focus:outline-none focus:border-wkblue"
            value={prompt}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setPrompt(event.target.value)}
          />
          <button
            type="submit"
            className="w-fit rounded bg-wkblue px-4 py-2 text-[12px] font-semibold text-white hover:opacity-95"
          >
            {loading ? "Running..." : "Run simulation"}
          </button>
        </form>
      </section>
      {error ? <ErrorState message={error} /> : null}
      {result ? <SimulationComparison result={result} /> : null}
    </div>
  );
}

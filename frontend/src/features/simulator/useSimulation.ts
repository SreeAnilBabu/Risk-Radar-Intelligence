import { useState } from "react";
import { postSimulation } from "../../services/endpoints";
import type { SimulationResult } from "../../types/domain";

export function useSimulation() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(prompt: string, baselineJurisdictionIds?: string[]) {
    try {
      setLoading(true);
      setError(null);
      const nextResult = await postSimulation(prompt, baselineJurisdictionIds);
      setResult(nextResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Simulation failed.");
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, submit };
}

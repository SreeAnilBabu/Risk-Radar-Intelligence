/**
 * SmartAIBriefing.tsx — drop-in panel for the BriefingPage that calls the
 * new `/api/ai/matter-briefing` endpoint, renders a multi-paragraph
 * narrative, top risks, recommended actions, and a chart whose type is
 * driven by a natural-language prompt at the top.
 *
 * Chart type detection is keyword-routed locally — no LLM dependency for
 * the chart switch, just for the narrative when an OPENAI_API_KEY is set.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend,
  Line, LineChart,
  Area, AreaChart,
  Pie, PieChart, Cell,
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { getCompletedMap, setCompletedMap } from "../../lib/matterActionStatus";

/** Stable id derived from an AI action's label, scoped under "ai:" so it
 *  never collides with persona-card action ids stored in the same map. */
function aiActionId(label: string): string {
  return "ai:" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

type ChartKind = "bar" | "line" | "area" | "radar" | "pie";

interface SmartBriefingChartPoint {
  label: string;
  value: number;
  benchmark?: number;
}

interface SmartBriefing {
  matterId: string;
  headline: string;
  narrative: string[];
  topRisks: Array<{ label: string; severity: "critical" | "warning" | "stable"; detail: string }>;
  recommendedActions: Array<{ label: string; rationale: string; priority: "P0" | "P1" | "P2" }>;
  chart: { title: string; points: SmartBriefingChartPoint[] };
  metrics: {
    riskScore: number;
    overrunPct: number;
    spend: number;
    budget: number;
    daysOfRunway: number;
    invoiceVelocity14d: number;
    portfolioAvgVelocity: number;
    vendorAnomalyShare: number;
    relatedMatterCount: number;
    relatedMatterTotalSpend: number;
  };
  source: "openai" | "local";
  generatedAt: string;
  latencyMs: number;
}

interface AskResponse {
  matterId: string;
  question: string;
  answer: string;
  source: "openai" | "local";
  latencyMs: number;
}

const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? "http://localhost:3010";

const SEVERITY_COLOR: Record<"critical" | "warning" | "stable", string> = {
  critical: "var(--red)",
  warning: "var(--amber)",
  stable: "var(--green)"
};
const PRIORITY_COLOR: Record<"P0" | "P1" | "P2", string> = {
  P0: "var(--red)",
  P1: "var(--amber)",
  P2: "var(--blue)"
};
const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

/** Keyword → chart kind. Runs on every prompt change; no LLM needed. */
function detectChartKind(prompt: string, current: ChartKind): ChartKind {
  const p = prompt.toLowerCase();
  if (/\b(radar|spider|web|polar)\b/.test(p)) return "radar";
  if (/\b(pie|donut|share|breakdown)\b/.test(p)) return "pie";
  if (/\b(line|trend|over time|series)\b/.test(p)) return "line";
  if (/\b(area|stack(ed)? area|filled)\b/.test(p)) return "area";
  if (/\b(bar|column|histogram|compare)\b/.test(p)) return "bar";
  return current;
}

export interface SmartAIBriefingProps {
  matterId: string;
}

export function SmartAIBriefing({ matterId }: SmartAIBriefingProps) {
  const [data, setData] = useState<SmartBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chart-control state.
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [chartPrompt, setChartPrompt] = useState("");
  // Transient toast that appears for ~2.5s after a successful prompt-driven
  // chart switch, so the user gets visible feedback even when the prompt
  // resolved to the same chart type that's already on screen.
  const [chartToast, setChartToast] = useState<string | null>(null);

  // Q&A state.
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [askHistory, setAskHistory] = useState<AskResponse[]>([]);

  // Persisted checkbox state for AI-generated Recommended Actions. Survives
  // re-fetches of the briefing (which happen on every page load) by hashing
  // the action label into a stable id stored in localStorage under the same
  // namespace used by the persona-driven Recommended Actions card.
  const [aiCompleted, setAiCompleted] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!matterId) return;
    setAiCompleted(getCompletedMap(matterId));
  }, [matterId]);

  function toggleAiAction(id: string) {
    setAiCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      setCompletedMap(matterId, next);
      return next;
    });
  }

  useEffect(() => {
    if (!matterId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/ai/matter-briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matterId })
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((payload) => {
        if (!cancelled) setData(payload?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  const points = data?.chart.points ?? [];

  // Reformat for pie chart (which only takes value).
  const pieData = useMemo(() => points.map((p) => ({ name: p.label, value: p.value })), [points]);

  const chart = useMemo(() => {
    if (points.length === 0) return null;
    const common = { width: "100%", height: 280 } as const;

    if (chartKind === "radar") {
      return (
        <ResponsiveContainer {...common}>
          <RadarChart data={points} outerRadius="75%">
            <PolarGrid />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar name="This matter" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
            <Radar name="Benchmark" dataKey="benchmark" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      );
    }
    if (chartKind === "pie") {
      return (
        <ResponsiveContainer {...common}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={(e: { name: string; value: number }) => `${e.name}: ${e.value}`}>
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (chartKind === "line") {
      return (
        <ResponsiveContainer {...common}>
          <LineChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="value" name="This matter" stroke="#ef4444" strokeWidth={2} />
            <Line type="monotone" dataKey="benchmark" name="Benchmark" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartKind === "area") {
      return (
        <ResponsiveContainer {...common}>
          <AreaChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="value" name="This matter" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} />
            <Area type="monotone" dataKey="benchmark" name="Benchmark" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    // default: bar
    return (
      <ResponsiveContainer {...common}>
        <BarChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" name="This matter" fill="#ef4444" />
          <Bar dataKey="benchmark" name="Benchmark" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    );
  }, [points, pieData, chartKind]);

  function applyChartPrompt(e: React.FormEvent) {
    e.preventDefault();
    const raw = chartPrompt.trim();
    if (!raw) return;
    const next = detectChartKind(raw, chartKind);
    const recognised = next !== chartKind || /\b(bar|column|histogram|line|trend|area|radar|spider|web|polar|pie|donut)\b/i.test(raw);
    setChartKind(next);
    setChartToast(
      recognised
        ? `Switched to ${next.toUpperCase()} chart based on your prompt.`
        : `Couldn't match a chart type — keeping ${chartKind.toUpperCase()}. Try: bar, line, area, radar, pie.`
    );
    setChartPrompt("");
    window.setTimeout(() => setChartToast(null), 2500);
  }

  function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = askInput.trim();
    if (!q || asking) return;
    setAsking(true);
    fetch(`${API_BASE}/api/ai/matter-ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matterId, question: q })
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((payload) => {
        const ans = payload?.data as AskResponse | undefined;
        if (ans) setAskHistory((prev) => [ans, ...prev].slice(0, 5));
        setAskInput("");
      })
      .catch((err) => {
        setAskHistory((prev) => [
          { matterId, question: q, answer: `\u26A0 ${err instanceof Error ? err.message : String(err)}`, source: "local" as const, latencyMs: 0 },
          ...prev
        ].slice(0, 5));
      })
      .finally(() => setAsking(false));
  }

  if (loading) {
    return (
      <div className="bcard">
        <div className="bcard-hdr">🤖 AI Risk Briefing</div>
        <div className="bcard-body" style={{ color: "var(--text-dim)", fontSize: 12 }}>{"Generating briefing from Passport context\u2026"}</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bcard">
        <div className="bcard-hdr">🤖 AI Risk Briefing</div>
        <div className="bcard-body" style={{ color: "var(--red)", fontSize: 12 }}>{error ?? "No briefing available."}</div>
      </div>
    );
  }

  const sourceBadge = data.source === "openai"
    ? { label: "LLM-authored", bg: "rgba(139,92,246,0.15)", fg: "#7c3aed" }
    : { label: "Data-driven", bg: "rgba(59,130,246,0.12)", fg: "#1d4ed8" };

  return (
    <div className="bcard" style={{ marginBottom: 12 }}>
      <div className="bcard-hdr" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>🤖 AI Risk Briefing</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
          background: sourceBadge.bg, color: sourceBadge.fg, letterSpacing: 0.4
        }}>{sourceBadge.label.toUpperCase()}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
          generated in {data.latencyMs} ms
        </span>
      </div>
      <div className="bcard-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Mode explainer — visible only in local (non-LLM) mode */}
        {data.source === "local" && (
          <div style={{
            fontSize: 11, color: "#92400e", background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.35)", borderRadius: 4,
            padding: "6px 10px", lineHeight: 1.45
          }}>
            <strong>Data-driven mode</strong> — narrative, risks, and answers are composed from the live Passport
            context for this matter (real spend, budget, vendor anomalies, invoice velocity, related matters). To
            switch to a true generative LLM, set <code>OPENAI_API_KEY</code> in <code>backend/.env</code> and restart
            the backend; the badge will flip to <em>LLM-authored</em> automatically.
          </div>
        )}

        {/* Headline */}
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{data.headline}</div>

        {/* Narrative paragraphs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--text)", lineHeight: 1.55 }}>
          {data.narrative.map((p, i) => (
            <p key={i} style={{ margin: 0 }}>{p}</p>
          ))}
        </div>

        {/* Top risks */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Top risks</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {data.topRisks.map((r, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: SEVERITY_COLOR[r.severity], flex: "0 0 auto" }} />
                <span style={{ fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: "var(--text-dim)" }}>{"\u00B7"} {r.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Chart with NL prompt */}
        <div style={{ background: "#fafbfd", border: "1px solid var(--border)", borderRadius: 6, padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {data.chart.title}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {(["bar", "line", "area", "radar", "pie"] as ChartKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setChartKind(k)}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                    border: "1px solid var(--border)",
                    background: chartKind === k ? "var(--blue)" : "#fff",
                    color: chartKind === k ? "#fff" : "var(--text)",
                    cursor: "pointer", textTransform: "uppercase"
                  }}
                >{k}</button>
              ))}
            </span>
          </div>
          <form onSubmit={applyChartPrompt} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input
              type="text"
              value={chartPrompt}
              onChange={(e) => setChartPrompt(e.target.value)}
              placeholder={'Try: "show as a spider chart" \u00B7 "switch to pie" \u00B7 "compare as bars" \u00B7 "histogram" \u00B7 "donut"'}
              style={{
                flex: 1, padding: "5px 10px", fontSize: 12,
                border: "1px solid var(--border)", borderRadius: 4, background: "#fff"
              }}
            />
            <button
              type="submit"
              style={{
                padding: "5px 12px", fontSize: 11, fontWeight: 700,
                background: "var(--blue)", color: "#fff",
                border: "none", borderRadius: 4, cursor: "pointer"
              }}
            >Apply</button>
          </form>
          {chartToast && (
            <div role="status" style={{
              fontSize: 11, color: "#1d4ed8", background: "rgba(59,130,246,0.10)",
              border: "1px solid rgba(59,130,246,0.35)", padding: "4px 8px",
              borderRadius: 4, marginBottom: 8
            }}>{chartToast}</div>
          )}
          <div style={{ width: "100%", minHeight: 280 }}>{chart}</div>
        </div>

        {/* Recommended actions */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Recommended actions</span>
            <span style={{ fontSize: 10, fontWeight: 500, fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>
              Check completed items \u2014 saved locally, persists across refresh
            </span>
          </div>
          <div style={{ margin: 0, display: "flex", flexDirection: "column" }}>
            {data.recommendedActions.map((a, i) => {
              const id = aiActionId(a.label);
              const checked = aiCompleted[id] === true;
              return (
                <label
                  key={`${id}-${i}`}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "8px 4px", borderBottom: "1px solid #edf2f7",
                    cursor: "pointer", fontSize: 12, lineHeight: 1.45,
                    textDecoration: checked ? "line-through" : "none",
                    color: checked ? "var(--text-dim)" : "var(--text)"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAiAction(id)}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <span style={{
                    display: "inline-block", padding: "1px 6px", borderRadius: 3,
                    fontSize: 10, fontWeight: 800, color: "#fff",
                    background: PRIORITY_COLOR[a.priority], flexShrink: 0
                  }}>{a.priority}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{a.label}.</span>
                    <span style={{ color: "var(--text-dim)" }}> {a.rationale}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Ask AI */}
        <div style={{ background: "#fafbfd", border: "1px solid var(--border)", borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            💬 Ask AI about this matter
          </div>
          <form onSubmit={askQuestion} style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              placeholder='e.g. "How over budget is this?" or "Who is the vendor and how risky?"'
              style={{
                flex: 1, padding: "6px 10px", fontSize: 12,
                border: "1px solid var(--border)", borderRadius: 4, background: "#fff"
              }}
              disabled={asking}
            />
            <button
              type="submit"
              disabled={asking || !askInput.trim()}
              style={{
                padding: "6px 14px", fontSize: 11, fontWeight: 700,
                background: asking ? "var(--text-dim)" : "var(--blue)", color: "#fff",
                border: "none", borderRadius: 4, cursor: asking ? "wait" : "pointer"
              }}
            >{asking ? "Thinking\u2026" : "Ask"}</button>
          </form>
          {askHistory.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Recent ({askHistory.length})
                </span>
                <button
                  type="button"
                  onClick={() => setAskHistory([])}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid var(--border)", background: "#fff", color: "var(--red)",
                    cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.4
                  }}
                >Clear all</button>
              </div>
              {askHistory.map((h, i) => (
                <div key={i} style={{ fontSize: 12, padding: 8, background: "#fff", border: "1px solid var(--border)", borderRadius: 4, position: "relative" }}>
                  <button
                    type="button"
                    aria-label="Delete this question"
                    title="Delete"
                    onClick={() => setAskHistory((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      fontSize: 14, lineHeight: 1, padding: "2px 6px",
                      border: "none", background: "transparent", color: "var(--text-dim)",
                      cursor: "pointer", borderRadius: 4
                    }}
                  >&times;</button>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 4, paddingRight: 18 }}>
                    Q: {h.question}
                  </div>
                  <div style={{ lineHeight: 1.5 }}>{h.answer}</div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>
                    {h.source === "openai" ? "LLM" : "Data-driven"} {"\u00B7"} {h.latencyMs} ms
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

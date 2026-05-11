/**
 * RiskSignalBars — renders the five canonical signal scores as horizontal
 * progress bars matching the reference design. Each row shows label, status
 * pill, filled bar, numeric score and a one-line "why" explanation pulled
 * from `riskSignals.ts`.
 */
import type { SignalBundle, SignalScore } from "../../lib/riskSignals";

const TONE_FOR: Record<SignalScore["level"], string> = {
  critical: "var(--red)",
  watch: "var(--amber)",
  stable: "var(--green)"
};

const PILL_LABEL: Record<SignalScore["level"], string> = {
  critical: "Critical",
  watch: "Watch",
  stable: "Stable"
};

interface RiskSignalBarsProps {
  bundle: SignalBundle;
  contextLine?: string;
}

export function RiskSignalBars({ bundle, contextLine }: RiskSignalBarsProps) {
  return (
    <div className="signal-bars">
      <table className="signal-bars-tbl">
        <tbody>
          {bundle.signals.map((sig) => {
            const tone = TONE_FOR[sig.level];
            return (
              <tr key={sig.key}>
                <td className="sb-lbl">{sig.label}</td>
                <td className="sb-pill">
                  <span className="sb-pill-tag" style={{ background: tone }}>
                    {PILL_LABEL[sig.level]}
                  </span>
                </td>
                <td className="sb-track-cell">
                  <div className="sb-track">
                    <div
                      className="sb-fill"
                      style={{ width: `${Math.min(100, sig.score)}%`, background: tone }}
                    />
                  </div>
                </td>
                <td className="sb-score" style={{ color: tone }}>
                  {sig.score} / 100
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {contextLine && <div className="sb-context">{contextLine}</div>}
    </div>
  );
}

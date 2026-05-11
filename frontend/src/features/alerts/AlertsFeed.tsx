import type { AlertAction, RiskAlert } from "../../types/domain";

type AlertsFeedProps = {
  alerts: RiskAlert[];
  onAction: (alertId: string, action: AlertAction) => void;
};

export function AlertsFeed({ alerts, onAction }: AlertsFeedProps) {
  const escalated = alerts.filter((alert) => alert.status === "escalated");
  const remainder = alerts.filter((alert) => alert.status !== "escalated");

  return (
    <div className="space-y-3">
      {escalated.length > 0 ? (
        <section className="rounded-md border border-risk-red/40 bg-riskBg-red p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-risk-red">Priority queue</p>
          <div className="mt-2 space-y-2">
            {escalated.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAction={onAction} />
            ))}
          </div>
        </section>
      ) : null}
      <section className="space-y-2">
        {remainder.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onAction={onAction} />
        ))}
      </section>
    </div>
  );
}

function AlertCard({ alert, onAction }: { alert: RiskAlert; onAction: (alertId: string, action: AlertAction) => void }) {
  return (
    <article className="rounded-md border border-line bg-white p-3 shadow-widget">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-inkDim">
        <span className={alert.severity === "critical" ? "text-risk-red" : alert.severity === "high" ? "text-risk-amber" : "text-risk-blue"}>
          {alert.severity}
        </span>
        <span>·</span>
        <span>{alert.type.replaceAll("_", " ")}</span>
        <span>·</span>
        <span>{alert.status}</span>
      </div>
      <p className="mt-2 text-[13px] font-semibold text-ink">{alert.message}</p>
      <p className="mt-1 text-[12px] text-inkDim">{alert.recommendedAction}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onAction(alert.id, "mark_read")}
          className="rounded border border-line bg-white px-3 py-1 text-[11px] font-semibold text-ink hover:bg-rowAlt"
        >
          Mark read
        </button>
        <button
          type="button"
          onClick={() => onAction(alert.id, "snooze")}
          className="rounded border border-line bg-white px-3 py-1 text-[11px] font-semibold text-ink hover:bg-rowAlt"
        >
          Snooze
        </button>
        <button
          type="button"
          onClick={() => onAction(alert.id, "escalate")}
          className="rounded border border-risk-red/40 bg-white px-3 py-1 text-[11px] font-semibold text-risk-red hover:bg-riskBg-red"
        >
          Escalate
        </button>
      </div>
    </article>
  );
}

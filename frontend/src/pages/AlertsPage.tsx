import { useEffect, useState } from "react";
import { listAlerts } from "../services/endpoints";
import { useRefresh } from "../app/state/refreshContext";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { ErrorState } from "../components/feedback/ErrorState";
import { AlertsFeed } from "../features/alerts/AlertsFeed";
import { useAlertActions } from "../features/alerts/useAlertActions";
import type { AlertStatus, RiskAlert, AlertCounters } from "../types/domain";

export function AlertsPage() {
  const { tick } = useRefresh();
  const [filter, setFilter] = useState<AlertStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [counters, setCounters] = useState<AlertCounters>({ unread: 0, snoozed: 0, escalated: 0, total: 0 });
  const { alerts: localAlerts, counters: localCounters, applyAction, replace } = useAlertActions(alerts, counters);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const payload = await listAlerts(filter === "all" ? undefined : filter);
        if (!active) {
          return;
        }

        setAlerts(payload.data);
        setCounters(payload.counters);
        replace(payload.data, payload.counters);
        setError(null);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to load alerts.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [filter, tick, replace]);

  if (loading) {
    return <LoadingSkeleton lines={8} className="h-[520px]" />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="px-4 py-3 max-w-[1500px] mx-auto space-y-3">
      <section className="rounded-md border border-line bg-white p-4 shadow-widget">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-inkDim font-bold">Risk Triage · What needs attention now</p>
            <h2 className="mt-1 text-[18px] font-extrabold text-ink">
              🚨 Risk Triage Center{" "}
              {localCounters.unread > 0 && (
                <span style={{
                  marginLeft: 8, padding: "2px 9px", fontSize: 12, fontWeight: 700,
                  background: "#dc2626", color: "#fff", borderRadius: 999, verticalAlign: "middle"
                }}>{localCounters.unread} need review</span>
              )}
            </h2>
            <p className="mt-1 text-[11.5px] text-inkDim">
              Every risk signal RiskRadar fires lands here. Decide fast — snooze low-impact noise, escalate critical exposure, or jump straight into the matter to act.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] text-ink">
            <Badge label="Unread" value={localCounters.unread} />
            <Badge label="Snoozed" value={localCounters.snoozed} />
            <Badge label="Escalated" value={localCounters.escalated} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["all", "unread", "read", "snoozed", "escalated"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={[
                "rounded h-7 px-3 text-[11px] font-semibold border transition-colors",
                filter === status
                  ? "bg-wkblue text-white border-wkblue"
                  : "bg-white text-ink border-line hover:bg-rowAlt"
              ].join(" ")}
            >
              {status}
            </button>
          ))}
        </div>
      </section>
      <AlertsFeed alerts={localAlerts} onAction={(alertId, action) => void applyAction(alertId, action)} />
    </div>
  );
}

function Badge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded border border-line bg-rowAlt px-2.5 py-1 text-[11px] font-semibold">
      {label}: {value}
    </span>
  );
}

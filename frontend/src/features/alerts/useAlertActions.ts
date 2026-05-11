import { useCallback, useState } from "react";
import { patchAlert } from "../../services/endpoints";
import type { AlertAction, AlertCounters, RiskAlert } from "../../types/domain";

export function useAlertActions(initialAlerts: RiskAlert[], initialCounters: AlertCounters) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [counters, setCounters] = useState(initialCounters);

  const applyAction = useCallback(async (alertId: string, action: AlertAction) => {
    const payload = await patchAlert(alertId, action);
    setAlerts((current) => current.map((alert) => (alert.id === alertId ? payload.data : alert)));
    setCounters(payload.counters);
  }, []);

  const replace = useCallback((nextAlerts: RiskAlert[], nextCounters: AlertCounters) => {
    setAlerts(nextAlerts);
    setCounters(nextCounters);
  }, []);

  return { alerts, counters, applyAction, replace };
}

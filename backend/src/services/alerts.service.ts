import { loadAlerts, replaceAlerts } from "../data/loaders";
import { type AlertAction, type AlertCounters, type AlertStatus, type RiskAlert } from "../types/domain";

function compareAlerts(left: RiskAlert, right: RiskAlert): number {
  if (left.status === "escalated" && right.status !== "escalated") {
    return -1;
  }

  if (left.status !== "escalated" && right.status === "escalated") {
    return 1;
  }

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export function getAlertCounters(alerts: RiskAlert[]): AlertCounters {
  return {
    unread: alerts.filter((alert) => alert.status === "unread").length,
    snoozed: alerts.filter((alert) => alert.status === "snoozed").length,
    escalated: alerts.filter((alert) => alert.status === "escalated").length,
    total: alerts.length
  };
}

function nextStatus(currentStatus: AlertStatus, action: AlertAction): AlertStatus {
  if (action === "mark_read") {
    return "read";
  }

  if (action === "snooze") {
    return "snoozed";
  }

  if (action === "escalate") {
    return "escalated";
  }

  return currentStatus;
}

export async function listAlerts(status?: AlertStatus): Promise<{ data: RiskAlert[]; counters: AlertCounters }> {
  const alerts = await loadAlerts();
  const filtered = status ? alerts.filter((alert) => alert.status === status) : alerts;
  return {
    data: [...filtered].sort(compareAlerts),
    counters: getAlertCounters(alerts)
  };
}

export async function updateAlert(alertId: string, action: AlertAction): Promise<{ data: RiskAlert; counters: AlertCounters } | undefined> {
  const alerts = await loadAlerts();
  const target = alerts.find((alert) => alert.id === alertId);

  if (!target) {
    return undefined;
  }

  const now = new Date().toISOString();
  const updated = alerts.map((alert) => {
    if (alert.id !== alertId) {
      return alert;
    }

    const status = nextStatus(alert.status, action);
    const nextAlert: RiskAlert = {
      ...alert,
      status,
      updatedAt: now
    };

    if (status === "escalated") {
      nextAlert.escalatedAt = now;
    } else if (alert.escalatedAt) {
      nextAlert.escalatedAt = alert.escalatedAt;
    }

    return nextAlert;
  });

  await replaceAlerts(updated);
  const nextAlert = updated.find((alert) => alert.id === alertId);

  if (!nextAlert) {
    return undefined;
  }

  return {
    data: nextAlert,
    counters: getAlertCounters(updated)
  };
}

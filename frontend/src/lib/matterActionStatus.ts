/**
 * matterActionStatus.ts — lightweight localStorage-backed tracker for the
 * "Recommended Actions" checkbox state on the Matter Detail page. The state
 * is intentionally per-browser only (CL-010 — never persisted server-side)
 * but having it survive a page-reload makes the new ACTION STATUS column on
 * the matter list meaningful instead of always showing "No Action Yet".
 *
 * Stored shape:  Record<matterId, Record<actionId, boolean>>
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "riskradar:matterActionState:v1";

export type ActionStatus = "none" | "in_progress" | "completed";

interface ActionState {
  [matterId: string]: Record<string, boolean>;
}

function readAll(): ActionState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as ActionState;
    return {};
  } catch {
    return {};
  }
}

function writeAll(state: ActionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("riskradar:matterActionState"));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function getCompletedMap(matterId: string): Record<string, boolean> {
  return readAll()[matterId] ?? {};
}

export function setCompletedMap(matterId: string, map: Record<string, boolean>): void {
  const all = readAll();
  all[matterId] = map;
  writeAll(all);
}

/** Compute a coarse status for a matter given the total number of recommended
 *  actions vs how many are checked. */
export function deriveStatus(matterId: string, totalActions: number): ActionStatus {
  if (totalActions <= 0) return "none";
  const map = getCompletedMap(matterId);
  const done = Object.values(map).filter(Boolean).length;
  if (done === 0) return "none";
  if (done >= totalActions) return "completed";
  return "in_progress";
}

/** React hook — re-renders whenever any matter's action state changes (so
 *  the matter list pill updates the moment the user toggles a checkbox in
 *  another tab or on the detail page). */
export function useActionStatusVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("riskradar:matterActionState", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("riskradar:matterActionState", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return version;
}

/** Curated total counts so the matter list can render a meaningful pill
 *  without fetching budget-history + timeline for every row. Numbers must
 *  match the curated entries in `matterRecommendedActions.ts`. Other matters
 *  fall back to the rules-engine baseline of 1 action ("Document action…"),
 *  which means any toggle flips status to "completed". */
const ACTION_TOTALS: Record<string, number> = {
  "matter-001": 6,
  "matter-002": 4,
  "matter-003": 4
};

export function getActionTotal(matterId: string): number {
  return ACTION_TOTALS[matterId] ?? 1;
}

export function statusLabel(status: ActionStatus): { label: string; tone: "amber" | "blue" | "green" } {
  switch (status) {
    case "completed":
      return { label: "✅ Completed", tone: "green" };
    case "in_progress":
      return { label: "⏳ In Progress", tone: "blue" };
    default:
      return { label: "⏰ No Action Yet", tone: "amber" };
  }
}

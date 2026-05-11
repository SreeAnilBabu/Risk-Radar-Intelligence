import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Tracks which dashboard widgets are visible. Each widget has a stable id and
 * a label, so when the user closes one it can be re-added from the
 * "Layout Settings" menu in the page header. Persisted to localStorage so
 * preferences survive a refresh.
 */
export type WidgetId =
  | "topRiskMatters"
  | "matterRiskOverview"
  | "quickInsights"
  | "invoiceQueue"
  | "rateCardFlags";

export interface WidgetMeta { id: WidgetId; label: string; description: string }

export const ALL_WIDGETS: WidgetMeta[] = [
  { id: "topRiskMatters",     label: "Top Risk Matters",      description: "Alert feed of the highest-risk clusters" },
  { id: "matterRiskOverview", label: "Matter Risk Overview",  description: "Map / Firm Exposure / Matrix / Timeline" },
  { id: "quickInsights",      label: "Quick Insights",        description: "Highest overrun, exposure, top firm…" },
  { id: "invoiceQueue",       label: "Invoice Queue",         description: "Pending approvals & velocity alerts" },
  { id: "rateCardFlags",      label: "Rate Card Flags",       description: "Rate violations & timekeepers over rate" }
];

type LayoutState = {
  visible: Record<WidgetId, boolean>;
  toggle: (id: WidgetId) => void;
  show: (id: WidgetId) => void;
  hide: (id: WidgetId) => void;
  reset: () => void;
};

// Default layout — match the simplified screenshot (only Matter Risk Overview).
// Other widgets are off until the user adds them via Layout Settings.
const DEFAULT_VISIBLE: Record<WidgetId, boolean> = {
  topRiskMatters: false,
  matterRiskOverview: true,
  quickInsights: false,
  invoiceQueue: false,
  rateCardFlags: false
};
const STORAGE_KEY = "riskradar.dashboard.layout";

const Ctx = createContext<LayoutState | null>(null);

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<Record<WidgetId, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_VISIBLE;
      const parsed = JSON.parse(raw) as Partial<Record<WidgetId, boolean>>;
      return { ...DEFAULT_VISIBLE, ...parsed };
    } catch {
      return DEFAULT_VISIBLE;
    }
  });

  const persist = useCallback((next: Record<WidgetId, boolean>) => {
    setVisible(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const value = useMemo<LayoutState>(
    () => ({
      visible,
      toggle: (id) => persist({ ...visible, [id]: !visible[id] }),
      show:   (id) => persist({ ...visible, [id]: true }),
      hide:   (id) => persist({ ...visible, [id]: false }),
      reset:  ()   => persist(DEFAULT_VISIBLE)
    }),
    [visible, persist]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardLayout(): LayoutState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboardLayout must be used inside <DashboardLayoutProvider>");
  return ctx;
}

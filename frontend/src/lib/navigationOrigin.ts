/**
 * navigationOrigin.ts — small helper for context-aware "← Back to …" buttons.
 *
 * Pages link to Matter Detail / Briefing from many places (dashboard, matter
 * list, AI briefing card, jurisdiction drill-down, insights). Each navigate()
 * call passes `state: { from: "<origin>", level?: "..." }` so the destination
 * can render the correct back button without relying on browser history.
 */
import { useLocation, useNavigate } from "react-router-dom";

export type NavOrigin =
  | "dashboard"
  | "matter-list"
  | "briefing"
  | "insights"
  | "jurisdiction"
  | "alerts";

interface NavState {
  from?: NavOrigin;
  level?: string;
  jurisdictionId?: string;
}

const LABELS: Record<NavOrigin, string> = {
  dashboard: "← Back to Dashboard",
  "matter-list": "← Back to Matter List",
  briefing: "← Back to AI Briefing",
  insights: "← Back to Insights",
  jurisdiction: "← Back to Jurisdiction",
  alerts: "← Back to Alerts"
};

export function useBackNav(defaultOrigin: NavOrigin = "dashboard"): {
  label: string;
  onBack: () => void;
} {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as NavState | null) ?? {};
  const from: NavOrigin = state.from ?? defaultOrigin;

  const onBack = () => {
    switch (from) {
      case "matter-list": {
        const lvl = state.level ?? "all";
        navigate(`/matters/${lvl}`);
        break;
      }
      case "briefing":
        // Briefing without matterId is the global daily briefing; with one
        // it's matter-scoped. The detail page won't know which it is, so we
        // delegate to history when possible, otherwise to /briefing.
        if (window.history.length > 1) navigate(-1);
        else navigate("/briefing");
        break;
      case "insights":
        navigate("/insights");
        break;
      case "jurisdiction":
        if (state.jurisdictionId) navigate(`/jurisdiction/${state.jurisdictionId}`);
        else if (window.history.length > 1) navigate(-1);
        else navigate("/");
        break;
      case "alerts":
        navigate("/alerts");
        break;
      case "dashboard":
      default:
        navigate("/");
    }
  };

  return { label: LABELS[from], onBack };
}

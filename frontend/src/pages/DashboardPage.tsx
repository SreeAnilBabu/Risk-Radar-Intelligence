import { useEffect, useRef, useState } from "react";
import { StatRow } from "../features/dashboard/StatRow";
import { TopRiskMatters } from "../features/dashboard/TopRiskMatters";
import { RiskOverviewTabs } from "../features/dashboard/RiskOverviewTabs";
import {
  QuickInsightsWidget, InvoiceQueueWidget, RateCardFlagsWidget
} from "../features/dashboard/QuickInsights";
import { Widget } from "../features/dashboard/Widget";
import {
  ALL_WIDGETS, useDashboardLayout, type WidgetId
} from "../app/state/dashboardLayoutContext";
import { useAuth } from "../app/state/authContext";

/**
 * Simplified dashboard — by default only the stat tiles + Matter Risk Overview
 * map are shown. Other widgets (Top Risk Matters, Quick Insights, Invoice
 * Queue, Rate Card Flags) can be re-added from the "Layout Settings" menu.
 *
 * Each widget has a close (✕) button — closing a widget hides it but never
 * destroys it. Layout choice is persisted in localStorage.
 */
export function DashboardPage() {
  const { visible } = useDashboardLayout();
  const { user, logout } = useAuth();

  const showLeft = visible.topRiskMatters;
  const showRight = visible.quickInsights || visible.invoiceQueue || visible.rateCardFlags;
  const cols = `${showLeft ? "200px " : ""}1fr${showRight ? " 220px" : ""}`;

  return (
    <div className="page-wrap">
      <div className="page-hdr-bar">
        <div className="page-hdr-l">
          <div className="page-title">Risk Intelligence Dashboard</div>
          <div className="page-sub">Live signal across the matter portfolio · {user?.displayName ?? ""}</div>
        </div>
        <div className="page-hdr-r">
          <LayoutSettingsMenu />
          <button type="button" className="hdr-btn ghost" onClick={logout} title="Sign out">↪ Sign out</button>
        </div>
      </div>

      {visible.matterRiskOverview === false &&
        showLeft === false &&
        showRight === false && <EmptyDashboard />}

      <StatRow />

      <div className="main-layout" style={{ gridTemplateColumns: cols }}>
        {showLeft && <TopRiskMatters />}

        {visible.matterRiskOverview && (
          <Widget id="matterRiskOverview" title="Matter Risk Overview" className="overview-widget">
            <RiskOverviewTabs />
          </Widget>
        )}

        {showRight && (
          <div className="right-rail">
            {visible.quickInsights && <QuickInsightsWidget />}
            {visible.invoiceQueue && <InvoiceQueueWidget />}
            {visible.rateCardFlags && <RateCardFlagsWidget />}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="dash-empty">
      <div>All widgets are hidden.</div>
      <div className="dash-empty-sub">
        Open <strong>Layout Settings</strong> from the header to re-add widgets to your dashboard.
      </div>
    </div>
  );
}

function LayoutSettingsMenu() {
  const { visible, toggle, reset } = useDashboardLayout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hidden = ALL_WIDGETS.filter((w) => !visible[w.id]);

  return (
    <div className="layout-menu" ref={ref}>
      <button type="button" className="hdr-btn primary" onClick={() => setOpen((v) => !v)}>
        ⚙ Layout Settings
        {hidden.length > 0 && <span className="layout-badge">{hidden.length}</span>}
      </button>
      {open && (
        <div className="layout-pop" role="menu">
          <div className="layout-pop-hdr">
            Dashboard widgets
            <button type="button" className="layout-reset" onClick={reset} title="Reset to default layout">
              Reset
            </button>
          </div>
          <div className="layout-pop-body">
            {ALL_WIDGETS.map((w) => (
              <LayoutRow key={w.id} id={w.id} label={w.label} description={w.description}
                checked={visible[w.id]} onToggle={() => toggle(w.id)} />
            ))}
          </div>
          <div className="layout-pop-foot">
            Closed widgets reappear here — toggle one back on to add it to your dashboard.
          </div>
        </div>
      )}
    </div>
  );
}

function LayoutRow({
  id, label, description, checked, onToggle
}: {
  id: WidgetId; label: string; description: string;
  checked: boolean; onToggle: () => void;
}) {
  return (
    <label className="layout-row" htmlFor={`layout-${id}`}>
      <input id={`layout-${id}`} type="checkbox" checked={checked} onChange={onToggle} />
      <div>
        <div className="layout-row-label">{label}</div>
        <div className="layout-row-sub">{description}</div>
      </div>
      <span className={`layout-row-state ${checked ? "on" : "off"}`}>{checked ? "Visible" : "Hidden"}</span>
    </label>
  );
}

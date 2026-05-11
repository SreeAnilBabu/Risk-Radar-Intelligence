import type { ReactNode } from "react";
import { useDashboardLayout, type WidgetId } from "../../app/state/dashboardLayoutContext";

/** Closable Passport widget — the X icon hides the widget; users re-add it
 *  from the Layout Settings menu in the dashboard header. */
export function Widget({
  id,
  title,
  children,
  className
}: {
  id: WidgetId;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { hide } = useDashboardLayout();
  return (
    <div className={`widget ${className ?? ""}`.trim()}>
      <div className="widget-hdr">
        <span>{title}</span>
        <div className="widget-icons">
          <button
            type="button"
            className="widget-icon-btn"
            title="Close — re-add from Layout Settings"
            onClick={() => hide(id)}
          >
            ✕
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * RecommendedActionsCard — renders the persona × signal action plan returned
 * by `getRecommendedActions`. Switches between actionable checkboxes
 * (Legal Ops, Bill Reviewer) and read-only advisory prompts (General Counsel)
 * based on the action plan's `kind`.
 */
import { useState } from "react";
import { ROLE_LABELS, type UserRole } from "../../lib/userRole";
import type { ActionPlan } from "../../lib/recommendedActions";

interface RecommendedActionsCardProps {
  plan: ActionPlan;
  role: UserRole;
}

const TONE_BG: Record<"red" | "amber" | "blue", string> = {
  red: "rgba(192, 57, 43, 0.08)",
  amber: "rgba(183, 119, 13, 0.08)",
  blue: "rgba(35, 87, 137, 0.06)"
};

const TONE_TXT: Record<"red" | "amber" | "blue", string> = {
  red: "var(--red)",
  amber: "var(--amber)",
  blue: "var(--nav-active)"
};

export function RecommendedActionsCard({ plan, role }: RecommendedActionsCardProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const total = plan.blocks.reduce((sum, b) => sum + b.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="bcard">
      <div className="bcard-hdr" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Recommended Actions — {ROLE_LABELS[role]}</span>
        {plan.kind === "checkbox" && total > 0 && (
          <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>
            {done} of {total} actioned
          </span>
        )}
      </div>
      <div className="bcard-body">
        {plan.emptyMessage && plan.blocks.length === 0 && (
          <p style={{ color: "var(--text-dim)", margin: 0 }}>{plan.emptyMessage}</p>
        )}

        {plan.blocks.map((block) => (
          <div
            key={block.trigger}
            className="rec-block"
            style={{ background: TONE_BG[block.tone] }}
          >
            <div className="rec-block-hdr" style={{ color: TONE_TXT[block.tone] }}>
              {block.trigger}
            </div>
            {block.items.map((item) => {
              const key = `${block.trigger}::${item}`;
              const isChecked = !!checked[key];
              if (plan.kind === "advisory") {
                return (
                  <div key={key} className="rec-advisory">
                    <span className="rec-advisory-dot">•</span>
                    <span>{item}</span>
                  </div>
                );
              }
              return (
                <label key={key} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  <span style={{ textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.6 : 1 }}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

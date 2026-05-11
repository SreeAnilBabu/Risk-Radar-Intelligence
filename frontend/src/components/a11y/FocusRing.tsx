import type { ReactNode } from "react";

export const focusRingClassName = "focus:outline-none focus-visible:ring-2 focus-visible:ring-wkblue focus-visible:ring-offset-2 focus-visible:ring-offset-page";

type FocusRingProps = {
  children: ReactNode;
  className?: string;
};

export function FocusRing({ children, className }: FocusRingProps) {
  return <span className={`${focusRingClassName} ${className ?? ""}`.trim()}>{children}</span>;
}

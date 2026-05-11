import type { ReactNode } from "react";
import { RefreshProvider } from "../state/refreshContext";
import { QueryHighlightProvider } from "../state/queryHighlightContext";
import { AuthProvider } from "../state/authContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RefreshProvider>
        <QueryHighlightProvider>{children}</QueryHighlightProvider>
      </RefreshProvider>
    </AuthProvider>
  );
}

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";

type RefreshState = {
  tick: number;
  lastCompletedAt: string | null;
};

type RefreshAction =
  | { type: "tick" }
  | { type: "completed"; timestamp: string };

type RefreshContextValue = RefreshState & {
  refresh: () => void;
  markCompleted: (timestamp: string) => void;
};

function refreshReducer(state: RefreshState, action: RefreshAction): RefreshState {
  if (action.type === "tick") {
    return { ...state, tick: state.tick + 1 };
  }

  return { ...state, lastCompletedAt: action.timestamp };
}

const RefreshContext = createContext<RefreshContextValue | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(refreshReducer, {
    tick: 0,
    lastCompletedAt: null
  });

  const refresh = useCallback(() => {
    dispatch({ type: "tick" });
  }, []);

  const markCompleted = useCallback((timestamp: string) => {
    dispatch({ type: "completed", timestamp });
  }, []);

  const value = useMemo<RefreshContextValue>(() => ({
    ...state,
    refresh,
    markCompleted
  }), [markCompleted, refresh, state]);

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within RefreshProvider");
  }

  return context;
}

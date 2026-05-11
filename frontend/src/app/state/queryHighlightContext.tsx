import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";

type QueryHighlightState = {
  jurisdictionIds: string[];
  answer: string | null;
};

type QueryHighlightAction =
  | { type: "set"; jurisdictionIds: string[]; answer: string }
  | { type: "clear" };

type QueryHighlightContextValue = QueryHighlightState & {
  setHighlight: (jurisdictionIds: string[], answer: string) => void;
  clearHighlight: () => void;
};

function reducer(state: QueryHighlightState, action: QueryHighlightAction): QueryHighlightState {
  if (action.type === "set") {
    return { jurisdictionIds: action.jurisdictionIds, answer: action.answer };
  }

  return { jurisdictionIds: [], answer: null };
}

const QueryHighlightContext = createContext<QueryHighlightContextValue | undefined>(undefined);

export function QueryHighlightProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { jurisdictionIds: [], answer: null });

  const setHighlight = useCallback((jurisdictionIds: string[], answer: string) => {
    dispatch({ type: "set", jurisdictionIds, answer });
  }, []);

  const clearHighlight = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const value = useMemo<QueryHighlightContextValue>(() => ({
    ...state,
    setHighlight,
    clearHighlight
  }), [clearHighlight, setHighlight, state]);

  return <QueryHighlightContext.Provider value={value}>{children}</QueryHighlightContext.Provider>;
}

export function useQueryHighlight() {
  const context = useContext(QueryHighlightContext);
  if (!context) {
    throw new Error("useQueryHighlight must be used within QueryHighlightProvider");
  }

  return context;
}

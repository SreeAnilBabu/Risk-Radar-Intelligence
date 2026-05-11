export function interpretRiskQuery(question: string): {
  answerTheme: "jurisdiction" | "trend" | "alerts" | "ambiguous";
  jurisdictionHints: string[];
} {
  const normalized = question.toLowerCase();
  const jurisdictionHints = ["california", "new york", "texas", "new jersey"]
    .filter((name) => normalized.includes(name))
    .map((name) => {
      switch (name) {
        case "california":
          return "US-CA";
        case "new york":
          return "US-NY";
        case "texas":
          return "US-TX";
        default:
          return "US-NJ";
      }
    });

  if (normalized.includes("alert") || normalized.includes("escalat")) {
    return { answerTheme: "alerts", jurisdictionHints };
  }

  if (normalized.includes("trend") || normalized.includes("rising") || normalized.includes("falling")) {
    return { answerTheme: "trend", jurisdictionHints };
  }

  if (jurisdictionHints.length > 0 || normalized.includes("risk") || normalized.includes("critical")) {
    return { answerTheme: "jurisdiction", jurisdictionHints };
  }

  return { answerTheme: "ambiguous", jurisdictionHints: [] };
}

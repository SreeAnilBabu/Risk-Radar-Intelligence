/**
 * Passport seed data — extracted verbatim from RiskRadar_Passport.html.
 * Used by the dashboard widgets for rich Firm Exposure, Risk Matrix, Timeline,
 * and Briefing/Matter detail pages so the UX matches the reference 1:1.
 */

export type PassportLevel = "critical" | "warning" | "healthy";

export interface PassportMatter {
  id: string;
  name: string;
  firm: string;
  type: string;
  lat: number;
  lng: number;
  budget: number;
  actual: number;
  level: PassportLevel;
}

export const passportMatters: PassportMatter[] = [
  // Critical
  { id: "M2034", name: "Employment Class Action", firm: "Wilson LLP", type: "Employment", lat: 34.05, lng: -118.24, budget: 300000, actual: 430000, level: "critical" },
  { id: "M2011", name: "Securities Litigation", firm: "Baker McKenzie", type: "Litigation", lat: 40.71, lng: -74.0, budget: 500000, actual: 730000, level: "critical" },
  { id: "M1033", name: "Patent Infringement A", firm: "Jones Day", type: "IP/Patent", lat: 37.77, lng: -122.41, budget: 250000, actual: 423000, level: "critical" },
  { id: "M1055", name: "NDA Dispute — TechCo", firm: "Wilson LLP", type: "IP/Patent", lat: 37.33, lng: -121.88, budget: 120000, actual: 187000, level: "critical" },
  { id: "M4044", name: "IP — Miami", firm: "Greenberg Traurig", type: "IP/Patent", lat: 25.76, lng: -80.19, budget: 200000, actual: 302000, level: "critical" },
  { id: "M2071", name: "Regulatory — FDA Review", firm: "Covington & Burling", type: "Regulatory", lat: 38.89, lng: -77.03, budget: 180000, actual: 269000, level: "critical" },
  { id: "M1042", name: "Smith v. Acme Corp", firm: "Wilson LLP", type: "Employment", lat: 34.05, lng: -118.35, budget: 200000, actual: 286000, level: "critical" },
  { id: "M1087", name: "Davis v. Acme Corp", firm: "Wilson LLP", type: "Employment", lat: 34.1, lng: -118.22, budget: 150000, actual: 212000, level: "critical" },
  // Warning
  { id: "M5022", name: "Antitrust — Chicago", firm: "Sidley Austin", type: "Antitrust", lat: 41.87, lng: -87.62, budget: 400000, actual: 456000, level: "warning" },
  { id: "M2058", name: "Antitrust — Distribution", firm: "Sidley Austin", type: "Antitrust", lat: 41.88, lng: -87.68, budget: 350000, actual: 392000, level: "warning" },
  { id: "M3011", name: "Contract Dispute — Dallas", firm: "Baker McKenzie", type: "Commercial", lat: 32.77, lng: -96.79, budget: 180000, actual: 200000, level: "warning" },
  { id: "M3089", name: "Environmental — Houston", firm: "Vinson & Elkins", type: "Environmental", lat: 29.76, lng: -95.36, budget: 220000, actual: 246000, level: "warning" },
  { id: "M4201", name: "Labor Dispute — Seattle", firm: "Perkins Coie", type: "Employment", lat: 47.6, lng: -122.33, budget: 130000, actual: 147000, level: "warning" },
  { id: "M6001", name: "M&A Review — Boston", firm: "Ropes & Gray", type: "Corporate", lat: 42.36, lng: -71.05, budget: 600000, actual: 664000, level: "warning" },
  { id: "M7033", name: "Insurance Dispute — Phoenix", firm: "Snell & Wilmer", type: "Insurance", lat: 33.44, lng: -112.07, budget: 90000, actual: 102000, level: "warning" },
  { id: "M8012", name: "Product Liability — Denver", firm: "Holland & Hart", type: "Litigation", lat: 39.73, lng: -104.99, budget: 160000, actual: 178000, level: "warning" },
  { id: "M9001", name: "Trade Secret — Austin", firm: "Haynes Boone", type: "IP/Patent", lat: 30.26, lng: -97.74, budget: 145000, actual: 163000, level: "warning" },
  { id: "M9100", name: "False Claims — DC", firm: "Covington & Burling", type: "Regulatory", lat: 38.9, lng: -77.06, budget: 280000, actual: 306000, level: "warning" },
  { id: "M1091", name: "Garcia v. Acme", firm: "Wilson LLP", type: "Employment", lat: 34.07, lng: -118.3, budget: 80000, actual: 109000, level: "warning" },
  { id: "M2099", name: "Trademark — NY", firm: "Baker McKenzie", type: "IP/Patent", lat: 40.73, lng: -73.99, budget: 95000, actual: 108000, level: "warning" },
  // Healthy
  { id: "M3300", name: "Compliance Review — Atlanta", firm: "King & Spalding", type: "Regulatory", lat: 33.74, lng: -84.38, budget: 200000, actual: 82000, level: "healthy" },
  { id: "M4400", name: "Real Estate — Chicago", firm: "Sidley Austin", type: "Commercial", lat: 41.85, lng: -87.65, budget: 150000, actual: 61000, level: "healthy" },
  { id: "M5500", name: "Employment Counsel — SF", firm: "Littler Mendelson", type: "Employment", lat: 37.78, lng: -122.43, budget: 80000, actual: 22000, level: "healthy" },
  { id: "M6600", name: "M&A Advisory — NY", firm: "Simpson Thacher", type: "Corporate", lat: 40.74, lng: -74.0, budget: 500000, actual: 188000, level: "healthy" },
  { id: "M7700", name: "Patent Portfolio — Seattle", firm: "Perkins Coie", type: "IP/Patent", lat: 47.61, lng: -122.35, budget: 120000, actual: 41000, level: "healthy" },
  { id: "M8800", name: "Contract Review — Boston", firm: "Ropes & Gray", type: "Commercial", lat: 42.37, lng: -71.03, budget: 60000, actual: 18000, level: "healthy" },
  { id: "M9900", name: "HR Policy — Dallas", firm: "Littler Mendelson", type: "Employment", lat: 32.78, lng: -96.82, budget: 45000, actual: 12000, level: "healthy" }
];

export const passportTopRiskItems = [
  { id: "CA-EMP", title: "CA Employment Cluster", sub: "Budget +67% · 3 matters", time: "2 hours ago", tone: "red" as const, matterId: "M1042" },
  { id: "NY-IP", title: "NY IP Litigation", sub: "Deadline in 5 days · no action", time: "4 hours ago", tone: "red" as const, matterId: "M2011" },
  { id: "TX-EMP", title: "TX Employment #1101", sub: "Approval stalled 9 days", time: "Yesterday", tone: "amber" as const, matterId: "M3089" },
  { id: "SE-VC", title: "SE Vendor Concentration", sub: "Firm A handles 68% of SE matters", time: "2 days ago", tone: "amber" as const, matterId: "M4044" },
  { id: "MW-RC", title: "Midwest Rate Creep", sub: "7 timekeepers above rate card", time: "3 days ago", tone: "amber" as const, matterId: "M5022" }
];

export const COLOR: Record<PassportLevel, string> = {
  critical: "#c0392b",
  warning: "#b7770d",
  healthy: "#1a7a3c"
};

export const fmtK = (n: number) => `$${Math.round(n / 1000)}K`;
export const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

export function findPassportMatter(id: string): PassportMatter | undefined {
  return passportMatters.find((m) => m.id === id);
}

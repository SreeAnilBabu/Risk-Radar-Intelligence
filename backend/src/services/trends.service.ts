import { loadAlerts, loadJurisdictions, loadMatters, loadTrends, loadVendors } from "../data/loaders";
import { type RiskTrendPoint } from "../types/domain";

export async function listRiskTrends(jurisdictionId?: string): Promise<RiskTrendPoint[]> {
  const trends = await loadTrends();
  return jurisdictionId ? trends.filter((point) => point.jurisdictionId === jurisdictionId) : trends;
}

export async function getDashboardSnapshot(): Promise<{
  overallRisk: number;
  activeMatters: number;
  totalSpend: number;
  openAlerts: number;
}> {
  const [jurisdictions, matters, alerts] = await Promise.all([loadJurisdictions(), loadMatters(), loadAlerts()]);
  const overallRisk = Math.round(jurisdictions.reduce((sum, item) => sum + item.overallRiskScore, 0) / jurisdictions.length);

  return {
    overallRisk,
    activeMatters: matters.filter((matter) => matter.status !== "closed").length,
    totalSpend: jurisdictions.reduce((sum, item) => sum + item.totalSpend, 0),
    openAlerts: alerts.filter((alert) => alert.status !== "read").length
  };
}

export async function getVendorAnomalyPairs(): Promise<Array<{ vendorId: string; spend: number; risk: number }>> {
  const [vendors, matters] = await Promise.all([loadVendors(), loadMatters()]);
  return vendors.map((vendor) => {
    const vendorMatters = matters.filter((matter) => matter.outsideCounselVendorId === vendor.id);
    const averageMatterRisk = vendorMatters.length === 0
      ? 0
      : Math.round(vendorMatters.reduce((sum, matter) => sum + matter.riskScore, 0) / vendorMatters.length);

    return {
      vendorId: vendor.id,
      spend: vendor.totalSpend,
      risk: averageMatterRisk
    };
  });
}

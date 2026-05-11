import { useEffect, useState } from "react";
import { getRisk, listMatters, listVendors } from "../../services/endpoints";
import type { JurisdictionRiskProfile, MatterRiskRecord, VendorRiskSummary } from "../../types/domain";

type DrilldownState = {
  jurisdiction: JurisdictionRiskProfile | null;
  matters: MatterRiskRecord[];
  vendors: VendorRiskSummary[];
  loading: boolean;
  error: string | null;
};

export function useJurisdictionDrilldown(jurisdictionId: string | undefined) {
  const [state, setState] = useState<DrilldownState>({
    jurisdiction: null,
    matters: [],
    vendors: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!jurisdictionId) {
      return;
    }

    const targetJurisdictionId = jurisdictionId;

    let active = true;
    async function load() {
      try {
        setState((current: DrilldownState) => ({ ...current, loading: true, error: null }));
        const [jurisdiction, matters, vendors] = await Promise.all([
          getRisk(targetJurisdictionId),
          listMatters({ jurisdictionId: targetJurisdictionId, level: "all", size: 500 }),
          listVendors()
        ]);

        if (!active) {
          return;
        }

        const relevantVendorIds = new Set(matters.map((matter) => matter.outsideCounselVendorId));
        setState({
          jurisdiction,
          matters,
          vendors: vendors.filter((vendor) => relevantVendorIds.has(vendor.id)),
          loading: false,
          error: null
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({ jurisdiction: null, matters: [], vendors: [], loading: false, error: error instanceof Error ? error.message : "Unable to load drill-down data." });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [jurisdictionId]);

  return state;
}

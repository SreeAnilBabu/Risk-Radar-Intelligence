import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { COLOR, fmtK } from "../../data/passportSeed";
import { getPortfolioByState, listMatters, type PortfolioStateBubble } from "../../services/endpoints";
import type { MatterRiskRecord } from "../../types/domain";

type TabKey = "map" | "firms" | "matrix" | "timeline";

/** Convert riskScore back to the simple level the existing UI uses. */
function levelOf(m: MatterRiskRecord): "critical" | "warning" | "healthy" {
  if (m.riskScore >= 75) return "critical";
  if (m.riskScore >= 50) return "warning";
  return "healthy";
}

/** Overrun percent (0 = on budget). */
function overrunPct(m: MatterRiskRecord): number {
  const budget = m.budgetTotal ?? 0;
  if (budget <= 0) return 0;
  return Math.round(((m.spendToDate - budget) / budget) * 100);
}

export function RiskOverviewTabs() {
  const [active, setActive] = useState<TabKey>("map");
  // Pull a wide live sample once for the Firms / Matrix / Timeline tabs.
  // Server caps at 500; for 245k matters this is fine because the order is
  // "most-overrun first" so the riskiest items are always present.
  const [matters, setMatters] = useState<MatterRiskRecord[]>([]);
  const [loadingMatters, setLoadingMatters] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingMatters(true);
    listMatters({ level: "all", size: 500 })
      .then((rows) => {
        if (!cancelled) setMatters(rows);
      })
      .catch(() => {
        if (!cancelled) setMatters([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMatters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute the "Act Now" badge for the matrix tab from live data.
  const actNowCount = useMemo(() => {
    if (matters.length === 0) return 0;
    const sorted = matters.map((m) => m.spendToDate).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    return matters.filter((m) => m.spendToDate >= median && overrunPct(m) >= 15).length;
  }, [matters]);

  return (
    <>
      <div className="tab-bar">
        <TabBtn k="map" active={active} set={setActive}>🗺 Map</TabBtn>
        <TabBtn k="firms" active={active} set={setActive}>🏛 Firm Exposure</TabBtn>
        <TabBtn k="matrix" active={active} set={setActive}>
          🎯 Risk Matrix{" "}
          <span style={{ background: "var(--red)", color: "#fff", fontSize: 9, fontWeight: 700,
            padding: "1px 5px", borderRadius: 10, marginLeft: 4 }}>{actNowCount} Act Now</span>
        </TabBtn>
        <TabBtn k="timeline" active={active} set={setActive}>📅 Timeline</TabBtn>
      </div>
      {active === "map" && <MapTab />}
      {active === "firms" && <FirmsTab matters={matters} loading={loadingMatters} />}
      {active === "matrix" && <MatrixTab matters={matters} loading={loadingMatters} />}
      {active === "timeline" && <TimelineTab matters={matters} loading={loadingMatters} />}
    </>
  );
}

function TabBtn({
  k, active, set, children
}: {
  k: TabKey; active: TabKey; set: (k: TabKey) => void; children: React.ReactNode;
}) {
  return (
    <button type="button" className={`tab-btn ${active === k ? "active" : ""}`} onClick={() => set(k)}>
      {children}
    </button>
  );
}

/* ─────────── MAP TAB ───────────
 * Map factor explained:
 *   Each bubble = ONE US state with at least one active matter in Passport.
 *   Coordinates come from a server-side state-centroid lookup (so we don't
 *   need lat/lng on every matter). Bubble size scales with total active
 *   matters in the state, color encodes the dominant risk level
 *   (red = any critical, amber = warnings only, green = all healthy).
 *
 * We aggregate at the state level for two reasons:
 *   1. Passport doesn't store per-matter coordinates.
 *   2. Plotting 245k individual markers would freeze the browser.
 *
 * Filters (Critical / Warning / Healthy) recompute the bubble's risk count
 * and hide states whose remaining count drops to zero.
 */
function MapTab() {
  const navigate = useNavigate();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [showCritical, setShowCritical] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showHealthy, setShowHealthy] = useState(false);
  const [search, setSearch] = useState("");
  const [bubbles, setBubbles] = useState<PortfolioStateBubble[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the per-state aggregate once on mount.
  useEffect(() => {
    let cancelled = false;
    getPortfolioByState()
      .then((res) => {
        if (!cancelled) setBubbles(res);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[Map] /api/portfolio/by-state failed:", msg);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Init Leaflet map once.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const m = L.map(mapEl.current, { center: [38, -97], zoom: 4, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(m);
    const layer = L.layerGroup().addTo(m);
    mapRef.current = m;
    layerRef.current = layer;

    const refresh = () => m.invalidateSize();
    requestAnimationFrame(refresh);
    setTimeout(refresh, 200);
    window.addEventListener("resize", refresh);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapEl.current) {
      ro = new ResizeObserver(() => refresh());
      ro.observe(mapEl.current);
    }

    return () => {
      window.removeEventListener("resize", refresh);
      ro?.disconnect();
      m.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Re-render bubbles whenever filters or data change.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const q = search.toLowerCase().trim();
    const maxTotal = Math.max(1, ...bubbles.map((b) => b.total));

    bubbles.forEach((b) => {
      // Apply level filters: a state's "visible count" sums only the buckets
      // the user wants to see.
      const visibleCount =
        (showCritical ? b.critical : 0) +
        (showWarning ? b.warning : 0) +
        (showHealthy ? b.healthy : 0);
      if (visibleCount === 0) return;
      if (q && !`${b.code} ${b.name}`.toLowerCase().includes(q)) return;

      // Color = worst level present in the visible counts.
      const level: "critical" | "warning" | "healthy" =
        showCritical && b.critical > 0
          ? "critical"
          : showWarning && b.warning > 0
            ? "warning"
            : "healthy";
      const c = COLOR[level];
      // Link target reflects the currently active filter set, not always
      // "at-risk". If multiple levels are visible we fall back to a combined
      // "/matters/all" route with jurisdictionId so the user lands on the
      // unfiltered list for that state.
      const activeLevels: ("critical" | "warning" | "healthy")[] = [];
      if (showCritical && b.critical > 0) activeLevels.push("critical");
      if (showWarning && b.warning > 0) activeLevels.push("warning");
      if (showHealthy && b.healthy > 0) activeLevels.push("healthy");
      const linkLevel = activeLevels.length === 1 ? activeLevels[0] : "all";
      const linkLabel =
        linkLevel === "critical"
          ? `View ${b.critical} critical matters`
          : linkLevel === "warning"
            ? `View ${b.warning} warning matters`
            : linkLevel === "healthy"
              ? `View ${b.healthy} healthy matters`
              : `View ${visibleCount} matters`;
      // Bubble radius: 8–28px, log-scaled by visible matter count.
      const radius = 8 + Math.round(20 * Math.sqrt(visibleCount / maxTotal));
      const pulseAttr = level === "critical" ? 'class="pulse-marker"' : "";
      const icon = L.divIcon({
        html: `<div ${pulseAttr} style="background:${c};width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${Math.max(9, radius - 2)}px;">${visibleCount}</div>`,
        className: "",
        iconSize: [radius * 2, radius * 2]
      });
      const mk = L.marker([b.lat, b.lng], { icon } as L.MarkerOptions);
      const popupHtml = `
        <div style="min-width:220px;font-family:'Segoe UI',Arial,sans-serif;">
          <div class="pp-popup-title">${b.name} (${b.code})</div>
          <div class="pp-popup-row"><span class="pp-popup-lbl">Critical</span><span class="pp-popup-val red">${b.critical}</span></div>
          <div class="pp-popup-row"><span class="pp-popup-lbl">Warning</span><span class="pp-popup-val amber">${b.warning}</span></div>
          <div class="pp-popup-row"><span class="pp-popup-lbl">Healthy</span><span class="pp-popup-val">${b.healthy}</span></div>
          <div class="pp-popup-row"><span class="pp-popup-lbl">Total Active</span><span class="pp-popup-val">${b.total}</span></div>
          <div style="margin-top:8px;padding-top:7px;border-top:1px solid #e2e8f0;">
            <a href="/matters/${linkLevel}?jurisdictionId=${b.jurisdictionId}" data-state="${b.jurisdictionId}" data-level="${linkLevel}" style="color:#1e5f9c;font-size:11px;font-weight:600;text-decoration:underline;cursor:pointer;">⚡ ${linkLabel} →</a>
          </div>
        </div>`;
      mk.bindPopup(popupHtml, { className: "pp-popup" });
      mk.on("popupopen", (e: L.PopupEvent) => {
        const node = e.popup.getElement();
        const link = node?.querySelector("a[data-state]") as HTMLAnchorElement | null;
        if (link) {
          link.onclick = (ev: MouseEvent) => {
            ev.preventDefault();
            navigate(`/matters/${link.dataset.level}?jurisdictionId=${link.dataset.state}`);
          };
        }
      });
      layer.addLayer(mk);
    });
  }, [bubbles, showCritical, showWarning, showHealthy, search, navigate]);

  // Rolled-up counts for the filter chip labels.
  const totals = useMemo(() => {
    return bubbles.reduce(
      (acc, b) => ({
        critical: acc.critical + b.critical,
        warning: acc.warning + b.warning,
        healthy: acc.healthy + b.healthy
      }),
      { critical: 0, warning: 0, healthy: 0 }
    );
  }, [bubbles]);

  return (
    <div>
      <div className="filter-row">
        <span className="flabel">Show:</span>
        <button type="button" className={`fbtn red${showCritical ? " on" : ""}`}
          onClick={() => setShowCritical((v) => !v)}>
          <span className="fdot red" /> Critical ({totals.critical})
        </button>
        <button type="button" className={`fbtn amber${showWarning ? " on" : ""}`}
          onClick={() => setShowWarning((v) => !v)}>
          <span className="fdot amber" /> Warning ({totals.warning})
        </button>
        <button type="button" className={`fbtn green${showHealthy ? " on" : ""}`}
          onClick={() => setShowHealthy((v) => !v)}>
          <span className="fdot green" /> Healthy ({totals.healthy})
        </button>
        <div className="map-search">
          <span className="map-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search state name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
          {loading ? "Loading…" : error ? `⚠ ${error}` : `${bubbles.length} states · live from Passport`}
        </span>
      </div>
      <div className="pp-map" ref={mapEl} />
    </div>
  );
}

/* ─────────── FIRMS TAB ─────────── */
function FirmsTab({ matters, loading }: { matters: MatterRiskRecord[]; loading: boolean }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; spend: number; critical: number; warning: number; healthy: number; firstId: string }>();
    matters.forEach((m) => {
      const firm = m.vendorName ?? "Unassigned";
      const cur = map.get(firm) ?? { name: firm, spend: 0, critical: 0, warning: 0, healthy: 0, firstId: m.id };
      cur.spend += m.spendToDate;
      cur[levelOf(m)]++;
      map.set(firm, cur);
    });
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [matters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  if (loading) return <div className="firm-list" style={{ padding: 16, color: "var(--text-dim)" }}>Loading firm exposure from Passport…</div>;
  if (rows.length === 0) return <div className="firm-list" style={{ padding: 16, color: "var(--text-dim)" }}>No firm data available.</div>;

  return (
    <div className="firm-list">
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>🔍 Search firm</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Wilson LLP, Baker McKenzie…"
          style={{
            flex: 1, maxWidth: 320, padding: "4px 9px", fontSize: 12,
            border: "1px solid var(--border)", borderRadius: 4, background: "#fff"
          }}
        />
        {search && (
          <button type="button" className="mlink" style={{ fontSize: 11 }}
            onClick={() => setSearch("")}>clear</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
          {search ? `${filtered.length} of ${rows.length}` : `${rows.length} firms`}
        </span>
      </div>
      <div className="firm-col-hdr">
        <div style={{ width: 16, flexShrink: 0 }}>#</div>
        <div className="fn">Firm</div>
        <div className="fb">Risk Distribution</div>
        <div className="fs">Total Spend</div>
        <div className="fp">Risk Breakdown</div>
      </div>
      {filtered.map((f, i) => {
        const tot = f.critical + f.warning + f.healthy;
        const critW = (f.critical / tot) * 100;
        const warnW = (f.warning / tot) * 100;
        const hltW = (f.healthy / tot) * 100;
        return (
          <div key={f.name} className="firm-row">
            <div className="firm-rank">{i + 1}</div>
            <button
              type="button"
              className="firm-name mlink"
              title={f.name}
              onClick={() => navigate(`/briefing/${f.firstId}`, { state: { from: "dashboard" } })}
            >
              {f.name}
            </button>
            <div className="firm-bar-wrap">
              <div className="fb-seg red" style={{ width: `${critW}%` }} />
              <div className="fb-seg amber" style={{ width: `${warnW}%` }} />
              <div className="fb-seg green" style={{ width: `${hltW}%` }} />
            </div>
            <div className="firm-spend">{fmtK(f.spend)}</div>
            <div className="firm-pills">
              {f.critical > 0 && <span className="rpill red">🔴 {f.critical} Crit</span>}
              {f.warning > 0 && <span className="rpill amber">🟡 {f.warning} Warn</span>}
              {f.healthy > 0 && <span className="rpill green">🟢 {f.healthy} OK</span>}
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
          No firms match “{search}”.
        </div>
      )}
    </div>
  );
}

/* ─────────── MATRIX TAB ─────────── */
function MatrixTab({ matters, loading }: { matters: MatterRiskRecord[]; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) return <div className="matrix-wrap" style={{ padding: 16, color: "var(--text-dim)" }}>Loading risk matrix…</div>;
  if (matters.length === 0) return <div className="matrix-wrap" style={{ padding: 16, color: "var(--text-dim)" }}>No matters to display.</div>;

  const sorted = matters.map((m) => m.spendToDate).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const threshold = 15;
  const quads = { actNow: [] as MatterRiskRecord[], watch: [] as MatterRiskRecord[],
    review: [] as MatterRiskRecord[], monitor: [] as MatterRiskRecord[] };
  matters.forEach((m) => {
    const overrun = overrunPct(m);
    const hiSpend = m.spendToDate >= median;
    const hiOverrun = overrun >= threshold;
    if (hiSpend && hiOverrun) quads.actNow.push(m);
    else if (!hiSpend && hiOverrun) quads.watch.push(m);
    else if (hiSpend && !hiOverrun) quads.review.push(m);
    else quads.monitor.push(m);
  });

  return (
    <div className="matrix-wrap">
      <div className="matrix-caption">
        Matters classified by financial exposure and budget overrun rate. Click any matter to view details.
      </div>
      <div className="matrix-grid">
        <Quad cls="act-now" titleCls="red" title="🔴 Act Now" axis="High spend · High overrun" items={quads.actNow} nav={navigate} />
        <Quad cls="review" titleCls="blue" title="🔵 Review Spend" axis="High spend · Low overrun" items={quads.review} nav={navigate} />
        <Quad cls="watch" titleCls="amber" title="🟡 Watch Closely" axis="Low spend · High overrun" items={quads.watch} nav={navigate} />
        <Quad cls="monitor" titleCls="green" title="🟢 Monitor" axis="Low spend · Low overrun" items={quads.monitor} nav={navigate} />
      </div>
      <div className="matrix-axis-labels">
        <div className="ax-lbl">← High Spend | High Overrun →</div>
        <div className="ax-lbl">← High Spend | Low Overrun →</div>
      </div>
    </div>
  );
}

function Quad({
  cls, titleCls, title, axis, items, nav
}: {
  cls: string; titleCls: string; title: string; axis: string;
  items: MatterRiskRecord[]; nav: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className={`mquad ${cls}`}>
      <div className={`mquad-title ${titleCls}`}>{title}</div>
      <div className="mquad-axis">{axis}</div>
      <div className="mquad-count">{items.length} matter{items.length !== 1 ? "s" : ""}</div>
      {items.slice(0, 8).map((m) => {
        const overrun = overrunPct(m);
        const label = m.matterNumber ?? `#${m.id}`;
        const name = m.title;
        return (
          <div className="mitem" key={m.id}>
            <span className="mitem-id">{label}</span>{" "}
            <button type="button" className="mlink" style={{ fontSize: 10 }}
              onClick={() => nav(`/briefing/${m.id}`)}>
              {name.length > 20 ? `${name.substring(0, 20)}…` : name}
            </button>
            <span style={{ float: "right", fontWeight: 700,
              color: overrun > 25 ? "var(--red)" : "var(--amber)" }}>
              {overrun >= 0 ? "+" : ""}{overrun}%
            </span>
          </div>
        );
      })}
      {items.length > 8 && (
        <div style={{ fontSize: 9, color: "var(--text-dim)", paddingTop: 3 }}>
          +{items.length - 8} more…
        </div>
      )}
    </div>
  );
}

/* ─────────── TIMELINE TAB ─────────── */
function TimelineTab({ matters, loading }: { matters: MatterRiskRecord[]; loading: boolean }) {
  const navigate = useNavigate();
  const [showHlt, setShowHlt] = useState(false);
  const curMonth = new Date().getMonth();

  const visible = matters.filter((m) => {
    const lvl = levelOf(m);
    if (lvl === "critical" || lvl === "warning") return true;
    if (lvl === "healthy") return showHlt;
    return false;
  });
  const groups = {
    critical: visible.filter((m) => levelOf(m) === "critical"),
    warning: visible.filter((m) => levelOf(m) === "warning"),
    healthy: visible.filter((m) => levelOf(m) === "healthy")
  };

  const allHealthy = matters.filter((m) => levelOf(m) === "healthy").length;

  if (loading) return <div style={{ padding: 16, color: "var(--text-dim)" }}>Loading timeline…</div>;

  return (
    <div>
      <div className="tl-toolbar">
        Showing: <strong style={{ color: "var(--red)" }}>{groups.critical.length} Critical</strong>{" + "}
        <strong style={{ color: "var(--amber)" }}>{groups.warning.length} Warning</strong>
        &nbsp;&nbsp;
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showHlt}
            onChange={(e) => setShowHlt(e.target.checked)}
            style={{ accentColor: "var(--nav-active)" }}
          />
          Show {allHealthy} Healthy matters
        </label>
      </div>
      <div className="tl-scroll">
        <div className="tl-hdr">
          <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 700 }}>MATTER</div>
          <div className="tl-months">
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <span key={m} className={i === curMonth ? "cur" : ""}>{m}</span>
            ))}
          </div>
        </div>
        {groups.critical.length > 0 && (
          <>
            <div className="tl-section-lbl red">● Critical Matters ({groups.critical.length})</div>
            <Rows items={groups.critical.slice(0, 30)} curMonth={curMonth} nav={navigate} />
          </>
        )}
        {groups.warning.length > 0 && (
          <>
            <div className="tl-section-lbl amber">● Warning Matters ({groups.warning.length})</div>
            <Rows items={groups.warning.slice(0, 30)} curMonth={curMonth} nav={navigate} />
          </>
        )}
        {groups.healthy.length > 0 && (
          <>
            <div className="tl-section-lbl green">● Healthy Matters ({groups.healthy.length})</div>
            <Rows items={groups.healthy.slice(0, 30)} curMonth={curMonth} nav={navigate} />
          </>
        )}
      </div>
    </div>
  );
}

function Rows({
  items, curMonth, nav
}: {
  items: MatterRiskRecord[]; curMonth: number; nav: ReturnType<typeof useNavigate>;
}) {
  return (
    <>
      {items.map((m) => {
        const budget = m.budgetTotal ?? 0;
        const burnPct = budget > 0 ? Math.min(m.spendToDate / budget, 1) : 0;
        const overrun = overrunPct(m);
        const lvl = levelOf(m);
        const cls = lvl === "critical" ? "red" : lvl === "warning" ? "amber" : "green";
        const barW = Math.min(burnPct * (curMonth / 12) * 100 + burnPct * 20, 95);
        const nowLeft = (curMonth / 12) * 100;
        const label = m.matterNumber ?? `#${m.id}`;
        return (
          <div className="tl-row" key={m.id}>
            <div className="tl-mname">
              <button type="button" className="mlink" style={{ fontSize: 10 }}
                onClick={() => nav(`/briefing/${m.id}`)} title={m.title}>
                {label} {m.title}
              </button>
            </div>
            <div className="tl-track">
              <div className="tl-now" style={{ left: `${nowLeft}%` }} />
              <div className={`tl-bar ${cls}`} style={{ width: `${barW}%` }}>
                {overrun > 0 ? `+${overrun}%` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

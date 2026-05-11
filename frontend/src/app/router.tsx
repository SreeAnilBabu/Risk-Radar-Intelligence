import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { AlertsPage } from "../pages/AlertsPage";
import { SimulatorPage } from "../pages/SimulatorPage";
import { JurisdictionPage } from "../pages/JurisdictionPage";
import { BriefingPage } from "../pages/BriefingPage";
import { MatterDetailPage } from "../pages/MatterDetailPage";
import { InsightsPage } from "../pages/InsightsPage";
import { MattersListPage } from "../pages/MattersListPage";
import { LoginPage } from "../pages/LoginPage";
import { RequireAuth } from "../components/auth/RequireAuth";
import { DashboardLayoutProvider } from "./state/dashboardLayoutContext";

export const appRouter = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <DashboardLayoutProvider>
          <AppShell />
        </DashboardLayoutProvider>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: "simulator", element: <SimulatorPage /> },
      { path: "insights", element: <InsightsPage /> },
      { path: "matters/:level", element: <MattersListPage /> },
      { path: "jurisdiction/:id", element: <JurisdictionPage /> },
      { path: "briefing/:matterId", element: <BriefingPage /> },
      { path: "matter/:matterId", element: <MatterDetailPage /> }
    ]
  }
]);

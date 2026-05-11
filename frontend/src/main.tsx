import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { AppProviders } from "./app/providers/AppProviders";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "leaflet/dist/leaflet.css";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={appRouter} />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);

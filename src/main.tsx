import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./tokens.css"; // design-system tokens + base + atmosphere (load first)
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics — no-op off Vercel; only records once enabled in the dashboard. */}
    <Analytics />
  </StrictMode>,
);

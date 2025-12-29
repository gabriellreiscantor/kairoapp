import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { preloadCriticalImagesSync } from "./lib/preloadImages";

// Initialize Sentry FIRST before anything else.
Sentry.init({
  dsn: "https://666c65102edce5244b0eb41f1c310161@o4510609333485568.ingest.us.sentry.io/4510609419403264",
  sendDefaultPii: true,
  enableLogs: true,
  environment: import.meta.env.MODE,
});

// Preload imagens críticas imediatamente
preloadCriticalImagesSync();

createRoot(document.getElementById("root")!).render(<App />);

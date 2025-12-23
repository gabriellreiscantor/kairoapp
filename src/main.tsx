import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadCriticalImagesSync } from "./lib/preloadImages";

// Preload imagens críticas imediatamente
preloadCriticalImagesSync();

createRoot(document.getElementById("root")!).render(<App />);

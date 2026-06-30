import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth";
import { App } from "./App";
import { clearStaleServiceWorkers } from "./lib/clear-stale-service-workers";
import "./index.css";

const root = document.getElementById("root")!;

function renderApp() {
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

void clearStaleServiceWorkers().finally(renderApp);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import workerMapa from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { configurarWorkerMapa } from "@plataforma/mapa";
import { App } from "./App";
import "./app.css";

configurarWorkerMapa(workerMapa);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {import.meta.env.VITE_ENRUTADOR === "hash" ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
);

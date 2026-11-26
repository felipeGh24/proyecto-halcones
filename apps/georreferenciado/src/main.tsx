import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import workerMapa from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { configurarWorkerMapa } from "@plataforma/mapa";
import { App } from "./App";
import "./app.css";

configurarWorkerMapa(workerMapa);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

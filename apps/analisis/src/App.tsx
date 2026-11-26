import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Avisos, Cargando, PantallaIngreso, PantallaSinAcceso, ProveedorSesion, RutaProtegida } from "@plataforma/ui";
import { ProveedorFiltros } from "./filtros";
import { Informes } from "./Informes";
import { Panel } from "./Panel";
const Patrones = lazy(async () => ({ default: (await import("./Patrones")).Patrones }));
import { Terreno } from "./Terreno";

export function App() {
  return (
    <ProveedorSesion sistema="analisis">
      <Routes>
        <Route
          path="/ingreso"
          element={
            <PantallaIngreso
              destino={() => "/panel"}
              puntos={[
                "Tiempos reales de despacho, llegada y respuesta.",
                "Cumplimiento de meta según el semáforo de cada clave.",
                "Cuándo, dónde y qué pasa, con filtros comunes.",
                "Patrones: dónde hace falta patrullaje, punto fijo o refuerzo, y por qué.",
                "Trabajo en terreno: si patrullamos donde está el conflicto.",
                "Planillas para Excel e informes para imprimir.",
              ]}
            />
          }
        />
        <Route path="/sin-acceso" element={<PantallaSinAcceso />} />
        <Route
          path="/*"
          element={
            <RutaProtegida>
              <ProveedorFiltros>
                <Routes>
                  <Route path="/panel" element={<Panel />} />
                  <Route path="/patrones" element={<Suspense fallback={<Cargando texto="Cargando el mapa…" />}><Patrones /></Suspense>} />
                  <Route path="/terreno" element={<Terreno />} />
                  <Route path="/informes" element={<Informes />} />
                  <Route path="*" element={<Navigate to="/panel" replace />} />
                </Routes>
              </ProveedorFiltros>
            </RutaProtegida>
          }
        />
      </Routes>
      <Avisos />
    </ProveedorSesion>
  );
}

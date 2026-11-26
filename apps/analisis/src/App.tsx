import { Navigate, Route, Routes } from "react-router-dom";
import { Avisos, PantallaIngreso, PantallaSinAcceso, ProveedorSesion, RutaProtegida } from "@plataforma/ui";
import { ProveedorFiltros } from "./filtros";
import { Informes } from "./Informes";
import { Panel } from "./Panel";
import { Patrones } from "./Patrones";

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
                  <Route path="/patrones" element={<Patrones />} />
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

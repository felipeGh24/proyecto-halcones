import { Navigate, Route, Routes } from "react-router-dom";
import { Avisos, PantallaIngreso, PantallaSinAcceso, ProveedorSesion, RutaProtegida } from "@plataforma/ui";
import { EnVivo } from "./EnVivo";
import { Historico } from "./Historico";
import { Muro } from "./Muro";

export function App() {
  return (
    <ProveedorSesion sistema="georreferenciado">
      <Routes>
        <Route
          path="/ingreso"
          element={
            <PantallaIngreso
              destino={() => "/mapa"}
              puntos={[
                "Procedimientos activos con el color de su semáforo, en vivo.",
                "Posición y estado de cada móvil, con su recorrido al destino.",
                "Despacho desde el mapa al móvil más cercano.",
                "Mapa de calor del histórico por unidad vecinal.",
              ]}
            />
          }
        />
        <Route path="/sin-acceso" element={<PantallaSinAcceso />} />
        <Route path="/mapa" element={<RutaProtegida><EnVivo /></RutaProtegida>} />
        <Route path="/historico" element={<RutaProtegida><Historico /></RutaProtegida>} />
        <Route path="/muro" element={<RutaProtegida><Muro /></RutaProtegida>} />
        <Route path="*" element={<Navigate to="/mapa" replace />} />
      </Routes>
      <Avisos />
    </ProveedorSesion>
  );
}

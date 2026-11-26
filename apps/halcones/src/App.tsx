import { lazy, Suspense, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Avisos, Cargando, PantallaIngreso, PantallaSinAcceso, ProveedorSesion, RutaProtegida, useSesion } from "@plataforma/ui";

// Carga diferida: la Central (con el mapa) y la app del patrullero se descargan por separado.
const central = () => import("./central/rutas");
const pantalla = <K extends keyof Awaited<ReturnType<typeof central>>>(k: K) =>
  lazy(async () => ({ default: (await central())[k] as ComponentType }));
const Tablero = pantalla("Tablero");
const ListaProcedimientos = pantalla("ListaProcedimientos");
const Moviles = pantalla("Moviles");
const Bitacora = pantalla("Bitacora");
const Reportes = pantalla("Reportes");
const Claves = pantalla("Claves");
const Ajustes = pantalla("Ajustes");
const TurnosCentral = pantalla("TurnosCentral");
const Patrulla = lazy(async () => ({ default: (await import("./patrulla/Patrulla")).Patrulla }));

const CENTRAL = ["administrador", "jefatura", "supervisor", "operador"] as const;

function Inicio() {
  const { sesion } = useSesion();
  if (!sesion) return <Navigate to="/ingreso" replace />;
  return <Navigate to={sesion.usuario.rol === "patrullero" ? "/patrulla" : "/central"} replace />;
}

export function App() {
  return (
    <ProveedorSesion sistema="halcones">
      <Suspense fallback={<Cargando texto="Cargando…" />}>
      <Routes>
        <Route
          path="/ingreso"
          element={
            <PantallaIngreso
              destino={(s) => (s.usuario.rol === "patrullero" ? "/patrulla" : "/central")}
              puntos={[
                "Crea y despacha un procedimiento en menos de 30 segundos.",
                "Cola ordenada por el semáforo de cada clave.",
                "El patrullero recibe su procedimiento en el celular y avanza los estados.",
                "Cada paso queda con hora, autor y ubicación.",
              ]}
            />
          }
        />
        <Route path="/sin-acceso" element={<PantallaSinAcceso />} />
        <Route path="/" element={<Inicio />} />
        <Route path="/central" element={<RutaProtegida roles={[...CENTRAL]}><Tablero /></RutaProtegida>} />
        <Route path="/central/procedimientos" element={<RutaProtegida roles={[...CENTRAL]}><ListaProcedimientos /></RutaProtegida>} />
        <Route path="/central/moviles" element={<RutaProtegida roles={[...CENTRAL]}><Moviles /></RutaProtegida>} />
        <Route path="/central/bitacora" element={<RutaProtegida roles={[...CENTRAL]}><Bitacora /></RutaProtegida>} />
        <Route path="/central/reportes" element={<RutaProtegida roles={[...CENTRAL]}><Reportes /></RutaProtegida>} />
        <Route path="/central/turnos" element={<RutaProtegida roles={[...CENTRAL]}><TurnosCentral /></RutaProtegida>} />
        <Route path="/central/claves" element={<RutaProtegida roles={[...CENTRAL]}><Claves /></RutaProtegida>} />
        <Route path="/central/ajustes" element={<RutaProtegida roles={["administrador", "supervisor"]}><Ajustes /></RutaProtegida>} />
        <Route path="/patrulla/*" element={<RutaProtegida roles={["patrullero", "administrador"]}><Patrulla /></RutaProtegida>} />
        <Route path="*" element={<Inicio />} />
      </Routes>
      </Suspense>
      <Avisos />
    </ProveedorSesion>
  );
}

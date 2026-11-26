import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { cerrarSesion, registrarActividad, sesionActual, tieneAcceso, type Rol, type Sesion, type Sistema } from "@plataforma/datos";

interface ContextoSesion {
  sesion: Sesion | null;
  sistema: Sistema;
  entrar: (s: Sesion) => void;
  salir: () => void;
}

const Ctx = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ sistema, children }: { sistema: Sistema; children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => sesionActual());

  // Cierre por inactividad: cada interacción renueva la sesión; cada minuto se revisa si caducó.
  useEffect(() => {
    if (!sesion) return;
    const renovar = () => registrarActividad();
    const eventos = ["pointerdown", "keydown"] as const;
    eventos.forEach((e) => window.addEventListener(e, renovar, { passive: true }));
    const t = setInterval(() => {
      if (!sesionActual()) setSesion(null);
    }, 60000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, renovar));
      clearInterval(t);
    };
  }, [sesion]);

  const entrar = useCallback((s: Sesion) => setSesion(s), []);
  const salir = useCallback(() => {
    cerrarSesion();
    setSesion(null);
  }, []);
  const valor = useMemo(() => ({ sesion, sistema, entrar, salir }), [sesion, sistema, entrar, salir]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return c;
}

/** Usuario de la sesión. Solo usar dentro de una RutaProtegida. */
export function useUsuario() {
  const { sesion } = useSesion();
  if (!sesion) throw new Error("Sin sesión");
  return sesion.usuario;
}

/** Protege rutas: exige sesión, acceso al sistema y, opcionalmente, ciertos roles. */
export function RutaProtegida({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const { sesion, sistema } = useSesion();
  const ubicacion = useLocation();
  if (!sesion) return <Navigate to="/ingreso" replace state={{ desde: ubicacion.pathname }} />;
  if (!tieneAcceso(sesion.usuario.rol, sistema) || (roles && !roles.includes(sesion.usuario.rol))) {
    return <Navigate to="/sin-acceso" replace />;
  }
  return <>{children}</>;
}

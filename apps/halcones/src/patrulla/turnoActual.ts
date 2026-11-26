import { useDatos, type Movil, type Punto, type TurnoPersonal, type Usuario } from "@plataforma/datos";

/** Turno abierto del usuario: en un móvil o en un puesto (punto fijo, a pie). */
export interface TurnoActual {
  movil?: Movil;
  puesto?: TurnoPersonal;
  unidad: string;
  patrullero: string;
  halcon: string;
  acompanante: string;
  iniciadoEn: string;
}

export function useTurnoActual(usuario: Usuario): TurnoActual | null {
  const { moviles, personal } = useDatos();
  const movil = moviles.find((m) => m.turno?.usuarioId === usuario.id);
  if (movil?.turno) {
    const t = movil.turno;
    return { movil, unidad: movil.nombre, patrullero: t.patrullero, halcon: t.halcon ?? "", acompanante: t.acompanante, iniciadoEn: t.iniciadoEn };
  }
  const puesto = personal.find((p) => p.usuarioId === usuario.id);
  if (puesto) {
    return {
      puesto,
      unidad: puesto.modalidad === "punto_fijo" ? `Punto fijo · ${puesto.lugar}` : `A pie · ${puesto.lugar}`,
      patrullero: puesto.patrullero,
      halcon: puesto.halcon ?? "",
      acompanante: puesto.acompanante,
      iniciadoEn: puesto.iniciadoEn,
    };
  }
  return null;
}

/** Posición actual del celular, si el patrullero la comparte (no bloquea si no hay permiso). */
export function posicionActual(): Promise<Punto | undefined> {
  return new Promise((ok) => {
    if (!("geolocation" in navigator)) return ok(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => ok(undefined),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 },
    );
  });
}

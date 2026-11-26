/**
 * Google Maps para crear y despachar procedimientos.
 *
 * Se activa con VITE_GOOGLE_MAPS_KEY (clave restringida por dominio en Google Cloud, con Maps JavaScript API,
 * Places API (New) y Geocoding API habilitadas). Sin clave, o si Google no carga (sin internet, página que no
 * permite servicios externos), el sistema avisa y usa el mapa y el buscador propios.
 *
 * Condiciones de Google que el sistema respeta: los resultados se muestran en un mapa de Google con su logo, y
 * el punto que se guarda en el procedimiento es el que confirma o corrige el operador.
 */
const CLAVE = ((import.meta.env?.VITE_GOOGLE_MAPS_KEY as string | undefined) ?? "").trim();
/** Map ID del estilo (Google Cloud → Map Management). DEMO_MAP_ID sirve para pruebas. */
export const MAP_ID = ((import.meta.env?.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) ?? "").trim() || "DEMO_MAP_ID";

export const googleConfigurado = () => CLAVE.length > 0;

let carga: Promise<typeof google.maps> | null = null;

/** Carga la API de Google Maps una sola vez (15 s como máximo). */
export function cargarGoogle(): Promise<typeof google.maps> {
  if (!CLAVE) return Promise.reject(new Error("Falta la clave de Google Maps (VITE_GOOGLE_MAPS_KEY)"));
  if (typeof window !== "undefined" && typeof (window as { google?: { maps?: { importLibrary?: unknown } } }).google?.maps?.importLibrary === "function") return Promise.resolve(window.google.maps);
  if (!carga) {
    carga = new Promise<typeof google.maps>((ok, falla) => {
      const nombre = `__halconesGoogle${Date.now()}`;
      const tiempo = setTimeout(() => falla(new Error("Google Maps no respondió")), 15000);
      (window as unknown as Record<string, () => void>)[nombre] = () => {
        clearTimeout(tiempo);
        ok(window.google.maps);
      };
      const s = document.createElement("script");
      const p = new URLSearchParams({ key: CLAVE, v: "weekly", loading: "async", libraries: "places,marker,geocoding", language: "es", region: "CL", callback: nombre });
      s.src = `https://maps.googleapis.com/maps/api/js?${p}`;
      s.async = true;
      s.onerror = () => {
        clearTimeout(tiempo);
        falla(new Error("No se pudo cargar Google Maps"));
      };
      // Clave inválida o API no habilitada: Google llama a esta función global.
      (window as unknown as Record<string, () => void>).gm_authFailure = () => falla(new Error("Google rechazó la clave: revisa restricciones y APIs habilitadas"));
      document.head.appendChild(s);
    }).catch((e) => {
      carga = null;
      throw e;
    });
  }
  return carga;
}

/** Enlace para ver un punto en Google Maps normal (no usa la API ni la clave). */
export function enlaceGoogleMaps(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

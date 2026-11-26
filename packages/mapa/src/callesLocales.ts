import { Marker, type Map as MapaGL } from "maplibre-gl";
import { callesGeoJSON, calles, type Calle } from "@plataforma/datos";

/**
 * Calles de Conchalí dibujadas con los datos embebidos (sin servidor de mapas).
 * Se usan cuando el mapa base no carga (sin internet, página de demostración) y sobre la vista satelital.
 * Los nombres van como etiquetas HTML porque los textos de MapLibre necesitan fuentes descargadas de internet.
 */
export function agregarCallesLocales(m: MapaGL, modo: "plano" | "satelite" | "oculto") {
  if (!m.getSource("calles-locales")) m.addSource("calles-locales", { type: "geojson", data: callesGeoJSON() as never });
  const ancho = (base: number) => ["interpolate", ["linear"], ["zoom"], 12, ["*", base, 0.35], 15, base, 18, ["*", base, 2.6]];
  // Avenidas más anchas y en amarillo suave, como los planos de calles habituales.
  const porRango = (a: number, b: number, c: number, d: number) => ["match", ["get", "rango"], 3, a, 2, b, 1, c, d];
  m.addLayer({
    id: "calles-borde",
    type: "line",
    source: "calles-locales",
    layout: { "line-cap": "round", "line-join": "round", visibility: modo === "plano" ? "visible" : "none" },
    paint: { "line-color": "#C9D2DE", "line-width": ancho(porRango(9, 7, 5, 3) as never) as never },
  });
  m.addLayer({
    id: "calles",
    type: "line",
    source: "calles-locales",
    layout: { "line-cap": "round", "line-join": "round", visibility: modo === "oculto" ? "none" : "visible" },
    paint: {
      "line-color": modo === "satelite" ? "#FFFFFF" : (["match", ["get", "rango"], 3, "#FCD34D", 2, "#FEF3C7", "#FFFFFF"] as never),
      "line-width": ancho(porRango(7, 5, 3.4, 1.8) as never) as never,
      "line-opacity": modo === "plano" ? 1 : 0.55,
    },
  });
}

export function modoCallesLocales(m: MapaGL, modo: "plano" | "satelite" | "oculto") {
  if (!m.getLayer("calles")) return;
  m.setLayoutProperty("calles", "visibility", modo === "oculto" ? "none" : "visible");
  m.setLayoutProperty("calles-borde", "visibility", modo === "plano" ? "visible" : "none");
  m.setPaintProperty("calles", "line-color", modo === "satelite" ? "#FFFFFF" : (["match", ["get", "rango"], 3, "#FCD34D", 2, "#FEF3C7", "#FFFFFF"] as never));
  m.setPaintProperty("calles", "line-opacity", modo === "satelite" ? 0.55 : 1);
}

/** Etiqueta en el tramo más largo visible de cada calle, girada según la calle. */
function puntoEtiqueta(c: Calle, m: MapaGL): { lng: number; lat: number; angulo: number; largo: number } | null {
  const b = m.getBounds();
  let mejor: { lng: number; lat: number; angulo: number; largo: number } | null = null;
  for (const t of c.tramos)
    for (let i = 0; i + 1 < t.length; i++) {
      const [a, z] = [t[i], t[i + 1]];
      const medio = { lng: (a.lng + z.lng) / 2, lat: (a.lat + z.lat) / 2 };
      if (!b.contains([medio.lng, medio.lat])) continue;
      const pa = m.project([a.lng, a.lat]);
      const pz = m.project([z.lng, z.lat]);
      const largo = Math.hypot(pz.x - pa.x, pz.y - pa.y);
      if (!mejor || largo > mejor.largo) {
        let angulo = (Math.atan2(pz.y - pa.y, pz.x - pa.x) * 180) / Math.PI;
        if (angulo > 90) angulo -= 180;
        if (angulo < -90) angulo += 180;
        mejor = { ...medio, angulo, largo };
      }
    }
  return mejor;
}

/** Mantiene los nombres de calles visibles según el acercamiento. Devuelve la función para quitarlos. */
export function etiquetarCalles(m: MapaGL, oscuro: () => boolean): () => void {
  let marcas: Marker[] = [];
  const dibujar = () => {
    marcas.forEach((x) => x.remove());
    marcas = [];
    const z = m.getZoom();
    if (z < 13.6 || !m.getLayer("calles") || m.getLayoutProperty("calles", "visibility") === "none") return;
    const minimo = z >= 16 ? 0 : z >= 15 ? 1 : 2;
    const ocupadas: { x: number; y: number }[] = [];
    const lista = [...calles().values()].filter((c) => c.rango >= minimo).sort((a, b) => b.rango - a.rango);
    for (const c of lista) {
      const p = puntoEtiqueta(c, m);
      if (!p || p.largo < Math.min(70, c.nombre.length * 4)) continue;
      const px = m.project([p.lng, p.lat]);
      if (ocupadas.some((o) => Math.abs(o.x - px.x) < 90 && Math.abs(o.y - px.y) < 22)) continue;
      ocupadas.push(px);
      const el = document.createElement("span");
      el.className = `mapa-calle ${oscuro() ? "mapa-calle--oscuro" : ""} mapa-calle--r${c.rango}`;
      el.textContent = c.nombre.replace(/^Avenida /, "Av. ").replace(/^Pasaje /, "Pje. ").replace("Diagonal Cardenal José María Caro", "Cardenal J. M. Caro").replace("Presidente Eduardo Frei Montalva", "Pdte. Frei Montalva");
      el.setAttribute("aria-hidden", "true");
      el.style.setProperty("--giro", `${p.angulo}deg`);
      const mk = new Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
      mk.getElement().removeAttribute("role");
      mk.getElement().removeAttribute("aria-label");
      mk.getElement().tabIndex = -1;
      marcas.push(mk);
      if (marcas.length >= 70) break;
    }
  };
  m.on("moveend", dibujar);
  dibujar();
  return () => {
    m.off("moveend", dibujar);
    marcas.forEach((x) => x.remove());
  };
}

/** Fotos satelitales de Esri (World Imagery): requieren internet y mostrar el crédito. */
export const SATELITE = {
  tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
  credito: "Imágenes © Esri, Maxar, Earthstar Geographics",
};

export function agregarSatelite(m: MapaGL, antesDe: string | undefined) {
  if (m.getSource("satelite")) return;
  m.addSource("satelite", { type: "raster", tiles: SATELITE.tiles, tileSize: 256, maxzoom: 19, attribution: SATELITE.credito });
  m.addLayer({ id: "satelite", type: "raster", source: "satelite", layout: { visibility: "none" } }, antesDe);
}

import type { Map as MapaGL, StyleSpecification } from "maplibre-gl";

/**
 * Mapa base con calles.
 *
 * Por defecto usa OpenFreeMap (estilo «positron», claro): datos de OpenStreetMap, gratuito, sin clave ni registro.
 * Es un servicio «tal cual», sin garantía de disponibilidad, así que para la venta conviene un proveedor con contrato
 * o servidor propio: basta con cambiar VITE_MAPA_ESTILO_URL. Con VITE_MAPA_ESTILO_URL=ninguno se usa el mapa sin calles.
 * Si el estilo no carga (sin internet, red municipal que lo bloquea), el mapa sigue funcionando sin calles.
 */
const PREDETERMINADO = "https://tiles.openfreemap.org/styles/positron";
const CONFIGURADO = ((import.meta.env?.VITE_MAPA_ESTILO_URL as string | undefined) ?? "").trim();
export const URL_ESTILO = CONFIGURADO.toLowerCase() === "ninguno" ? "" : CONFIGURADO || PREDETERMINADO;

export const ESTILO_SIN_CALLES: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "fondo", type: "background", paint: { "background-color": "#F4F6FA" } }],
};

let cache: Promise<StyleSpecification | string> | null = null;

/** Devuelve la URL del estilo si responde en 6 s; si no, el mapa sin calles. */
export function resolverEstilo(): Promise<StyleSpecification | string> {
  if (!URL_ESTILO) return Promise.resolve(ESTILO_SIN_CALLES);
  if (!cache) {
    cache = (async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(URL_ESTILO, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(String(r.status));
        return URL_ESTILO;
      } catch {
        cache = null; // se reintenta al abrir otro mapa
        return ESTILO_SIN_CALLES;
      }
    })();
  }
  return cache;
}

export type TipoLugar = "salud" | "bomberos" | "policia" | "municipal";

export const LUGARES: Record<TipoLugar, { etiqueta: string; color: string; letra: string; clases: string[] }> = {
  salud: { etiqueta: "Centros de salud (SAPU, CESFAM, hospitales)", color: "#6941C6", letra: "S", clases: ["hospital", "clinic", "doctors"] },
  bomberos: { etiqueta: "Bomberos", color: "#C11574", letra: "B", clases: ["fire_station"] },
  policia: { etiqueta: "Carabineros y PDI", color: "#155B75", letra: "C", clases: ["police"] },
  municipal: { etiqueta: "Edificios municipales (mapa base)", color: "#0F766E", letra: "M", clases: ["town_hall", "townhall"] },
};

/** Primera capa de textos del estilo base: nuestras capas de relleno van debajo para no tapar los nombres de calles. */
export function primeraCapaDeTexto(m: MapaGL): string | undefined {
  return m.getStyle().layers.find((l) => l.type === "symbol")?.id;
}

function fuenteDelEstilo(m: MapaGL): string[] {
  const conFuente = m.getStyle().layers.find((l) => l.type === "symbol" && (l.layout as Record<string, unknown> | undefined)?.["text-font"]);
  const f = (conFuente?.layout as Record<string, unknown> | undefined)?.["text-font"];
  return Array.isArray(f) ? (f as string[]) : ["Noto Sans Regular"];
}

/**
 * Lugares de interés desde los datos de OpenStreetMap que trae el mapa base (capa «poi» de OpenMapTiles).
 * Pueden estar incompletos: los propios del municipio se cargan aparte (puntos de interés).
 */
export function agregarLugares(m: MapaGL): boolean {
  const fuente = Object.entries(m.getStyle().sources).find(([, s]) => s.type === "vector")?.[0];
  if (!fuente) return false;
  const texto = fuenteDelEstilo(m);
  for (const [tipo, l] of Object.entries(LUGARES) as [TipoLugar, (typeof LUGARES)[TipoLugar]][]) {
    const filtro = ["any", ["in", ["get", "class"], ["literal", l.clases]], ["in", ["get", "subclass"], ["literal", l.clases]]];
    m.addLayer({
      id: `lugar-${tipo}`,
      type: "circle",
      source: fuente,
      "source-layer": "poi",
      filter: filtro as never,
      layout: { visibility: "none" },
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 5, 16, 9], "circle-color": l.color, "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 },
    });
    m.addLayer({
      id: `lugar-${tipo}-texto`,
      type: "symbol",
      source: fuente,
      "source-layer": "poi",
      filter: filtro as never,
      minzoom: 14,
      layout: {
        visibility: "none",
        "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
        "text-font": texto,
        "text-size": 11,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: { "text-color": l.color, "text-halo-color": "#FFFFFF", "text-halo-width": 1.5 },
    });
  }
  return true;
}

/** Avenidas principales resaltadas sobre el mapa base. */
export function agregarAvenidas(m: MapaGL, antesDe?: string) {
  const fuente = Object.entries(m.getStyle().sources).find(([, s]) => s.type === "vector")?.[0];
  if (!fuente) return;
  m.addLayer(
    {
      id: "avenidas",
      type: "line",
      source: fuente,
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]] as never,
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#F2C94C", "line-opacity": 0.6, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2, 16, 6] },
    },
    antesDe,
  );
}

/** Nombre de la calle más cercana al punto tocado, leído de las etiquetas del mapa base. */
export function calleEn(m: MapaGL, x: number, y: number): string | null {
  const r = 24;
  const f = m.queryRenderedFeatures(
    [
      [x - r, y - r],
      [x + r, y + r],
    ],
  ).find((g) => (g.sourceLayer === "transportation_name" || g.sourceLayer === "transportation") && (g.properties["name:es"] || g.properties.name));
  return f ? String(f.properties["name:es"] ?? f.properties.name) : null;
}

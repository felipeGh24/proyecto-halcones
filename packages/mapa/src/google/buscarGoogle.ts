import { candidatosEsquina, LIMITES_COMUNA, limpiar, partirNumero, unidadVecinalCercana, type Punto, type SugerenciaDireccion } from "@plataforma/datos";
import { cargarGoogle } from "./cargar";

/**
 * Buscador de direcciones con Google (Places API New + Geocoding API), limitado a Conchalí.
 * Las sugerencias usan un token de sesión: Google cobra la sesión al elegir, no cada letra escrita.
 */
const LIMITES = { west: LIMITES_COMUNA.minLng - 0.004, south: LIMITES_COMUNA.minLat - 0.004, east: LIMITES_COMUNA.maxLng + 0.004, north: LIMITES_COMUNA.maxLat + 0.004 };

let sesion: google.maps.places.AutocompleteSessionToken | null = null;

function dentro(p: Punto) {
  return !!unidadVecinalCercana(p);
}

async function geocodificar(direccion: string): Promise<google.maps.GeocoderResult[]> {
  const g = await cargarGoogle();
  const { Geocoder } = (await g.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
  const r = await new Geocoder().geocode({ address: direccion, bounds: LIMITES, componentRestrictions: { country: "CL" }, language: "es", region: "cl" });
  return r.results ?? [];
}

/** Sugerencias de Google para lo que escribe el operador. Las esquinas se consultan como «A & B». */
export async function buscarDireccionesGoogle(texto: string, signal?: AbortSignal): Promise<SugerenciaDireccion[]> {
  const t = limpiar(texto);
  if (t.length < 3) return [];
  const g = await cargarGoogle();
  if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");

  // Esquinas: el Geocoding API de Google entiende «Calle A & Calle B».
  const esquinas = partirNumero(t) ? [] : candidatosEsquina(t).slice(0, 1);
  if (esquinas.length) {
    const [a, b] = esquinas[0];
    const rs = await geocodificar(`${a} & ${b}, Conchalí, Región Metropolitana, Chile`);
    const out = rs
      .filter((r) => r.types.includes("intersection") || r.types.includes("street_address") || r.types.includes("route"))
      .map((r) => ({ texto: r.formatted_address.replace(/, Chile$/, ""), detalle: r.types.includes("intersection") ? "Esquina · Google Maps" : "Google Maps", punto: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() }, tipo: (r.types.includes("intersection") ? "esquina" : "calle") as SugerenciaDireccion["tipo"] }))
      .filter((s) => dentro(s.punto));
    if (out.length) return out.slice(0, 3);
  }

  const { AutocompleteSuggestion, AutocompleteSessionToken } = (await g.importLibrary("places")) as google.maps.PlacesLibrary;
  sesion ??= new AutocompleteSessionToken();
  const token = sesion;
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: `${t}, Conchalí`,
    sessionToken: token,
    locationRestriction: LIMITES,
    includedRegionCodes: ["cl"],
    language: "es",
    region: "cl",
  });
  if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
  return suggestions
    .filter((s) => s.placePrediction)
    .slice(0, 5)
    .map((s) => {
      const pred = s.placePrediction!;
      return {
        texto: pred.mainText?.toString() ?? pred.text.toString(),
        detalle: `${pred.secondaryText?.toString() ?? ""} · Google Maps`.replace(/^ · /, ""),
        punto: { lat: 0, lng: 0 },
        tipo: "direccion" as const,
        // El punto se pide al elegir (cierra la sesión de autocompletado).
        resolver: async () => {
          const lugar = pred.toPlace();
          await lugar.fetchFields({ fields: ["location", "formattedAddress"] });
          sesion = null;
          const loc = lugar.location;
          if (!loc) throw new Error("Google no entregó el punto de esa dirección");
          return { lat: loc.lat(), lng: loc.lng() };
        },
      };
    });
}

/** Dirección (calle y número) del punto marcado, según Google. */
export async function direccionGoogle(p: Punto): Promise<string | null> {
  try {
    const g = await cargarGoogle();
    const { Geocoder } = (await g.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
    const r = await new Geocoder().geocode({ location: p, language: "es" });
    const mejor = r.results.find((x) => x.types.includes("street_address") || x.types.includes("premise")) ?? r.results[0];
    return mejor ? mejor.formatted_address.replace(/, (Conchalí|Región Metropolitana|Chile).*$/, "") : null;
  } catch {
    return null;
  }
}

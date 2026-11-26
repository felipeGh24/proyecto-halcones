import { useEffect, useRef, useState } from "react";
import { CENTRO_COMUNA, LIMITES_COMUNA, UNIDADES_VECINALES, type Punto } from "@plataforma/datos";
import { cargarGoogle, MAP_ID } from "./cargar";

/**
 * Mapa de Google para fijar el punto exacto de un procedimiento.
 * Clic en el mapa o arrastrar el marcador = punto confirmado por el operador (es lo que se guarda).
 * Muestra el límite de las unidades vecinales para ver de un vistazo si el punto está en la comuna.
 */
export function MapaGoogle({
  marcador,
  onMarcar,
  enfocar,
  onFallo,
}: {
  marcador: Punto | null;
  onMarcar: (p: Punto) => void;
  enfocar?: Punto | null;
  /** Google no cargó (sin internet, clave rechazada): el formulario vuelve al mapa propio. */
  onFallo: (motivo: string) => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const pin = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const cb = useRef({ onMarcar, onFallo });
  cb.current = { onMarcar, onFallo };
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarGoogle()
      .then(async (g) => {
        if (!vivo || !caja.current) return;
        const { Map } = (await g.importLibrary("maps")) as google.maps.MapsLibrary;
        const m = new Map(caja.current, {
          mapId: MAP_ID,
          center: CENTRO_COMUNA,
          zoom: 14,
          mapTypeControl: true,
          mapTypeControlOptions: { mapTypeIds: ["roadmap", "hybrid"] },
          streetViewControl: true,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          restriction: { latLngBounds: { west: LIMITES_COMUNA.minLng - 0.05, east: LIMITES_COMUNA.maxLng + 0.05, south: LIMITES_COMUNA.minLat - 0.04, north: LIMITES_COMUNA.maxLat + 0.04 } },
        });
        m.fitBounds({ west: LIMITES_COMUNA.minLng, east: LIMITES_COMUNA.maxLng, south: LIMITES_COMUNA.minLat, north: LIMITES_COMUNA.maxLat }, 16);
        m.data.addGeoJson(UNIDADES_VECINALES);
        m.data.setStyle({ fillOpacity: 0, strokeColor: "#1D4ED8", strokeOpacity: 0.45, strokeWeight: 1, clickable: false });
        m.addListener("click", (e: google.maps.MapMouseEvent) => e.latLng && cb.current.onMarcar({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
        mapa.current = m;
        setListo(true);
      })
      .catch((e: Error) => vivo && cb.current.onFallo(e.message));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    void (async () => {
      if (!marcador) {
        if (pin.current) pin.current.map = null;
        pin.current = null;
        return;
      }
      if (!pin.current) {
        const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
        pin.current = new AdvancedMarkerElement({ map: m, position: marcador, gmpDraggable: true, title: "Punto del procedimiento: arrástralo para corregir" });
        pin.current.addListener("dragend", () => {
          const p = pin.current?.position as google.maps.LatLngLiteral | null;
          if (p) cb.current.onMarcar({ lat: Number(p.lat), lng: Number(p.lng) });
        });
      } else pin.current.position = marcador;
    })();
  }, [listo, marcador]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !enfocar) return;
    m.panTo(enfocar);
    if ((m.getZoom() ?? 0) < 17) m.setZoom(17);
  }, [listo, enfocar]);

  return (
    <div className="mapa-google">
      <div ref={caja} className="mapa-google__lienzo" />
      {!listo && <div className="mapa__aviso">Cargando Google Maps…</div>}
    </div>
  );
}

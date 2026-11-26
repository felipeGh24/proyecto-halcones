import { useEffect, useRef, useState } from "react";
import { guardarArchivo, tamano, urlDeAdjunto, type Adjunto } from "@plataforma/datos";
import { Icono } from "./Icono";

const ORIGENES = [
  { id: "foto", texto: "Tomar foto", icono: "ojo", accept: "image/*", capture: "environment", multiple: false },
  { id: "video", texto: "Grabar video", icono: "pantalla", accept: "video/*", capture: "environment", multiple: false },
  { id: "galeria", texto: "Galería", icono: "mas", accept: "image/*,video/*", capture: undefined, multiple: true },
] as const;

/**
 * Fotos y videos: en el celular, «Tomar foto» y «Grabar video» abren directo la cámara trasera;
 * «Galería» permite elegir varios archivos. Las fotos se comprimen antes de guardarse.
 */
export function SelectorAdjuntos({ adjuntos, onCambio, etiqueta }: { adjuntos: Adjunto[]; onCambio: (a: Adjunto[]) => void; etiqueta?: string }) {
  const entradas = useRef<Record<string, HTMLInputElement | null>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function agregar(lista: FileList) {
    setError("");
    setCargando(true);
    const nuevos: Adjunto[] = [];
    for (const f of Array.from(lista)) {
      try {
        nuevos.push(await guardarArchivo(f));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el archivo");
      }
    }
    setCargando(false);
    if (nuevos.length) onCambio([...adjuntos, ...nuevos]);
  }

  return (
    <div className="adjuntos">
      {etiqueta && <span className="ui-campo__etiqueta">{etiqueta}</span>}
      <div className="adjuntos__botones" role="group" aria-label="Agregar fotos o videos">
        {ORIGENES.map((o) => (
          <span key={o.id}>
            <button type="button" className="ui-boton ui-boton--secundario adjuntos__boton" onClick={() => entradas.current[o.id]?.click()} disabled={cargando}>
              <Icono nombre={o.icono} /> {o.texto}
            </button>
            <input
              ref={(el) => {
                entradas.current[o.id] = el;
              }}
              data-origen={o.id}
              type="file"
              accept={o.accept}
              capture={o.capture}
              multiple={o.multiple}
              hidden
              onChange={(e) => {
                if (e.target.files?.length) void agregar(e.target.files);
                e.target.value = "";
              }}
            />
          </span>
        ))}
      </div>
      {cargando && <span className="ui-campo__ayuda" role="status">Optimizando y guardando…</span>}
      {error && <span className="ui-campo__error">{error}</span>}
      {adjuntos.length > 0 && <VistaAdjuntos adjuntos={adjuntos} onQuitar={(id) => onCambio(adjuntos.filter((a) => a.id !== id))} />}
    </div>
  );
}

/** Miniaturas de fotos y videos; al tocar una foto se abre en grande. */
export function VistaAdjuntos({ adjuntos, onQuitar }: { adjuntos: Adjunto[]; onQuitar?: (id: string) => void }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [grande, setGrande] = useState<string | null>(null);
  const firma = adjuntos.map((a) => a.id).join("|");

  useEffect(() => {
    let vivo = true;
    void Promise.all(adjuntos.map(async (a) => [a.id, await urlDeAdjunto(a.id)] as const)).then((pares) => {
      if (vivo) setUrls(Object.fromEntries(pares));
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  return (
    <>
      <ul className="adjuntos__lista">
        {adjuntos.map((a) => {
          const u = urls[a.id];
          return (
            <li key={a.id} className="adjuntos__item">
              {u ? (
                a.tipo === "imagen" ? (
                  <button type="button" className="adjuntos__mini" onClick={() => setGrande(u)} aria-label={`Ver ${a.nombre}`}>
                    <img src={u} alt={a.nombre} />
                  </button>
                ) : (
                  <video className="adjuntos__mini" src={u} controls preload="metadata" />
                )
              ) : (
                <span className="adjuntos__mini adjuntos__ausente" title="El archivo está en el equipo que lo cargó; con la base de datos se verá en todos">
                  <Icono nombre={a.tipo === "video" ? "pantalla" : "documento"} />
                </span>
              )}
              <span className="adjuntos__nombre" title={a.nombre}>
                {a.tipo === "video" ? "Video" : "Foto"} · {tamano(a.bytes)}
              </span>
              {onQuitar && (
                <button type="button" className="adjuntos__quitar" onClick={() => onQuitar(a.id)} aria-label={`Quitar ${a.nombre}`}>
                  <Icono nombre="cerrar" tamano={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {grande && (
        <div className="ui-velo" onClick={() => setGrande(null)} role="dialog" aria-label="Foto ampliada">
          <img src={grande} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}
    </>
  );
}

import { useEffect, useRef } from "react";
import { obtenerClave, obtenerCliente, unidadesActivas, type Procedimiento, type UnidadAsignada } from "@plataforma/datos";
import { Boton, Icono, Semaforo, useUsuario } from "@plataforma/ui";

/** Tono corto de alerta (sin archivos de audio). */
function sonar() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.26);
    });
  } catch {
    /* sin audio */
  }
}

/** Pide permiso de notificaciones una vez (al iniciar turno): así el aviso llega aunque la app esté en segundo plano. */
export function pedirPermisoNotificaciones() {
  try {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* navegador sin notificaciones */
  }
}

/**
 * Aviso de despacho: ocupa toda la pantalla, vibra y suena hasta que el patrullero toca «Entendido».
 * La Central ve cuándo cada unidad confirmó el aviso.
 */
export function AvisoDespacho({ procedimiento: p, unidad }: { procedimiento: Procedimiento; unidad: UnidadAsignada }) {
  const usuario = useUsuario();
  const avisado = useRef(false);
  const clave = obtenerClave(p.claveNumero);
  const otras = unidadesActivas(p).filter((u) => u.id !== unidad.id);

  useEffect(() => {
    if (avisado.current) return;
    avisado.current = true;
    sonar();
    try {
      navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
      /* sin vibración */
    }
    try {
      if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
        new Notification(`${unidad.aCargo ? "Procedimiento" : "Apoyo"}: ${p.claveNumero} ${clave?.nombre ?? ""}`, { body: p.direccion, tag: p.id, requireInteraction: true });
      }
    } catch {
      /* sin notificaciones */
    }
  }, [p, unidad, clave]);

  return (
    <div className="aviso-despacho" role="alertdialog" aria-modal="true" aria-labelledby="aviso-titulo">
      <div className="aviso-despacho__caja">
        <span className="aviso-despacho__tipo">
          <Icono nombre="sirena" tamano={20} /> {unidad.aCargo ? "Te despacharon · vas a cargo" : "Te enviaron de apoyo"}
        </span>
        <Semaforo claveNumero={p.claveNumero} />
        <h1 id="aviso-titulo">
          {p.claveNumero} · {clave?.nombre}
        </h1>
        <p className="aviso-despacho__dir">
          <Icono nombre="pin" /> {p.direccion}
        </p>
        {p.descripcion && <p>{p.descripcion}</p>}
        {otras.length > 0 && (
          <p className="pequeno">
            También van: {otras.map((o) => `${o.nombre}${o.aCargo ? " (a cargo)" : ""}`).join(", ")}
          </p>
        )}
        <Boton variante="primario" grande bloque icono="check" onClick={() => obtenerCliente().confirmarAviso(p.id, unidad.id, usuario)}>
          Entendido
        </Boton>
      </div>
    </div>
  );
}

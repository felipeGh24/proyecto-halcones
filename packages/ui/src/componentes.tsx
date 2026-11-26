import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { infoDeClave, obtenerClave, PRIORIDADES, type Prioridad } from "@plataforma/datos";
import { Icono, type NombreIcono } from "./Icono";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Botón ---------- */
type Variante = "primario" | "secundario" | "fantasma" | "peligro";
export function Boton({
  variante = "secundario",
  grande,
  bloque,
  icono,
  soloIcono,
  className,
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean; bloque?: boolean; icono?: NombreIcono; soloIcono?: boolean }) {
  return (
    <button
      type="button"
      className={cx("ui-boton", `ui-boton--${variante}`, grande && "ui-boton--grande", bloque && "ui-boton--bloque", soloIcono && "ui-boton--icono", className)}
      {...resto}
    >
      {icono && <Icono nombre={icono} tamano={grande ? 22 : 18} />}
      {soloIcono ? <span className="solo-lector">{children}</span> : children}
    </button>
  );
}

/* ---------- Tarjeta ---------- */
export function Tarjeta({ titulo, subtitulo, acciones, children, className, sinRelleno }: { titulo?: ReactNode; subtitulo?: ReactNode; acciones?: ReactNode; children?: ReactNode; className?: string; sinRelleno?: boolean }) {
  return (
    <section className={cx("ui-tarjeta", className)}>
      {(titulo || acciones) && (
        <header className="ui-tarjeta__cabeza">
          <div>
            {titulo && <h2 style={{ fontSize: 15 }}>{titulo}</h2>}
            {subtitulo && <p className="ui-tarjeta__sub">{subtitulo}</p>}
          </div>
          {acciones}
        </header>
      )}
      {sinRelleno ? children : <div className="ui-tarjeta__cuerpo">{children}</div>}
    </section>
  );
}

/* ---------- Semáforo ---------- */
/** Muestra el semáforo con color, luz y texto (nunca solo color). */
export function Semaforo({ claveNumero, prioridad, conClave }: { claveNumero?: number; prioridad?: Prioridad; conClave?: boolean }) {
  const info = claveNumero != null ? infoDeClave(claveNumero) : PRIORIDADES[prioridad ?? "baja"];
  const clave = claveNumero != null ? obtenerClave(claveNumero) : undefined;
  return (
    <span className={cx("ui-semaforo", `ui-semaforo--${info.semaforo}`, info.prioridad === "critica" && "ui-semaforo--critica")} title={`Prioridad ${info.etiqueta} · respuesta ${info.respuesta}`}>
      <span className="ui-semaforo__luz" aria-hidden />
      {conClave && clave ? `${clave.numero} · ` : ""}
      {info.etiqueta}
    </span>
  );
}

/* ---------- Insignia ---------- */
export function Insignia({ tono = "neutro", punto, children }: { tono?: "neutro" | "info" | "ok" | "alerta" | "peligro" | "demo"; punto?: boolean; children: ReactNode }) {
  return (
    <span className={cx("ui-insignia", tono !== "neutro" && `ui-insignia--${tono}`)}>
      {punto && <span className="ui-insignia__punto" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Indicador ---------- */
export function Indicador({ etiqueta, valor, detalle, alerta, icono }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode; alerta?: boolean; icono?: NombreIcono }) {
  return (
    <div className={cx("ui-indicador", alerta && "ui-indicador--alerta")}>
      <span className="ui-indicador__etiqueta">
        {icono && <Icono nombre={icono} tamano={14} />}
        {etiqueta}
      </span>
      <span className="ui-indicador__valor">{valor}</span>
      {detalle && <span className="ui-indicador__detalle">{detalle}</span>}
    </div>
  );
}

/* ---------- Campo ---------- */
export function Campo({ etiqueta, ayuda, error, children, htmlFor }: { etiqueta: string; ayuda?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="ui-campo">
      <label className="ui-campo__etiqueta" htmlFor={htmlFor}>
        {etiqueta}
      </label>
      {children}
      {error ? <span className="ui-campo__error" role="alert">{error}</span> : ayuda ? <span className="ui-campo__ayuda">{ayuda}</span> : null}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ titulo, subtitulo, onCerrar, children, pie, ancho }: { titulo: string; subtitulo?: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode; ancho?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      anterior?.focus();
    };
  }, [onCerrar]);
  return (
    <div className="ui-velo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={cx("ui-modal", ancho && "ui-modal--ancho")} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <header className="ui-modal__cabeza">
          <div>
            <h2 id={id}>{titulo}</h2>
            {subtitulo && <p className="texto-3 pequeno">{subtitulo}</p>}
          </div>
          <Boton variante="fantasma" icono="cerrar" soloIcono onClick={onCerrar}>
            Cerrar
          </Boton>
        </header>
        <div className="ui-modal__cuerpo">{children}</div>
        {pie && <footer className="ui-modal__pie">{pie}</footer>}
      </div>
    </div>
  );
}

/* ---------- Vacío y carga ---------- */
export function Vacio({ icono = "lista", titulo, children, ilustracion }: { icono?: NombreIcono; titulo: string; children?: ReactNode; ilustracion?: ReactNode }) {
  return (
    <div className="ui-vacio">
      {ilustracion ?? (
        <span className="ui-vacio__icono">
          <Icono nombre={icono} />
        </span>
      )}
      <strong style={{ color: "var(--texto)" }}>{titulo}</strong>
      {children && <p className="pequeno">{children}</p>}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="ui-vacio" role="status">
      <span className="ui-cargando" />
      <span className="pequeno">{texto}</span>
    </div>
  );
}

/* ---------- Segmentos ---------- */
export function Segmentos<T extends string>({ opciones, valor, onCambio, etiqueta }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <div className="ui-segmentos" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => onCambio(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/* ---------- Reloj ---------- */
export function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="ui-reloj" aria-label="Hora actual">
      {ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Santiago" })}
    </span>
  );
}

/* ---------- Avisos con deshacer ---------- */
type Aviso = { id: number; texto: string; deshacer?: () => void };
let emitir: ((a: Omit<Aviso, "id">) => void) | null = null;

export function avisar(texto: string, deshacer?: () => void) {
  emitir?.({ texto, deshacer });
}

export function Avisos() {
  const [lista, setLista] = useState<Aviso[]>([]);
  useEffect(() => {
    let n = 0;
    emitir = (a) => {
      const id = ++n;
      // Solo los dos más recientes: en el celular los avisos no deben tapar los botones.
      setLista((l) => [...l, { ...a, id }].slice(-2));
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), a.deshacer ? 6000 : 3500);
    };
    return () => {
      emitir = null;
    };
  }, []);
  return (
    <div className="ui-avisos" aria-live="polite">
      {lista.map((a) => (
        <div className="ui-aviso" key={a.id}>
          <Icono nombre="check" />
          {a.texto}
          {a.deshacer && (
            <button
              type="button"
              className="ui-boton ui-boton--fantasma"
              style={{ color: "#fff", minHeight: 32 }}
              onClick={() => {
                a.deshacer?.();
                setLista((l) => l.filter((x) => x.id !== a.id));
              }}
            >
              Deshacer
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

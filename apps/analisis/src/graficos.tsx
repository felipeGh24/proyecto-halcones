import { numero } from "@plataforma/datos";

/**
 * Gráficos en SVG propio: ejes rotulados, unidades y sin colores decorativos.
 * El azul primario es el color de los datos; el rojo y el ámbar quedan para alertas y semáforo.
 */

const AZUL = "#1D4ED8";
const GRIS = "#98A2B3";
const REJILLA = "#E3E8EF";
const TEXTO = "#475467";

function pasos(max: number, n = 4) {
  if (max <= 0) return [0, 1];
  const bruto = max / n;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= bruto) ?? bruto;
  const lista: number[] = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) lista.push(v);
  if (lista[lista.length - 1] < max) lista.push(lista[lista.length - 1] + paso);
  return lista;
}

/** Línea diaria con promedio móvil de 7 días. */
export function GraficoEvolucion({ dias, unidad = "procedimientos por día" }: { dias: { fecha: string; n: number }[]; unidad?: string }) {
  const W = 720, H = 240, izq = 40, der = 12, arr = 12, aba = 28;
  const max = Math.max(1, ...dias.map((d) => d.n));
  const ticks = pasos(max);
  const top = ticks[ticks.length - 1];
  const x = (i: number) => izq + (i / Math.max(1, dias.length - 1)) * (W - izq - der);
  const y = (v: number) => H - aba - (v / top) * (H - arr - aba);
  const prom = dias.map((_, i) => {
    const v = dias.slice(Math.max(0, i - 6), i + 1);
    return v.reduce((s, d) => s + d.n, 0) / v.length;
  });
  const etiquetas = dias.map((d, i) => ({ i, d })).filter(({ i }) => i % Math.ceil(dias.length / 6) === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label={`Evolución diaria: ${unidad}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={izq} x2={W - der} y1={y(t)} y2={y(t)} stroke={REJILLA} />
          <text x={izq - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
            {numero(t)}
          </text>
        </g>
      ))}
      <polyline fill="none" stroke={GRIS} strokeWidth="1" points={dias.map((d, i) => `${x(i)},${y(d.n)}`).join(" ")} />
      <polyline fill="none" stroke={AZUL} strokeWidth="2.5" points={prom.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      {etiquetas.map(({ i, d }) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXTO}>
          {new Date(d.fecha + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
        </text>
      ))}
    </svg>
  );
}

/** Matriz hora × día de la semana, escala secuencial azul. */
export function MapaCalorHoras({ matriz }: { matriz: number[][] }) {
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const W = 720, izq = 40, arr = 8, celda = (W - izq - 8) / 24, alto = 24, H = arr + alto * 7 + 26;
  const max = Math.max(1, ...matriz.flat());
  const color = (v: number) => {
    const t = v / max;
    const mezcla = (a: number, b: number) => Math.round(a + (b - a) * t);
    return `rgb(${mezcla(244, 29)}, ${mezcla(246, 78)}, ${mezcla(250, 216)})`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Procedimientos por hora y día de la semana">
      {matriz.map((fila, d) => (
        <g key={d}>
          <text x={izq - 8} y={arr + d * alto + alto / 2 + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
            {dias[d]}
          </text>
          {fila.map((v, h) => (
            <rect key={h} x={izq + h * celda + 1} y={arr + d * alto + 1} width={celda - 2} height={alto - 2} rx="3" fill={color(v)}>
              <title>{`${dias[d]} ${String(h).padStart(2, "0")}:00 — ${v} procedimientos`}</title>
            </rect>
          ))}
        </g>
      ))}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
        <text key={h} x={izq + h * celda + celda / 2} y={H - 6} textAnchor="middle" fontSize="11" fill={TEXTO}>
          {String(h).padStart(2, "0")} h
        </text>
      ))}
    </svg>
  );
}

/** Barras horizontales ordenadas, con el valor escrito al final de cada barra. */
export function BarrasHorizontales({ filas, unidad }: { filas: { etiqueta: string; detalle?: string; n: number }[]; unidad: string }) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <ol className="barras" aria-label={unidad}>
      {filas.map((f) => (
        <li key={f.etiqueta}>
          <span className="barras__etiqueta">
            {f.etiqueta}
            {f.detalle && <span className="texto-3 pequeno"> {f.detalle}</span>}
          </span>
          <span className="barras__pista">
            <i style={{ width: `${(f.n / max) * 100}%` }} />
          </span>
          <span className="barras__valor num">{numero(f.n)}</span>
        </li>
      ))}
    </ol>
  );
}

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

/** Barras verticales con valor sobre cada barra y eje Y rotulado. */
export function BarrasVerticales({ datos, unidad, alto = 220 }: { datos: { etiqueta: string; n: number; resaltar?: boolean }[]; unidad: string; alto?: number }) {
  const W = 520, H = alto, izq = 36, der = 8, arr = 20, aba = 26;
  const ticks = pasos(Math.max(1, ...datos.map((d) => d.n)));
  const top = ticks[ticks.length - 1];
  const ancho = (W - izq - der) / datos.length;
  const y = (v: number) => H - aba - (v / top) * (H - arr - aba);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label={unidad}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={izq} x2={W - der} y1={y(t)} y2={y(t)} stroke={REJILLA} />
          <text x={izq - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
            {numero(t)}
          </text>
        </g>
      ))}
      {datos.map((d, i) => (
        <g key={d.etiqueta}>
          <rect x={izq + i * ancho + ancho * 0.18} y={y(d.n)} width={ancho * 0.64} height={Math.max(0, H - aba - y(d.n))} rx="3" fill={d.resaltar ? AZUL : "#84ADFF"} />
          <text x={izq + i * ancho + ancho / 2} y={y(d.n) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0E1A2B">
            {numero(d.n)}
          </text>
          <text x={izq + i * ancho + ancho / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXTO}>
            {d.etiqueta}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Barras apiladas por semáforo (los colores del semáforo sí significan algo aquí). */
export function BarrasSemaforo({ grupos }: { grupos: { etiqueta: string; rojo: number; amarillo: number; verde: number }[] }) {
  const W = 520, H = 220, izq = 36, der = 8, arr = 20, aba = 26;
  const ticks = pasos(Math.max(1, ...grupos.map((g) => g.rojo + g.amarillo + g.verde)));
  const top = ticks[ticks.length - 1];
  const ancho = (W - izq - der) / grupos.length;
  const alto = (v: number) => (v / top) * (H - arr - aba);
  const colores = { rojo: "#B42318", amarillo: "#DC6803", verde: "#079455" } as const;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Procedimientos por turno y semáforo">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={izq} x2={W - der} y1={H - aba - alto(t)} y2={H - aba - alto(t)} stroke={REJILLA} />
          <text x={izq - 6} y={H - aba - alto(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
            {numero(t)}
          </text>
        </g>
      ))}
      {grupos.map((g, i) => {
        let base = H - aba;
        const total = g.rojo + g.amarillo + g.verde;
        return (
          <g key={g.etiqueta}>
            {(["rojo", "amarillo", "verde"] as const).map((s) => {
              const h = alto(g[s]);
              base -= h;
              return (
                <rect key={s} x={izq + i * ancho + ancho * 0.22} y={base} width={ancho * 0.56} height={h} fill={colores[s]} stroke="#fff" strokeWidth="1">
                  <title>{`${g.etiqueta} · ${s}: ${g[s]}`}</title>
                </rect>
              );
            })}
            <text x={izq + i * ancho + ancho / 2} y={base - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0E1A2B">
              {numero(total)}
            </text>
            <text x={izq + i * ancho + ancho / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXTO}>
              {g.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Histograma del tiempo de respuesta con las metas marcadas. */
export function HistogramaRespuesta({ minutos }: { minutos: number[] }) {
  const cortes = [0, 2, 4, 6, 8, 10, 12, 15, 20, 30];
  const conteo = cortes.map((c, i) => minutos.filter((m) => m >= c && (i === cortes.length - 1 || m < cortes[i + 1])).length);
  const W = 1040, H = 260, izq = 40, der = 8, arr = 40, aba = 40;
  const ticks = pasos(Math.max(1, ...conteo));
  const top = ticks[ticks.length - 1];
  const ancho = (W - izq - der) / cortes.length;
  const y = (v: number) => H - aba - (v / top) * (H - arr - aba);
  const xDe = (min: number) => {
    const i = cortes.findIndex((c, k) => k === cortes.length - 1 || (min >= c && min < cortes[k + 1]));
    const sig = cortes[i + 1] ?? cortes[i] + 10;
    return izq + (i + (min - cortes[i]) / (sig - cortes[i])) * ancho;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Distribución del tiempo de respuesta en minutos">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={izq} x2={W - der} y1={y(t)} y2={y(t)} stroke={REJILLA} />
          <text x={izq - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
            {numero(t)}
          </text>
        </g>
      ))}
      {conteo.map((n, i) => (
        <rect key={i} x={izq + i * ancho + 2} y={y(n)} width={ancho - 4} height={Math.max(0, H - aba - y(n))} rx="2" fill="#84ADFF">
          <title>{`${cortes[i]}${i === cortes.length - 1 ? "+" : `–${cortes[i + 1]}`} min: ${n}`}</title>
        </rect>
      ))}
      {[
        { m: 3, t: "meta crítica 3 min", fila: 0 },
        { m: 5, t: "meta alta 5 min", fila: 1 },
        { m: 15, t: "meta media 15 min", fila: 0 },
      ].map(({ m, t, fila }) => (
        <g key={m}>
          <line x1={xDe(m)} x2={xDe(m)} y1={10 + fila * 14} y2={H - aba} stroke="#0E1A2B" strokeDasharray="3 3" />
          <text x={xDe(m) + 4} y={18 + fila * 14} fontSize="11" fill="#0E1A2B">
            {t}
          </text>
        </g>
      ))}
      {cortes.map((c, i) => (
        <text key={c} x={izq + i * ancho + 2} y={H - 22} textAnchor="middle" fontSize="11" fill={TEXTO}>
          {i === cortes.length - 1 ? `${c}+` : c}
        </text>
      ))}
      <text x={W - der} y={H - 4} textAnchor="end" fontSize="11" fill={TEXTO}>
        minutos desde la recepción hasta llegar al lugar
      </text>
    </svg>
  );
}

/** Mini gráfico de tendencia semanal. */
export function Sparkline({ valores, ancho = 96, alto = 24 }: { valores: number[]; ancho?: number; alto?: number }) {
  const max = Math.max(1, ...valores);
  const x = (i: number) => (i / Math.max(1, valores.length - 1)) * (ancho - 4) + 2;
  const y = (v: number) => alto - 2 - (v / max) * (alto - 4);
  const ult = valores.length - 1;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
      <polyline fill="none" stroke={AZUL} strokeWidth="1.5" points={valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      <circle cx={x(ult)} cy={y(valores[ult] ?? 0)} r="2.5" fill={AZUL} />
    </svg>
  );
}

/** Índice por zona con la línea del promedio comunal (1,0). */
export function BarrasIndice({ filas }: { filas: { etiqueta: string; indice: number; detalle?: string }[] }) {
  const max = Math.max(2, ...filas.map((f) => f.indice));
  return (
    <div className="indice">
      {filas.map((f) => (
        <div key={f.etiqueta} className="indice__fila">
          <span className="indice__etiqueta">
            {f.etiqueta}
            {f.detalle && <span className="pequeno texto-3"> {f.detalle}</span>}
          </span>
          <span className="indice__pista">
            <i style={{ width: `${(f.indice / max) * 100}%`, background: f.indice >= 1.25 ? AZUL : "#84ADFF" }} />
            <b style={{ left: `${(1 / max) * 100}%` }} title="Promedio de la comuna" />
          </span>
          <span className="num indice__valor">{f.indice.toFixed(2).replace(".", ",")}</span>
        </div>
      ))}
      <p className="pequeno texto-3">1,00 = promedio de la comuna (línea vertical). Se pondera por gravedad: crítica 5, alta 3, media 2, baja 1.</p>
    </div>
  );
}

/** Columnas diarias apiladas por serie (p. ej., tipos de reporte), con leyenda. */
export function ColumnasApiladas<K extends string>({
  dias,
  series,
  unidad,
}: {
  dias: ({ fecha: string } & Record<K, number>)[];
  series: { clave: K; etiqueta: string; color: string }[];
  unidad: string;
}) {
  const W = 720, H = 240, izq = 36, der = 8, arr = 12, aba = 28;
  const total = (d: Record<K, number>) => series.reduce((s, x) => s + d[x.clave], 0);
  const ticks = pasos(Math.max(1, ...dias.map(total)));
  const top = ticks[ticks.length - 1];
  const ancho = (W - izq - der) / Math.max(1, dias.length);
  const alto = (v: number) => (v / top) * (H - arr - aba);
  const cada = Math.ceil(dias.length / 7);
  return (
    <figure className="grafico-figura">
      <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label={unidad}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={izq} x2={W - der} y1={H - aba - alto(t)} y2={H - aba - alto(t)} stroke={REJILLA} />
            <text x={izq - 6} y={H - aba - alto(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
              {numero(t)}
            </text>
          </g>
        ))}
        {dias.map((d, i) => {
          let base = H - aba;
          const fecha = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" });
          return (
            <g key={d.fecha}>
              {series.map((s) => {
                const h = alto(d[s.clave]);
                base -= h;
                return h > 0 ? (
                  <rect key={s.clave} x={izq + i * ancho + ancho * 0.15} y={base} width={Math.max(1, ancho * 0.7)} height={h} fill={s.color}>
                    <title>{`${fecha} · ${s.etiqueta}: ${d[s.clave]}`}</title>
                  </rect>
                ) : null;
              })}
              {i % cada === 0 && (
                <text x={izq + i * ancho + ancho / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXTO}>
                  {fecha}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="leyenda-grafico">
        {series.map((s) => (
          <span key={s.clave}>
            <i style={{ background: s.color }} aria-hidden /> {s.etiqueta}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * Conflicto frente a presencia por unidad vecinal.
 * Cada punto es una UV: a la derecha, más procedimientos; arriba, más patrullaje preventivo.
 * Bajo la diagonal hay menos presencia de la que corresponde a su conflicto (en rojo las brechas).
 */
export function DispersionCobertura({ puntos }: { puntos: { etiqueta: string; x: number; y: number; brecha: boolean }[] }) {
  const W = 560, H = 360, izq = 48, der = 16, arr = 16, aba = 44;
  const max = Math.max(0.05, ...puntos.map((p) => Math.max(p.x, p.y)));
  const ticks = pasos(max * 100).map((t) => t / 100);
  const top = ticks[ticks.length - 1];
  const x = (v: number) => izq + (v / top) * (W - izq - der);
  const y = (v: number) => H - aba - (v / top) * (H - arr - aba);
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Conflicto frente a presencia preventiva por unidad vecinal">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={izq} x2={W - der} y1={y(t)} y2={y(t)} stroke={REJILLA} />
          <line x1={x(t)} x2={x(t)} y1={arr} y2={H - aba} stroke={REJILLA} />
          <text x={izq - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>
            {pct(t)}
          </text>
          <text x={x(t)} y={H - aba + 16} textAnchor="middle" fontSize="11" fill={TEXTO}>
            {pct(t)}
          </text>
        </g>
      ))}
      <path d={`M${x(0)},${y(0)} L${x(top)},${y(0)} L${x(top)},${y(top)} Z`} fill="#FEF3F2" opacity="0.7" />
      <line x1={x(0)} y1={y(0)} x2={x(top)} y2={y(top)} stroke={GRIS} strokeDasharray="4 4" />
      <text x={x(top) - 6} y={y(0) - 8} textAnchor="end" fontSize="11" fill="#B42318">
        Menos presencia que conflicto
      </text>
      <text x={x(top * 0.04)} y={y(top) + 14} fontSize="11" fill={TEXTO}>
        Presencia de sobra
      </text>
      {puntos.map((p) => (
        <circle key={p.etiqueta} cx={x(p.x)} cy={y(p.y)} r={p.brecha ? 6 : 4.5} fill={p.brecha ? "#B42318" : AZUL} fillOpacity={p.brecha ? 0.9 : 0.55} stroke="#fff">
          <title>{`${p.etiqueta}: ${pct(p.x)} de los procedimientos, ${pct(p.y)} de la presencia preventiva`}</title>
        </circle>
      ))}
      {etiquetasSinChoque(puntos.filter((p) => p.brecha).map((p) => ({ texto: p.etiqueta, x: x(p.x), y: y(p.y) }))).map((e) => (
        <g key={e.texto}>
          {e.dy !== 0 && <line x1={e.x} y1={e.y} x2={e.x + 8} y2={e.y + e.dy} stroke="#B42318" strokeWidth="1" />}
          <text x={e.x + 9} y={e.y + e.dy + 4} fontSize="11" fontWeight="600" fill="#B42318" paintOrder="stroke" stroke="#fff" strokeWidth="3">
            {e.texto}
          </text>
        </g>
      ))}
      <text x={(izq + W - der) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill={TEXTO}>
        % de los procedimientos de la comuna →
      </text>
      <text x={14} y={(arr + H - aba) / 2} textAnchor="middle" fontSize="12" fill={TEXTO} transform={`rotate(-90 14 ${(arr + H - aba) / 2})`}>
        % del patrullaje preventivo →
      </text>
    </svg>
  );
}

/** Coloca etiquetas sin que se tapen: si chocan, las sube; si no caben, se omiten (el dato queda en la tabla y el tooltip). */
function etiquetasSinChoque(items: { texto: string; x: number; y: number }[]) {
  const puestas: { texto: string; x: number; y: number; dy: number; caja: [number, number, number, number] }[] = [];
  const ancho = (t: string) => t.length * 6.6;
  for (const it of [...items].sort((a, b) => b.x - a.x)) {
    for (const dy of [0, -16, 16, -32, 32]) {
      const caja: [number, number, number, number] = [it.x + 8, it.y + dy - 8, it.x + 10 + ancho(it.texto), it.y + dy + 6];
      const choca = puestas.some((p) => caja[0] < p.caja[2] && caja[2] > p.caja[0] && caja[1] < p.caja[3] && caja[3] > p.caja[1]);
      if (!choca) {
        puestas.push({ ...it, dy, caja });
        break;
      }
    }
  }
  return puestas;
}

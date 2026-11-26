/**
 * Pruebas de la lógica común (packages/datos).
 * Usan las funciones globales describe/it/expect: corren con `npm test` (Vitest) y también con `bun test`.
 */
import { CLAVES, buscarClaves } from "../src/claves";
import { infoDeClave, PRIORIDADES } from "../src/semaforo";
import { tiemposDe, resumen, mediana } from "../src/indicadores";
import { unidadVecinalDe, centroideUV, UNIDADES_VECINALES, BARRIOS } from "../src/geo";
import { analizarPatrones, historialCercano } from "../src/patrones";
import { generarDemo } from "../src/demo/semilla";
import { leerCsvPuntos } from "../src/puntos-interes";
import type { Procedimiento } from "../src/tipos";

describe("catálogo de claves y semáforo", () => {
  it("tiene las 81 claves, numeradas del 1 al 81 sin repetir", () => {
    expect(CLAVES.length).toBe(81);
    expect(new Set(CLAVES.map((c) => c.numero)).size).toBe(81);
    expect(Math.min(...CLAVES.map((c) => c.numero))).toBe(1);
    expect(Math.max(...CLAVES.map((c) => c.numero))).toBe(81);
  });

  it("reparte las prioridades como el sistema anterior (16 / 21 / 27 / 17)", () => {
    const n = (p: string) => CLAVES.filter((c) => c.prioridad === p).length;
    expect([n("critica"), n("alta"), n("media"), n("baja")]).toEqual([16, 21, 27, 17]);
  });

  it("pinta crítica y alta en rojo, media en amarillo y baja en verde", () => {
    expect(PRIORIDADES.critica.semaforo).toBe("rojo");
    expect(PRIORIDADES.alta.semaforo).toBe("rojo");
    expect(PRIORIDADES.media.semaforo).toBe("amarillo");
    expect(PRIORIDADES.baja.semaforo).toBe("verde");
    expect(infoDeClave(13).etiqueta).toBe("Crítica"); // asalto mano armada
    expect(infoDeClave(39).semaforo).toBe("amarillo"); // hurto
  });

  it("busca por número y por nombre sin importar tildes", () => {
    expect(buscarClaves("67")[0].nombre).toBe("Robo");
    expect(buscarClaves("agresion")[0].numero).toBe(5);
  });
});

describe("territorio", () => {
  it("tiene 48 unidades vecinales y 7 barrios", () => {
    expect(UNIDADES_VECINALES.features.length).toBe(48);
    expect(BARRIOS.length).toBe(7);
  });

  it("el centroide de cada UV cae dentro de su propia UV", () => {
    for (const f of UNIDADES_VECINALES.features) {
      const c = centroideUV(f.properties.uv)!;
      expect(unidadVecinalDe(c)?.uv).toBe(f.properties.uv);
    }
  });

  it("un punto fuera de la comuna no tiene UV", () => {
    expect(unidadVecinalDe({ lat: -33.45, lng: -70.65 })).toBeNull();
  });
});

function proc(minutos: Partial<Record<"asignado" | "en_el_lugar" | "finalizado", number>>, clave = 67): Procedimiento {
  const t0 = Date.parse("2026-11-20T15:00:00Z");
  const ev = (estado: Procedimiento["estado"], m: number) => ({ estado, en: new Date(t0 + m * 60000).toISOString(), porUsuarioId: "u", porNombre: "U" });
  const eventos = [ev("recibido", 0)];
  if (minutos.asignado != null) eventos.push(ev("asignado", minutos.asignado));
  if (minutos.en_el_lugar != null) eventos.push(ev("en_el_lugar", minutos.en_el_lugar));
  if (minutos.finalizado != null) eventos.push(ev("finalizado", minutos.finalizado));
  return { id: "p", folio: "P-1", claveNumero: clave, descripcion: "", direccion: "", ubicacion: { lat: 0, lng: 0 }, unidadVecinal: 1, barrio: "B", estado: "finalizado", movilId: null, creadoEn: eventos[0].en, eventos };
}

describe("indicadores", () => {
  it("calcula despacho, llegada y respuesta desde la línea de tiempo", () => {
    const t = tiemposDe(proc({ asignado: 2, en_el_lugar: 6, finalizado: 30 }));
    expect(t.despacho).toBe(2);
    expect(t.llegada).toBe(4);
    expect(t.respuesta).toBe(6);
    expect(t.enLugar).toBe(24);
  });

  it("evalúa la meta según la prioridad (robo, alta: 5 min)", () => {
    expect(tiemposDe(proc({ asignado: 1, en_el_lugar: 5 })).dentroDeMeta).toBe(true);
    expect(tiemposDe(proc({ asignado: 1, en_el_lugar: 6 })).dentroDeMeta).toBe(false);
    expect(tiemposDe(proc({ asignado: 1, en_el_lugar: 40 }, 49)).dentroDeMeta).toBeNull(); // baja: sin meta
  });

  it("mediana y resumen", () => {
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
    const r = resumen([proc({ asignado: 1, en_el_lugar: 4 }), proc({ asignado: 3, en_el_lugar: 9 })]);
    expect(r.total).toBe(2);
    expect(r.cumplimiento).toBe(0.5);
  });
});

describe("motor de patrones", () => {
  const demo = generarDemo(Date.parse("2026-11-26T15:00:00Z"));
  const a = analizarPatrones(demo.procedimientos, Date.parse("2026-11-26T15:00:00Z"));

  it("evalúa las 48 UV y los 7 barrios, con índice promedio 1", () => {
    expect(a.uvs.length).toBe(48);
    expect(a.barrios.length).toBe(7);
    const prom = a.uvs.reduce((s, u) => s + u.indice, 0) / a.uvs.length;
    expect(prom).toBeCloseTo(1, 5);
  });

  it("descubre los focos sembrados en la demo y sugiere un punto fijo", () => {
    expect(a.focos.length).toBeGreaterThan(0);
    expect(a.recomendaciones.some((r) => r.tipo === "punto_fijo")).toBe(true);
  });

  it("detecta el alza reciente sembrada en la UV 36", () => {
    expect(a.recomendaciones.some((r) => r.tipo === "alza" && r.zona?.startsWith("UV 36"))).toBe(true);
  });

  it("no repite recomendaciones de presencia para la misma UV", () => {
    const presencia = a.recomendaciones.filter((r) => (r.tipo === "punto_fijo" || r.tipo === "patrullaje") && r.uv != null);
    expect(new Set(presencia.map((r) => r.uv)).size).toBe(presencia.length);
  });

  it("cuenta el historial cercano a un punto", () => {
    const p = demo.procedimientos[0];
    const h = historialCercano(demo.procedimientos, p.ubicacion, Date.parse(p.creadoEn) + 1000, 50, 1);
    expect(h.n).toBeGreaterThanOrEqual(1);
  });
});

describe("datos de demostración", () => {
  const d = generarDemo(Date.parse("2026-11-26T15:00:00Z"));
  it("solo despacha a móviles con turno y deja el Móvil 03 libre para la demo", () => {
    for (const p of d.procedimientos.filter((x) => x.estado !== "finalizado" && x.estado !== "cancelado" && x.movilId)) {
      expect(d.moviles.find((m) => m.id === p.movilId)?.turno).not.toBeNull();
    }
    expect(d.moviles.find((m) => m.id === "MOVIL-03")?.estado).toBe("sin_turno");
  });

  it("todos los procedimientos caen dentro de una UV", () => {
    expect(d.procedimientos.every((p) => p.unidadVecinal != null)).toBe(true);
  });
});

describe("planilla de puntos de interés", () => {
  it("lee filas con coordenadas y avisa las que no tienen", () => {
    const { puntos, errores } = leerCsvPuntos("codigo;nombre;tipo;direccion;latitud;longitud\nGAMA 99;Recinto X;municipal;A con B;-33,385;-70,672\n;SAPU Y;salud;C con D;;\n");
    expect(puntos.length).toBe(2);
    expect(puntos[0].ubicacion).toEqual({ lat: -33.385, lng: -70.672 });
    expect(puntos[0].tipo).toBe("municipal");
    expect(puntos[1].ubicacion).toBeNull();
    expect(puntos[1].tipo).toBe("salud");
    expect(errores.length).toBe(1);
  });
});

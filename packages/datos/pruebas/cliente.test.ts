/** Reglas de operación del cliente de datos (modo demostración). */
import { obtenerCliente } from "../src/cliente";
import { USUARIOS_DEMO } from "../src/auth";

const operador = USUARIOS_DEMO.find((u) => u.rol === "operador")!;
const patrullero = USUARIOS_DEMO.find((u) => u.rol === "patrullero")!;

describe("turnos y despacho", () => {
  const c = obtenerCliente();
  c.reiniciar("ejemplo");

  it("no permite despachar a un móvil sin turno", () => {
    const p = c.crearProcedimiento({ claveNumero: 67, descripcion: "", direccion: "Prueba", ubicacion: { lat: -33.385, lng: -70.672 } }, operador);
    expect(() => c.despachar(p.id, "MOVIL-03", operador)).toThrow();
  });

  it("al abrir turno el móvil queda libre y se le puede despachar", () => {
    c.iniciarTurno("MOVIL-03", { patrullero: "Patrullero Demo", acompanante: "", kmInicial: 1000, combustible: "3/4", observaciones: [] }, patrullero);
    expect(c.instantanea().moviles.find((m) => m.id === "MOVIL-03")?.estado).toBe("disponible");
    const p = c.crearProcedimiento({ claveNumero: 2, descripcion: "", direccion: "Prueba", ubicacion: { lat: -33.385, lng: -70.672 } }, operador);
    c.despachar(p.id, "MOVIL-03", operador);
    expect(c.instantanea().moviles.find((m) => m.id === "MOVIL-03")?.estado).toBe("asignado");
  });

  it("no deja cerrar el turno con un procedimiento activo", () => {
    expect(() => c.cerrarTurno("MOVIL-03", patrullero, { kmFinal: 1050 })).toThrow();
  });

  it("al finalizar, el móvil vuelve a estar libre", () => {
    const p = c.instantanea().procedimientos.find((x) => x.movilId === "MOVIL-03" && x.estado === "asignado")!;
    for (const e of ["en_desplazamiento", "en_el_lugar", "en_procedimiento", "finalizado"] as const) c.cambiarEstado(p.id, e, patrullero);
    expect(c.instantanea().moviles.find((m) => m.id === "MOVIL-03")?.estado).toBe("disponible");
  });

  it("rechaza un kilometraje final menor al inicial y registra el cierre válido", () => {
    expect(() => c.cerrarTurno("MOVIL-03", patrullero, { kmFinal: 900 })).toThrow();
    c.cerrarTurno("MOVIL-03", patrullero, { kmFinal: 1062, novedadesChecklist: ["Neumáticos"] });
    const t = c.instantanea().historialTurnos[0];
    expect(t.kmFinal! - t.kmInicial!).toBe(62);
    expect(c.instantanea().moviles.find((m) => m.id === "MOVIL-03")?.estado).toBe("sin_turno");
  });

  it("abre y cierra un turno de punto fijo", () => {
    const t = c.iniciarTurnoPersonal({ patrullero: "Patrullero Demo", acompanante: "", modalidad: "punto_fijo", lugar: "GAMA 1", ubicacion: { lat: -33.385, lng: -70.672 } }, patrullero);
    expect(c.instantanea().personal.some((x) => x.id === t.id)).toBe(true);
    expect(() => c.iniciarTurnoPersonal({ patrullero: "x", acompanante: "", modalidad: "a_pie", lugar: "UV 1", ubicacion: { lat: 0, lng: 0 } }, patrullero)).toThrow();
    c.cerrarTurnoPersonal(t.id, patrullero);
    expect(c.instantanea().personal.some((x) => x.id === t.id)).toBe(false);
  });
});

describe("inicio vacío y reportes", () => {
  const c = obtenerCliente();

  it("arranca sin procedimientos y con móviles sin turno", () => {
    c.reiniciar("vacio");
    const d = c.instantanea();
    expect(d.procedimientos.length).toBe(0);
    expect(d.reportes.length).toBe(0);
    expect(d.moviles.every((m) => m.estado === "sin_turno")).toBe(true);
  });

  it("registra un reporte con UV y permite complementarlo solo a su autor", () => {
    c.reiniciar("vacio");
    const r = c.enviarReporte(
      { tipo: "patrullaje_preventivo", halcon: "12", unidad: "MOVIL-01", patrullero: "Prueba", direccion: "Independencia 3499", ubicacion: { lat: -33.385, lng: -70.672 }, procedimientoId: null, observaciones: "Sin novedad", adjuntos: [] },
      patrullero,
    );
    expect(r.folio).toBe("R-00001");
    expect(r.unidadVecinal).not.toBeNull();
    c.complementarReporte(r.id, "Se agrega foto", [], patrullero);
    expect(c.instantanea().reportes[0].complementos.length).toBe(1);
    expect(() => c.complementarReporte(r.id, "x", [], operador)).toThrow();
  });
});

describe("turno de Central y registro de acciones", () => {
  const c = obtenerCliente();

  it("registra quién hizo qué, incluida la edición y la cancelación", () => {
    c.reiniciar("vacio");
    const p = c.crearProcedimiento({ claveNumero: 67, descripcion: "x", direccion: "Calle A 100", ubicacion: { lat: -33.385, lng: -70.672 } }, operador);
    c.editarProcedimiento(p.id, { direccion: "Calle A 120" }, operador, "vecino corrige número");
    c.cambiarEstado(p.id, "cancelado", operador, { nota: "duplicado" });
    const acc = c.instantanea().auditoria.filter((a) => a.procedimientoId === p.id).map((a) => a.accion);
    expect(acc).toEqual(["cancelar", "editar", "crear"]);
    expect(c.instantanea().procedimientos[0].direccion).toBe("Calle A 120");
    const edit = c.instantanea().auditoria.find((a) => a.accion === "editar")!;
    expect(edit.detalle).toContain("Calle A 100");
    expect(edit.detalle).toContain("vecino corrige número");
  });

  it("abre y cierra el turno de Central con resumen y pendientes", () => {
    c.reiniciar("vacio");
    const t = c.iniciarTurnoCentral({ nombre: "Operador Prueba", halcon: "7", turno: "tarde", novedadesRecepcion: "" }, operador);
    expect(() => c.iniciarTurnoCentral({ nombre: "Operador Prueba", halcon: "7", turno: "tarde", novedadesRecepcion: "" }, operador)).toThrow();
    const p = c.crearProcedimiento({ claveNumero: 1, descripcion: "", direccion: "Calle B 1", ubicacion: { lat: -33.385, lng: -70.672 } }, operador);
    c.crearProcedimiento({ claveNumero: 67, descripcion: "", direccion: "Calle C 2", ubicacion: { lat: -33.385, lng: -70.672 } }, operador);
    c.cambiarEstado(p.id, "cancelado", operador);
    // Las acciones quedan a nombre de quien abrió el turno, con su halcón.
    expect(c.instantanea().auditoria[0].nombre).toBe("Operador Prueba (H7)");
    const cerrado = c.cerrarTurnoCentral(t.id, "Queda pendiente Calle C", operador);
    expect(cerrado.cerradoEn).not.toBeNull();
    expect(cerrado.resumen!.creados).toBe(2);
    expect(cerrado.resumen!.cancelados).toBe(1);
    expect(cerrado.resumen!.activosQueSiguen.map((x) => x.direccion)).toEqual(["Calle C 2"]);
    expect(cerrado.resumen!.personas[0].halcon).toBe("7");
    expect(cerrado.novedadesEntrega).toBe("Queda pendiente Calle C");
    // Se guarda y el siguiente operador lo recibe.
    expect(c.instantanea().turnosCentral.find((x) => x.id === t.id)?.resumen?.creados).toBe(2);
  });
});

import { procedimientoDeUnidad, unidadesActivas, unidadesEnTurno } from "../src/cliente";

describe("despacho de varias unidades", () => {
  const c = obtenerCliente();
  const pA = { ...patrullero, id: "u-pa", nombre: "Patrullero A" };
  const pB = { ...patrullero, id: "u-pb", nombre: "Patrullero B" };
  const pC = { ...patrullero, id: "u-pc", nombre: "Patrullero C" };
  const punto = { lat: -33.385, lng: -70.672 };

  function preparar() {
    c.reiniciar("vacio");
    c.iniciarTurno("MOVIL-01", { patrullero: "A", acompanante: "", kmInicial: 1, combustible: "1/2", observaciones: [] }, pA, punto);
    c.iniciarTurno("MOVIL-02", { patrullero: "B", acompanante: "", kmInicial: 1, combustible: "1/2", observaciones: [] }, pB, punto);
    return c.iniciarTurnoPersonal({ patrullero: "C", acompanante: "", modalidad: "punto_fijo", lugar: "GAMA 1", ubicacion: punto }, pC);
  }

  it("envía un móvil a cargo, otro de apoyo y un punto fijo; todos quedan ocupados", () => {
    const fijo = preparar();
    const p = c.crearProcedimiento({ claveNumero: 1, descripcion: "", direccion: "X 1", ubicacion: punto }, operador);
    c.agregarUnidades(p.id, ["MOVIL-02", "MOVIL-01", fijo.id], operador);
    const d = c.instantanea();
    const proc = d.procedimientos.find((x) => x.id === p.id)!;
    expect(proc.estado).toBe("asignado");
    expect(proc.movilId).toBe("MOVIL-02");
    expect(unidadesActivas(proc).map((u) => [u.id, u.aCargo])).toEqual([["MOVIL-02", true], ["MOVIL-01", false], [fijo.id, false]]);
    expect(d.moviles.filter((m) => m.procedimientoId === p.id).length).toBe(2);
    expect(d.personal.find((t) => t.id === fijo.id)!.procedimientoId).toBe(p.id);
    expect(unidadesEnTurno(d.moviles, d.personal, punto).every((u) => !u.libre)).toBe(true);
    // Cada unidad ve el procedimiento en su app.
    expect(procedimientoDeUnidad(d.procedimientos, fijo.id)?.unidad.aCargo).toBe(false);
  });

  it("no envía unidades ocupadas y permite liberar un apoyo", () => {
    const fijo = preparar();
    const p1 = c.crearProcedimiento({ claveNumero: 1, descripcion: "", direccion: "X 1", ubicacion: punto }, operador);
    c.agregarUnidades(p1.id, ["MOVIL-01", fijo.id], operador);
    const p2 = c.crearProcedimiento({ claveNumero: 67, descripcion: "", direccion: "X 2", ubicacion: punto }, operador);
    expect(() => c.agregarUnidades(p2.id, ["MOVIL-02", "MOVIL-01"], operador)).toThrow(/No disponibles/);
    expect(c.instantanea().procedimientos.find((x) => x.id === p2.id)!.movilId).toBe("MOVIL-02");
    expect(() => c.liberarUnidad(p1.id, "MOVIL-01", operador)).toThrow(/a cargo/);
    c.liberarUnidad(p1.id, fijo.id, operador);
    expect(c.instantanea().personal.find((t) => t.id === fijo.id)!.procedimientoId).toBeNull();
  });

  it("el apoyo informa su avance y al finalizar quedan todas libres", () => {
    const fijo = preparar();
    const p = c.crearProcedimiento({ claveNumero: 1, descripcion: "", direccion: "X 1", ubicacion: punto }, operador);
    c.agregarUnidades(p.id, ["MOVIL-01", "MOVIL-02", fijo.id], operador);
    c.confirmarAviso(p.id, "MOVIL-02", pB);
    c.actualizarUnidad(p.id, "MOVIL-02", "en_camino", pB);
    c.actualizarUnidad(p.id, "MOVIL-02", "en_el_lugar", pB);
    let proc = c.instantanea().procedimientos.find((x) => x.id === p.id)!;
    expect(proc.unidades!.find((u) => u.id === "MOVIL-02")!.estado).toBe("en_el_lugar");
    expect(proc.unidades!.find((u) => u.id === "MOVIL-02")!.recibidoEn).toBeTruthy();
    for (const e of ["en_desplazamiento", "en_el_lugar", "en_procedimiento", "finalizado"] as const) c.cambiarEstado(p.id, e, pA);
    const d = c.instantanea();
    proc = d.procedimientos.find((x) => x.id === p.id)!;
    expect(unidadesActivas(proc).length).toBe(0);
    expect(d.moviles.filter((m) => ["MOVIL-01", "MOVIL-02"].includes(m.id)).every((m) => m.estado === "disponible" && !m.procedimientoId)).toBe(true);
    expect(d.personal.find((t) => t.id === fijo.id)!.procedimientoId).toBeNull();
  });

  it("puede dejar a cargo a un apoyo (el anterior pasa a apoyo) o reasignar a otra (el anterior queda libre)", () => {
    preparar();
    const p = c.crearProcedimiento({ claveNumero: 1, descripcion: "", direccion: "X 1", ubicacion: punto }, operador);
    c.agregarUnidades(p.id, ["MOVIL-01", "MOVIL-02"], operador);
    c.despachar(p.id, "MOVIL-02", operador);
    const proc = c.instantanea().procedimientos.find((x) => x.id === p.id)!;
    expect(proc.movilId).toBe("MOVIL-02");
    expect(unidadesActivas(proc).map((u) => [u.id, u.aCargo])).toEqual([["MOVIL-02", true], ["MOVIL-01", false]]);
    expect(c.instantanea().moviles.find((m) => m.id === "MOVIL-01")!.procedimientoId).toBe(p.id);
    // Reasignar a una unidad que no estaba: la anterior a cargo queda libre.
    c.liberarUnidad(p.id, "MOVIL-01", operador);
    c.despachar(p.id, "MOVIL-01", operador);
    const p2 = c.instantanea().procedimientos.find((x) => x.id === p.id)!;
    expect(unidadesActivas(p2).map((u) => u.id)).toEqual(["MOVIL-01"]);
    expect(c.instantanea().moviles.find((m) => m.id === "MOVIL-02")!.estado).toBe("disponible");
  });
});

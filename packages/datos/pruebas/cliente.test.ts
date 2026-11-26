/** Reglas de operación del cliente de datos (modo demostración). */
import { obtenerCliente } from "../src/cliente";
import { USUARIOS_DEMO } from "../src/auth";

const operador = USUARIOS_DEMO.find((u) => u.rol === "operador")!;
const patrullero = USUARIOS_DEMO.find((u) => u.rol === "patrullero")!;

describe("turnos y despacho", () => {
  const c = obtenerCliente();
  c.reiniciar();

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

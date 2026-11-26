import { analizarPatrones, analizarTerreno } from "../src";
import { generarDemo } from "../src/demo/semilla";

describe("trabajo en terreno", () => {
  const ahora = Date.UTC(2026, 10, 26, 18);
  const d = generarDemo(ahora);
  const t = analizarTerreno(d.reportes, d.procedimientos, d.historialTurnos, ahora - 30 * 86400000, ahora + 1);

  it("el ejemplo trae reportes de los tres tipos y turnos cerrados", () => {
    expect(t.porTipo.patrullaje_preventivo).toBeGreaterThan(50);
    expect(t.porTipo.punto_estatico).toBeGreaterThan(10);
    expect(t.porTipo.procedimiento).toBeGreaterThan(10);
    expect(t.turnos).toBeGreaterThan(100);
    expect(t.kmRecorridos).toBeGreaterThan(0);
  });

  it("detecta las UV con conflicto y poca presencia preventiva", () => {
    const uvs = t.brechas.map((b) => b.uv);
    expect(uvs.some((u) => u === 36 || u === 23)).toBe(true);
    for (const b of t.brechas) expect(b.procedimientos).toBeGreaterThanOrEqual(4);
  });

  it("el motor de patrones usa la cobertura como evidencia", () => {
    const a = analizarPatrones(d.procedimientos, ahora, 84, d.reportes);
    expect(a.recomendaciones.some((r) => r.evidencia.some((e) => e.startsWith("Cobertura preventiva baja")))).toBe(true);
  });

  it("sin reportes no inventa brechas", () => {
    const a = analizarPatrones(d.procedimientos, ahora, 84, []);
    expect(a.recomendaciones.some((r) => r.evidencia.some((e) => e.startsWith("Cobertura preventiva baja")))).toBe(false);
  });
});

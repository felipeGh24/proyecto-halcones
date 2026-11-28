import { checklistInicial, novedadesChecklist, textoChecklist, textoReporte } from "../src";

// Hora de Chile (UTC−3 en noviembre): 05:39 local = 08:39 UTC.
const CREADO = "2026-11-28T08:39:00.000Z";

describe("formatos oficiales de terreno", () => {
  it("patrullaje preventivo igual al que usa el equipo", () => {
    const t = textoReporte({ tipo: "patrullaje_preventivo", creadoEn: CREADO, halcon: "7", patrullero: "Jhon Ahumada", unidadVecinal: 4, barrio: "Barrio Vivaceta-Barón", direccion: "Barón de Juras Reales / Santa Inés", observaciones: "" });
    expect(t).toBe(
      ["PATRULLAJE PREVENTIVO", "", "FECHA: 28/11/2026", "HORA: 05:39", "HALCÓN: 07 JHON AHUMADA", "UNIDAD VECINAL: 04", "BARRIO: VIVACETA BARON", "DIRECCIÓN: BARÓN DE JURAS REALES / SANTA INÉS", "TIPO DE REPORTE: PATRULLAJE PREVENTIVO", "OBSERVACIONES:", "SIN NOVEDAD A LA HORA"].join("\n"),
    );
  });

  it("punto estático y procedimiento con su título", () => {
    const base = { creadoEn: CREADO, halcon: "66", patrullero: "Francisco Valencia", unidadVecinal: 10, barrio: "Barrio Sur", direccion: "Módulo de Prevención Pasarela Mall", observaciones: "Se mantiene punto fijo" };
    expect(textoReporte({ ...base, tipo: "punto_estatico" })).toMatch(/^SERVICIO DE PUNTO ESTATICO\n[\s\S]*HALCÓN: 66 FRANCISCO VALENCIA[\s\S]*TIPO DE REPORTE: PUNTO ESTATICO/);
    expect(textoReporte({ ...base, tipo: "procedimiento" })).toMatch(/^PROCEDIMIENTO\n[\s\S]*TIPO DE REPORTE: PROCEDIMIENTO/);
  });

  it("checklist de término con todos los bloques y las novedades detectadas", () => {
    const c = checklistInicial();
    c.equipamiento.botiquin = 0;
    c.aseoInterior = "Sin aseo";
    c.urea = 79;
    const t = textoChecklist({
      momento: "termino",
      fecha: new Date("2026-11-28T10:00:00Z"),
      horaInicio: new Date("2026-11-28T10:00:00Z"),
      horaTermino: new Date("2026-11-28T11:09:00Z"),
      movil: "Móvil 13",
      ppu: "vxww-84",
      conductor: "H-29 Felipe Godoy",
      acompanante: "",
      kmInicio: 18826,
      kmTermino: 18835,
      combustibleInicio: "FULL",
      combustibleTermino: "+3/4",
      checklist: c,
    });
    for (const linea of ["CHECK LIST MÓVIL TÉRMINO DEL SERVICIO", "Hora inicio: 07:00", "Hora término: 08:09", "Móvil: MÓVIL 13", "PPU: VXWW-84", "Conductor: H-29 FELIPE GODOY", "Acompañante: s/a", "Km inicio: 18.826", "Km término: 18.835", "Combustible término: +3/4", "Capacidad de Urea: 79%", "Botiquín: 0", "Conos: 3", "Aseo interior: sin aseo", "NOVEDADES"])
      expect(t).toContain(linea);
    expect(novedadesChecklist(c)).toEqual(["Botiquín: 0", "Aseo interior: sin aseo"]);
  });
});

import { buscarLocal, calles, compararMoviles, direccionLocal, leerPuntosFijos, metros, RECINTOS_CONCHALI, ubicacionCalculada } from "../src";

const MUNICIPALIDAD = { lat: -33.39692, lng: -70.67059 };

describe("callejero propio", () => {
  it("trae las calles de Conchalí", () => {
    expect(calles().size).toBeGreaterThan(700);
    expect(calles().has("Avenida Independencia")).toBe(true);
  });

  it("entiende las distintas formas de escribir una esquina", () => {
    const formas = [
      "Independencia con La Palma",
      "independencia esquina la palma",
      "Av. Independencia / La Palma",
      "Avda Independencia & La Palma",
      "esq. Independencia y La Palma",
      "Independencia c/ La Palma",
      "INDEPENDENCIA - LA PALMA",
      "La Palma con Independencia, Conchalí",
      "Independensia con la palma",
      "esquina de Independencia con La Palma (frente a la muni)",
    ];
    for (const f of formas) {
      const r = buscarLocal(f)[0];
      expect(r?.tipo, f).toBe("esquina");
      expect(metros(r.punto, MUNICIPALIDAD), f).toBeLessThan(40);
    }
  });

  it("expande abreviaturas y alias", () => {
    expect(buscarLocal("Gral. Gambino con Diego Silva")[0]?.tipo).toBe("esquina");
    expect(buscarLocal("JM Caro / Independencia")[0]?.texto).toContain("Cardenal José María Caro");
    expect(buscarLocal("Panamericana con Cardenal Caro")[0]?.texto).toContain("Eduardo Frei Montalva");
    expect(buscarLocal("Tte. Yávar con Independencia")[0]?.tipo).toBe("esquina");
  });

  it("estima números entre direcciones conocidas y avisa que es aproximado", () => {
    const r = buscarLocal("Av. Independencia N° 5663")[0];
    expect(r.tipo).toBe("direccion");
    expect(r.aproximado).toBe(true);
    // El SAR (Independencia 5663) está en la esquina con Manaos según el municipio.
    expect(metros(r.punto, buscarLocal("Independencia con Manaos")[0].punto)).toBeLessThan(250);
    expect(buscarLocal("5663 independencia")[0].texto).toBe("Avenida Independencia 5663");
  });

  it("sin números conocidos deja el punto en la calle para ajustarlo", () => {
    const r = buscarLocal("Pedro Fontova 4107")[0];
    expect(r.tipo).toBe("calle");
    expect(r.aproximado).toBe(true);
  });

  it("describe un punto del mapa con la esquina más cercana", () => {
    expect(direccionLocal(MUNICIPALIDAD)).toMatch(/Independencia|La Palma/);
  });

  it("ubica solos los recintos GAMA y los puntos de emergencia con esquina", () => {
    const conEsquina = RECINTOS_CONCHALI.filter((r) => r.grupo === "recintos_municipales" || r.ubicarCon);
    const sinUbicar = conEsquina.filter((r) => !ubicacionCalculada(r)).map((r) => r.nombre);
    expect(sinUbicar).toEqual([]);
  });

  it("trae los cinco puntos fijos y ubica los del metro", () => {
    const pf = leerPuntosFijos();
    expect(pf.map((p) => p.nombre)).toEqual(["Metro Conchalí", "Metro Vivaceta", "Metro Cardenal Caro", "Paso Bajo Nivel", "Pasarela"]);
    expect(pf.slice(0, 3).every((p) => p.ubicacion && p.unidadVecinal)).toBe(true);
  });
});

describe("orden de la flota", () => {
  it("Móvil 01–17, luego Alpha y al final RAM", () => {
    const nombres = ["RAM 01", "Alpha 13", "Móvil 10", "Móvil 02", "Alpha 4", "Móvil 17", "RAM 02"];
    expect(nombres.map((nombre) => ({ nombre })).sort(compararMoviles).map((m) => m.nombre)).toEqual(["Móvil 02", "Móvil 10", "Móvil 17", "Alpha 4", "Alpha 13", "RAM 01", "RAM 02"]);
  });
});

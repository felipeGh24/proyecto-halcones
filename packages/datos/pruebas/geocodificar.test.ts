import { cruceMasCercano, limpiarDireccion, partirEsquina, RECINTOS_CONCHALI } from "../src";

describe("direcciones", () => {
  it("limpia abreviaturas y la comuna", () => {
    expect(limpiarDireccion("Av. Independencia N° 3499, Conchalí")).toBe("Avenida Independencia 3499");
    expect(limpiarDireccion("Tte. Ponce")).toBe("Teniente Ponce");
  });
  it("reconoce esquinas", () => {
    expect(partirEsquina("Independencia con La Palma")).toEqual(["Independencia", "La Palma"]);
    expect(partirEsquina("Av. Dorsal esq. Independencia")).toEqual(["Avenida Dorsal", "Independencia"]);
    expect(partirEsquina("Pedro Fontova / Pamplona")).toEqual(["Pedro Fontova", "Pamplona"]);
    expect(partirEsquina("Plaza Sagitario, Palmilla con Sagitario")).toEqual(["Palmilla", "Sagitario"]);
    expect(partirEsquina("Plaza Sagitario (Palmilla con Sagitario)")).toEqual(["Palmilla", "Sagitario"]);
    expect(partirEsquina("Caletera P. Norte con Cardenal Caro frente a Unilever")?.[1]).toBe("Cardenal Caro");
    expect(partirEsquina("Independencia 3499")).toBeNull();
  });
  it("todas las direcciones de recintos GAMA son esquinas", () => {
    for (const r of RECINTOS_CONCHALI.filter((x) => x.grupo === "recintos_municipales")) expect(partirEsquina(r.direccion)).not.toBeNull();
  });
  it("calcula el cruce de dos calles", () => {
    const a = [{ lat: -33.38, lng: -70.68 }, { lat: -33.38, lng: -70.67 }];
    const b = [{ lat: -33.3801, lng: -70.6701 }, { lat: -33.39, lng: -70.67 }];
    expect(cruceMasCercano(a, b)).not.toBeNull();
    expect(cruceMasCercano(a, [{ lat: -33.4, lng: -70.6 }])).toBeNull();
  });
});

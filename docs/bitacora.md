# Bitácora de trabajo

Cada sesión agrega una entrada arriba: fecha, sistema, qué se hizo, qué quedó pendiente y qué se propone.

---

## 2026-11-26 (4) · Recintos municipales (GAMA) y asistenciales de noche

**Hecho**

- Catálogo entregado por el municipio en `packages/datos/src/puntos-interes.ts`:
  - GAMA 1, 2, 3, 4, 5, 6, 8, 13 y 14.
  - Recinto asistencial 24 horas.
  - SAPU Lucas Sierra.
- Las direcciones son cruces de calles y no hay servicio de geocodificación, así que no se inventaron coordenadas. En Georreferenciado, un administrador o supervisor usa «Ubicar» y hace clic en la esquina correcta del mapa; se puede «Mover» después.
- Exportar e importar los puntos en CSV, para respaldo o para otro equipo.
- En Halcones, al crear un procedimiento se puede elegir un recinto (GAMA o asistencial): pone el punto y la dirección. Si el recinto no está ubicado, avisa.
- Los marcadores del mapa muestran el código (G1, G2… 24H, SAPU).

**Pendiente**

- Confirmar si existen GAMA 7, 9, 10, 11 y 12.
- En la demo las ubicaciones quedan en el navegador de quien las fija; con la base de datos se compartirán con todo el equipo.

## 2026-11-26 (3) · Mapa con calles, lugares y etiquetas según el acercamiento

**Hecho**

- Mapa base con calles: OpenFreeMap (estilo claro «positron», datos de OpenStreetMap, sin clave). Las unidades vecinales quedan semitransparentes y debajo de los nombres de calles. Si el mapa base no carga, el sistema sigue funcionando sin calles. Se cambia con `VITE_MAPA_ESTILO_URL` (o `ninguno`).
- Etiquetas según el acercamiento: lejos se ven los nombres de los barrios; al acercar (zoom 14,3) desaparecen y aparecen los números de las UV.
- Capas de lugares desde OpenStreetMap: avenidas principales, centros de salud (SAPU, CESFAM, hospitales), bomberos, Carabineros y PDI, edificios municipales.
- Puntos propios del municipio: carga de planilla CSV (nombre; tipo; dirección; latitud; longitud) con plantilla descargable y aviso de filas sin coordenadas. En la demo quedan en el navegador.
- Al marcar el punto de un procedimiento se muestra la calle más cercana y, si la dirección está vacía, se propone.

**Pendiente o no verificado**

- En el entorno de trabajo el servidor de mapas está bloqueado: se probó el modo sin calles. Revisar en un navegador normal que carguen calles, avenidas y lugares.
- OpenFreeMap es gratuito y «tal cual», sin garantía de servicio. Para vender, conviene un proveedor con contrato o servidor de mapas propio.
- Búsqueda de direcciones escribiendo la calle: requiere un servicio de geocodificación en el servidor.
- Los lugares de OpenStreetMap pueden estar incompletos; por eso existe la carga de puntos propios.

## 2026-11-26 (2) · Motor de patrones, más gráficos y capas de territorio

**Hecho**

- `packages/datos/src/patrones.ts`, motor de patrones heurístico: reglas estadísticas explicables que se recalculan con cada procedimiento.
  - Índice de conflicto por UV y por barrio, ponderado por gravedad (crítica 5, alta 3, media 2, baja 1; 1,0 = promedio comunal).
  - Tendencia de 14 días frente a las 4 semanas previas (prueba de Poisson).
  - Focos en celdas de unos 250 m.
  - Recomendaciones con evidencia y confianza:
    - Punto fijo: foco persistente y concentrado en una franja.
    - Patrullaje preventivo o refuerzo.
    - Alerta de alza.
    - Móvil de espera donde la meta de respuesta se cumple menos.
- Datos de demostración con 4 focos ficticios y un alza reciente (UV 36), para que el motor tenga patrones reales que descubrir.
- **Análisis**
  - Nueva página «Patrones e inteligencia»: recomendaciones con su evidencia, mapa coroplético por UV (índice o alza) con nombres de barrios y marcas de puntos fijos y patrullajes, índice por barrio contra el promedio, franja y turno críticos por barrio con tendencia, y las 15 UV con más conflicto con su tendencia de 12 semanas.
  - En el panel: recomendaciones destacadas y gráficos nuevos (por turno y semáforo, por día de la semana, histograma del tiempo de respuesta con las metas marcadas).
- **Georreferenciado**: capas de nombres de barrios, números de UV, índice de conflicto y sugerencias del motor.
- **Halcones**
  - Al crear un procedimiento se muestra cuántos hubo a menos de 200 m en 30 días y qué claves.
  - El tablero muestra sugerencias para el turno.

**Pendiente**

- El índice usa conteos, no densidad por superficie ni población. Al tener la población por UV conviene una tasa por cada 1.000 habitantes.
- Las metas de la vista SQL y del motor deben quedar configurables por organización.

## 2026-11-26 · Base de la plataforma y primera versión de los tres sistemas

**Hecho**

- Monorepo con npm workspaces: `apps/halcones`, `apps/georreferenciado`, `apps/analisis`, `packages/datos`, `packages/ui`, `packages/mapa`, `supabase/migrations`.
- `packages/datos`: modelo común, catálogo de las 81 claves con la prioridad heredada y su semáforo (rojo = crítica y alta, amarillo = media, verde = baja), 7 estados del procedimiento, cliente de datos con modo demostración sincronizado entre pestañas, roles y permisos, indicadores (despacho, llegada, respuesta, cumplimiento de meta) y las 48 unidades vecinales de Conchalí convertidas desde el KML del municipio.
- `packages/ui`: sistema de diseño «Claro institucional» (paleta blanca), botones de 44 px (56 px en el celular), semáforo con color + texto, pantalla de ingreso común marcada como demo, marco de aplicación con navegación entre sistemas según el rol.
- `packages/mapa`: MapLibre GL con capas de procedimientos (color del semáforo), móviles, recorridos, unidades vecinales y mapa de calor; marcador arrastrable para la ubicación exacta.
- **Halcones**
  - Central: tablero con indicadores en vivo, cola ordenada por semáforo, mapa y detalle con línea de tiempo; crear procedimiento (tecla N) con clave, punto exacto y dirección; despacho; reasignación; cancelación con motivo; listas de procedimientos, móviles y bitácora.
  - Patrullero: abre su turno eligiendo el móvil en que sale, su nombre y el del acompañante, y hace el checklist. Desde ahí el móvil queda «Libre» en la Central.
  - Despacho: la Central ve solo los móviles con patrullero en turno, primero los libres por cercanía y después los ocupados con su procedimiento.
  - En el celular: procedimiento asignado en grande, «Cómo llegar», botones de estado, solicitar apoyo y cerrar turno.
- **Georreferenciado**: mapa en vivo con buscador, capas y leyenda; detalle con despacho desde el mapa; histórico con mapa de calor y ranking de unidades vecinales; pantalla de muro.
- **Análisis**: filtros comunes (periodo, semáforo, turno, unidad vecinal), 6 indicadores con comparación contra el periodo anterior, cumplimiento de meta por semáforo, evolución diaria, matriz hora × día, claves y unidades vecinales más frecuentes, planilla CSV para Excel (sin direcciones para roles sin acceso a datos personales) e impresión.
- `supabase/migrations/0001_esquema_inicial.sql`: tablas, PostGIS, unidad vecinal calculada desde el punto, RLS por organización y rol, auditoría, vista `v_tiempos_procedimiento` y carga de las 81 claves.
- Verificado: tipos sin errores en todo el monorepo y flujo completo probado en Chrome (patrullero abre turno → Central crea y despacha → patrullero recibe y avanza → se ve en el mapa y en Análisis).

**Pendiente o no verificado**

- En este entorno no se pudo instalar paquetes, así que `npm install` y `vite build` no se ejecutaron. La verificación se hizo con TypeScript y un empaquetado equivalente. Hay que correr `npm install && npm run build` una vez y anotar cualquier error.
- El worker de MapLibre se carga con `?worker&url` de Vite. Revisar en el primer `vite build` que el mapa dibuje en producción.
- La migración SQL no se ejecutó contra una base real.
- No hay pruebas automáticas todavía.
- Modalidades de punto fijo y patrullaje a pie en el inicio de turno.
- Checklist y kilometraje de cierre de turno.
- Fotos de evidencia.
- Mensajes Central ↔ móvil.
- Informe PDF desde el servidor.
- Mapa base: falta elegir proveedor (variable `VITE_MAPA_ESTILO_URL`).

**Propuesto para la próxima sesión**

1. Ejecutar `npm install && npm run build` y corregir lo que aparezca.
2. Halcones: punto fijo y a pie en el inicio de turno; cierre de turno con checklist y kilometraje final.
3. Georreferenciado: búsqueda de direcciones a través de un servicio en el servidor (cuando se contrate el proveedor).
4. Análisis: pestaña de tiempos por etapa (distribución) y comparación entre turnos.
5. Pruebas automáticas de `packages/datos` (semáforo, indicadores, transiciones de estado y turnos).

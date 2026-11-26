# Bitácora de trabajo

Cada sesión agrega una entrada arriba: fecha, sistema, qué se hizo, qué quedó pendiente y qué se propone.

---

## 2026-11-26 (5) · Punto fijo y a pie, cierre de turno y pruebas automáticas

**Hecho**

- Inicio de turno con tres modalidades:
  - En móvil: igual que antes.
  - Punto fijo: en un recinto (GAMA ya ubicado) o en una unidad vecinal.
  - A pie: en un sector.
- El personal sin móvil aparece en la Central (Móviles y patrulleros), en el tablero, en el mapa en vivo (marca «PF» o «A pie») y en el indicador de móviles libres.
- Cierre de turno desde el celular:
  - Kilometraje final validado contra el inicial, con el recorrido calculado.
  - Combustible, novedades del checklist y observaciones para el turno siguiente.
  - No deja cerrar con un procedimiento activo.
- El supervisor puede cerrar turnos desde la Central.
- Bitácora de la Central: tabla de turnos cerrados con kilómetros recorridos y novedades.
- Pruebas automáticas (24) en `packages/datos/pruebas`: catálogo y semáforo, territorio, indicadores, motor de patrones, datos de demostración, planilla de puntos y reglas de turnos y despacho. Corren con `npm test` (Vitest) o `bun test`.
- Una prueba encontró un error real, ya corregido: el centro calculado de la UV 45 caía fuera de su polígono (afectaba a etiquetas y a los turnos «a pie»).

**Pendiente**

- Despachar a personal a pie (hoy solo se despacha a móviles).
- Las sesiones automáticas del 26-11 terminaron en menos de un minuto sin cambios: revisar su acceso al repositorio.

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

## 6 · 26-11-2026 (tarde) — Halcones: un solo software Central + Patrulla, reportes con fotos y videos

- La demo parte **vacía**: 23 móviles sin turno, sin procedimientos ni reportes. «Ajustes de la demo» (admin/supervisor) permite vaciar o cargar 90 días de ejemplo.
- Catálogo completo de las **81 claves** (página «Claves» y lista desplegable en el buscador).
- **Nuevo procedimiento**: clave → dirección → descripción. Al marcar el punto, el sistema **asigna solo el móvil libre más cercano con patrullero en turno** («Cambiar móvil» para elegir otro). Unidad vecinal y recinto pasan a «ayudas» opcionales.
- **App del patrullero** con pestañas Inicio · Reportes · Bitácora · Mi turno.
  - Reportes: hora, n.º de halcón, unidad, barrio y UV (automáticos), dirección, tipo (patrullaje preventivo, procedimiento, punto estático), procedimiento despachado, observaciones con fotos y videos; «Añadir a este reporte» suma información después.
  - Bitácora: línea de tiempo del turno y procedimientos en los que ha estado.
  - Mi turno: «Cambiar de móvil o modalidad» cierra la bitácora actual (km final) y abre otra en otro móvil, punto fijo o a pie.
- Inicio de turno: n.º de halcón; cada ítem del checklist con «Observación» pide descripción y foto/video; fotos generales del móvil.
- Central: bandeja «Reportes de terreno» con no leídos.
- Adjuntos de la demo se guardan en IndexedDB del navegador; en producción irán a Supabase Storage con acceso por rol.
- 26 pruebas pasan; flujo completo verificado en Chrome sin errores.

## 7 · 26-11-2026 (tarde) — Mejoras por iniciativa propia: direcciones, terreno, celular y base de datos

- **Dirección → punto automático.** Escribir «Independencia 3499» o «Independencia con La Palma» muestra sugerencias solo dentro de Conchalí; al elegir, se marca el punto, se calcula la UV y se asigna el móvil más cercano. Al hacer clic en el mapa se propone la dirección (calle y número). Mismo buscador en el reporte del patrullero; con GPS se propone la dirección donde está. Sin internet o sin servicio, el campo sigue siendo texto y el punto se marca a mano.
- **Recintos GAMA:** botón «Ubicar N automáticamente» en Georreferenciado (calcula el cruce de las dos calles); en Nuevo procedimiento, elegir un recinto sin ubicar intenta ubicarlo por su esquina y lo guarda.
- **Análisis › Trabajo en terreno (nuevo):** reportes por día y tipo, mapa de calor por hora, reportes por halcón, novedades de los móviles, km y horas de servicio, y el gráfico «¿Patrullamos donde está el conflicto?» (UV bajo la diagonal = menos presencia preventiva que conflicto), con tabla «Dónde sumar rondas».
- **Motor de patrones:** usa los reportes; si una UV concentra procedimientos y casi no tiene patrullaje preventivo, lo agrega como evidencia o recomienda sumar rondas (solo con ≥ 20 reportes preventivos en 28 días, para no inventar brechas).
- **Mapa en vivo:** capa de reportes de terreno de las últimas 12 h (PP, PE, PR).
- **Celular:** fotos comprimidas a 1920 px JPEG antes de guardar (de 4–8 MB a ~0,5 MB); botones «Tomar foto», «Grabar video» y «Galería»; la app del patrullero ya no descarga el mapa (de 1,3 MB a ~0,37 MB de JavaScript); avisos arriba y máximo dos.
- **Central › Reportes:** búsqueda, filtro por tipo, fecha en reportes de otros días y paginación.
- **Datos de ejemplo:** 45 días de reportes y turnos cerrados ficticios.
- **Base de datos:** `0002_reportes_y_adjuntos.sql` con reportes, complementos, evidencias, checklist, cambio de móvil, un turno abierto por persona y por móvil, RLS, bucket privado «evidencias» y vista para Power BI sin nombres.
- 34 pruebas pasan; flujo completo verificado en Chrome (buscador simulado, porque el entorno de prueba no tiene internet).

## 8 · 26-11-2026 (tarde) — Acceso total en la demo, turno de Central, varias unidades por procedimiento y pruebas de navegador

- **Error corregido:** el patrullero (y otros roles) veía «Tu rol no tiene permiso». En la demo ahora toda cuenta entra a todo; los permisos por rol quedan para producción (`configurarAccesoTotal`). La Central tiene enlace a la app del patrullero y viceversa.
- **Turnos A-1 (07–14), B-2 (14–22) y C-3 (22–07).**
- **Turno de la Central:** para operar hay que abrir turno con nombre, n.º de halcón y turno; se ve lo que entrega el turno anterior (novedades, procedimientos activos que siguen, móviles en turno). «Cerrar turno» muestra el resumen (creados, despachos, finalizados, cancelados, modificados, activos que siguen, reportes, quiénes estuvieron y cada acción con hora y autor), pide novedades para el siguiente turno, lo guarda y permite imprimirlo. Historial en «Turnos de la Central».
- **Registro de acciones:** crear, despachar, cambiar estado, corregir (con antes/después y motivo), cancelar, turnos, reportes y datos de la demo.
- **Corregir datos** de un procedimiento (clave, dirección, punto, descripción) con motivo obligatorio. En «Procedimientos» cada fila abre el detalle.
- **Varias unidades por procedimiento:** al crear o después se eligen móviles y personal en punto fijo o a pie («Solo la más cercana», «Todos los móviles libres», «Todas las unidades libres»). La primera va a cargo; las demás de apoyo. Se pueden agregar, liberar o dejar a cargo a otra. Las ocupadas se muestran con su procedimiento.
- **Avisos al patrullero:** pantalla roja con sonido y vibración («Te despacharon · vas a cargo» o «Te enviaron de apoyo») hasta tocar «Entendido»; con permiso, notificación del sistema si la app está en segundo plano. La Central ve si cada unidad confirmó. Los apoyos informan «En camino», «En el lugar» y «Terminé mi apoyo».
- **Pruebas:** 45 pruebas de datos y 9 pruebas de navegador en `pruebas/e2e` (pytest + Playwright). Errores y su prueba en `docs/errores-y-lecciones.md`.
- **Base de datos:** migraciones 0003 (turnos de Central, auditoría por turno) y 0004 (unidades por procedimiento, un solo a cargo, una unidad en un solo procedimiento, Realtime para avisos).

## 9 · 26-11-2026 (noche) — Halcones: revisión de accesibilidad e interacción con UI/UX Pro Max

Revisión de Halcones con las reglas del plugin UI/UX Pro Max (accesibilidad, tamaño táctil, foco, mapas) y medición automática con axe-core en Chrome (computador 1440 px y celular 390 px). La paleta «Claro institucional» del plan no cambia: el sistema de diseño que propone el plugin (fondo rosado, rojo como primario) no sirve para una central de despacho.

- **Celular del patrullero a 56 px**, como pide el plan: botones, campos, selectores y los segmentos (En móvil / Punto fijo / A pie, OK / Observación). «Ir a la Central» pasa de enlace de 18 px a botón de 44 px. El checklist se apila en pantallas de menos de 380 px.
- **«Iniciar turno» dice qué falta** (nombre, móvil, kilometraje o lugar) en vez de quedar desactivado sin explicación; el texto se anuncia a lectores de pantalla.
- **Íconos correctos:** cámara para «Tomar foto» y cámara de video para «Grabar video» (antes ojo y monitor). Botón para quitar un adjunto de 24 a 32 px.
- **Central a 44 px:** menú lateral, pestañas de la cola, turnos A-1/B-2/C-3, novedades, atajos de unidades, sugerencias de claves y zoom del mapa (antes 29–40 px).
- **Cola de procedimientos:** lista con botones `aria-pressed` (antes `listbox` con `<li>` intermedios, inválido). Foco visible en cada tarjeta. La tarjeta roja sin despachar deja de parpadear si el equipo tiene «reducir movimiento».
- **Mapa:** los nombres de barrio y números de UV ya no son «botones» invisibles para el teclado. Los procedimientos tienen tamaño según semáforo (rojo grande, amarillo mediano, verde chico) como segunda señal además del color; la leyenda usa los mismos tamaños.
- **Foco en alto contraste de Windows:** contorno transparente que el sistema vuelve visible (la sombra azul desaparece en ese modo).
- **Resultado:** axe-core sin fallas en ingreso, Central, nuevo procedimiento y app del patrullero (antes: 1 crítica, 2 serias, 1 moderada). Ningún control bajo 44 px en la Central ni bajo 56 px en el celular. 45 pruebas de datos y 12 de navegador pasan.
- **Común:** cambios en `packages/ui` (foco, nav, segmentos, íconos `camara` y `video`) y `packages/mapa` (etiquetas, zoom, tamaño por semáforo): afectan también a Georreferenciado y Análisis, para bien.
- **Próximo:** misma revisión en Georreferenciado y Análisis; marcadores de procedimientos con forma (no solo tamaño) cuando el mapa tenga íconos propios.
- **Ver la demo en Claude sin descargar:** `npm run build:artefacto` compila los tres sistemas con rutas relativas y enrutador por `#` en `dist-artefacto/` (sin servidor). Publicada como página privada del usuario: https://claude.ai/artifact/9mdcWwzXCRY8K8YAoY7LmB. Ahí no carga el mapa con calles ni el buscador de direcciones (la página no puede llamar a otros sitios); se ven las unidades vecinales y el punto se marca a mano.
- **Error corregido:** los enlaces entre sistemas fallaban si la demo arrancaba en un puerto distinto de 4173 (4174, 4175…); ahora el modo desarrollo se detecta con `import.meta.env.DEV`.

## 10 · 26-11-2026 (noche) — Halcones: mapa con calles propias, Google Maps para crear procedimientos, filtros, puntos fijos y tema «Marino vivo»

- **Calles de Conchalí embebidas** (`packages/datos/src/geo/calles-osm.ts`, 1.781 tramos de OpenStreetMap, ODbL; se regeneran con `scripts/calles-osm.mjs`). El mapa dibuja calles y nombres sin servidor de mapas (sirve sin internet y en la página de Claude). Botón **Plano / Satélite** (fotos de Esri; requieren internet).
- **Buscador propio** (`geo/callejero.ts`, `geo/buscador-local.ts`): esquinas escritas de muchas formas («con», «esquina», «esq.», «y», «/», «&», «c/», «-», «esquina de … con …»), abreviaturas (Av., Avda., Pje., Gral., Tte., Pdte., Cdl., JM), alias (Panamericana, Vespucio, Cardenal Caro), errores de tipeo y número antes o después. Números estimados entre direcciones conocidas (Municipalidad = Independencia 3499, Metro Vivaceta = 4765, Metro Cardenal Caro = J. M. Caro 1857) y marcados «confirma el punto». Si el operador escribe una dirección y corrige el punto, el sistema la **aprende** (exacta la próxima vez y ancla de numeración). Nominatim queda solo de respaldo.
- **Crear y despachar con Google Maps** (pedido del usuario): mapa de Google (plano/satélite, Street View) y sugerencias de Places API (New) + Geocoding API, limitados a Conchalí, con token de sesión. Se activa con `VITE_GOOGLE_MAPS_KEY` (ver `.env.example`). Sin clave o si Google no carga, aviso visible y mapa propio para no detener la operación. «Abrir en Google Maps» en el formulario y en el detalle. El punto guardado es el que confirma o corrige el operador (condición de Google).
- **Módulo de filtros del mapa** (Central): GAMA, SAPU/SAR, Carabineros, bomberos, Metro L3 y puntos fijos, con lista por grupo; al tocar un lugar el mapa lo centra y lo destaca.
- **Lugares nuevos**: SAR Conchalí (Independencia 5663), SAPU Lucas Sierra (Pedro Fontova 4107), SAPU Alberto Bachelet (El Guanaco 3250), 5ª Comisaría (Gral. Gambino 3739), Subcomisaría Conchalí Norte (Independencia 6208), Retén Eneas Gonel (Armando Carrera 4041), Bomberos 1ª (Dorsal 1495), 4ª (J. M. Caro 1593), 5ª (El Guanaco 4488), 7ª y Comandancia (Quilicura 2275), Metro Conchalí/Vivaceta/Cardenal Caro. Los GAMA y los que tienen esquina se ubican solos («calculada»: confirmar); SAPU Bachelet, 5ª Comisaría y bomberos quedan «sin ubicar» hasta marcarlos.
- **Puntos fijos** (`puntos-fijos.ts`): Metro Conchalí, Metro Vivaceta, Metro Cardenal Caro (ubicados), Paso Bajo Nivel y Pasarela (falta marcarlos). Pantalla **Central › Lugares y puntos fijos** para agregar, editar, desactivar y eliminar (nombre, dirección, punto, UV automática, indicaciones) y para ubicar o confirmar lugares. El patrullero elige su punto fijo al iniciar turno.
- **Orden de la flota**: Móvil 01–17, Alpha y RAM (`compararMoviles`).
- **Tema «Marino vivo»** (paleta del plugin UI/UX Pro Max, perfil gobierno/servicio público): barra lateral marino, acento cian, fondo azulado, botones con degradé, indicadores con íconos de color. Ilustraciones SVG propias: emblema del halcón, ciudad con Central y móvil (ingreso), móvil de seguridad (app del patrullero), radar «todo en orden» (cola vacía). El semáforo sigue reservado para prioridades.
- **Pruebas**: 54 de datos (nuevas: callejero, puntos fijos, orden de flota) y 12 de navegador; axe-core sin fallas en ingreso, Central, nuevo procedimiento y patrullero. `test_varias_unidades` usa ahora el punto fijo Metro Cardenal Caro (el de Metro Conchalí queda más cerca que el móvil y pasa a estar a cargo, que es lo correcto).
- **Pendiente**: clave de Google Maps del municipio; ubicar Paso Bajo Nivel, Pasarela, SAPU Bachelet, 5ª Comisaría y bomberos; verificar en terreno las ubicaciones «calculadas»; actualizar el plan maestro con el cambio de paleta y el uso de Google Maps.

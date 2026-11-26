# Bitácora de trabajo

Cada sesión agrega una entrada arriba: fecha, sistema, qué se hizo, qué quedó pendiente y qué se propone.

---

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

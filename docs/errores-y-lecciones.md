# Errores encontrados y cómo evitamos que se repitan

Cada error real queda aquí con su causa y **la prueba que lo vigila**. Regla: no se corrige un error sin agregar una prueba que falle si vuelve.

| Fecha | Error | Causa | Prueba que lo vigila |
|---|---|---|---|
| 26-11 | El patrullero veía «Tu rol no tiene permiso» al entrar a Georreferenciado, Análisis o la Central. | En la demo se aplicaban los permisos por rol de producción. | `pruebas/e2e/test_acceso.py` (las 6 cuentas × 3 sistemas × 16 pantallas) y `datos.test.ts › acceso`. |
| 26-11 | `localhost` no abría en Windows. | El navegador se abría antes de que el servidor escuchara; ruta relativa a la carpeta actual. | Arranque probado en `scripts/servir-demo.mjs` (abre el navegador después de `listen`, ruta absoluta). Pendiente confirmar en Windows. |
| 26-11 | El mapa tenía alto 0 y no se veía. | MapLibre cambia `position` del lienzo. | Capturas en Chrome en cada entrega. |
| 26-11 | «Deshacer» un despacho cancelaba el procedimiento. | Se reutilizó la acción de cancelar. | Se quitó; `cliente.test.ts › turnos y despacho`. |
| 26-11 | Centro de UV 45 caía fuera de su polígono. | Promedio de vértices en polígono cóncavo. | `datos.test.ts › centroide dentro de cada UV`. |
| 26-11 | En «Procedimientos» no se podía abrir un procedimiento. | La tabla no tenía acción al hacer clic. | `test_central.py` (corrige y cancela desde la lista). |
| 26-11 | El mensaje de kilometraje no decía qué estaba mal. | Texto ambiguo. | `test_patrulla.py` (rechaza km final menor). |
| 26-11 | Los avisos tapaban los botones en el celular. | Hasta 3 avisos de 5 s abajo. | Máximo 2, arriba en el celular, 3,5 s. |

## Cómo se prueba antes de cada entrega

1. `npm test` (o `bun test packages/datos/pruebas`): reglas de datos, permisos, turnos, despacho de varias unidades, reportes, análisis.
2. `npm run build && npm run demo` y en otra terminal `pytest pruebas/e2e -q`: recorre en Chrome todas las pantallas con todas las cuentas, el turno de la Central, la app del patrullero, el despacho a varias unidades con sus avisos y el análisis.
3. Si algo falla, no se entrega.

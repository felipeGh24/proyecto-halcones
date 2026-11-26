# Plataforma de Seguridad Pública

Tres sistemas que comparten una sola base de datos y pueden venderse por separado o juntos:

| Sistema | Para quién | Qué hace |
| --- | --- | --- |
| **Halcones** (`apps/halcones`) | Central de Operaciones y patrulleros | Web de la Central para crear y despachar procedimientos, y app web del patrullero (`/patrulla`) para abrir su turno en un móvil y avanzar los estados |
| **Georreferenciado** (`apps/georreferenciado`) | Central, supervisión, jefatura | Mapa en vivo de procedimientos y móviles, despacho desde el mapa, histórico con mapa de calor y pantalla de muro |
| **Análisis de eventos** (`apps/analisis`) | Jefatura y analistas | Tiempos reales de despacho, llegada y respuesta; cumplimiento de meta por semáforo; cuándo, dónde y qué pasa; planillas e informes |

Plan completo del producto: [Plan maestro](https://claude.ai/artifact/3cfQosiFTm76Mi4wtykxnE). Bitácora de avance: [`docs/bitacora.md`](docs/bitacora.md).

## Cómo funciona Halcones

1. El **patrullero** entra a la app en su celular, elige el **móvil en que sale**, confirma su nombre y el de su acompañante, y hace el checklist. Desde ese momento el móvil aparece como **Libre** en la Central.
2. La **Central** crea el procedimiento: clave (con su semáforo), punto exacto en el mapa y dirección. La unidad vecinal y el barrio se calculan solos.
3. Al despachar, la Central ve **solo los móviles con un patrullero en turno**: primero los libres, ordenados por cercanía, y después los ocupados, con el procedimiento que atienden. Los móviles sin turno no aparecen.
4. El patrullero recibe el procedimiento al instante y avanza: **Voy en camino → Llegué al lugar → Iniciar procedimiento → Finalizar** (con resultado). Cada paso guarda hora, autor y ubicación.
5. El mapa lo muestra en vivo y Análisis mide cada etapa.

## Estructura

```
apps/
  halcones/            Central (web) + app del patrullero (/patrulla)
  georreferenciado/    Mapa en vivo
  analisis/            Panel de jefatura e informes
packages/
  datos/               Modelo común, catálogo de 81 claves con semáforo, cliente de datos, roles, indicadores
  ui/                  Sistema de diseño «Claro institucional», ingreso, marco de la app
  mapa/                Motor de mapas (MapLibre GL) y selector de ubicación exacta
supabase/migrations/   Esquema PostgreSQL + PostGIS, permisos por fila (RLS), auditoría y vistas de análisis
scripts/               Servidor de la demo con los tres sistemas en un mismo origen
```

## Correr en local

Requiere Node 20 o superior.

```bash
npm install
npm run dev:halcones          # http://localhost:5173/halcones/
npm run dev:georreferenciado  # http://localhost:5174/georreferenciado/
npm run dev:analisis          # http://localhost:5175/analisis/
```

En desarrollo cada sistema corre en su propio puerto y por eso tiene su propia sesión y sus propios datos de ejemplo. Para ver los tres conectados (un procedimiento creado en Halcones aparece en el mapa y en Análisis):

```bash
npm run build
npm run demo                  # http://localhost:4173/halcones/ (y /georreferenciado/, /analisis/)
```

### Modo demostración

Mientras no se conecte la base de datos, todo funciona con **datos ficticios guardados en el navegador** y la pantalla de ingreso lo dice claramente. Cuentas de ejemplo (contraseña `demo2026`):

| Cuenta | Rol |
| --- | --- |
| `operador@demo.cl` | Operador de Central |
| `supervisor@demo.cl` | Supervisor de turno |
| `patrullero@demo.cl` | Patrullero (app del celular) |
| `jefatura@demo.cl` | Jefatura / Dirección |
| `analista@demo.cl` | Analista |
| `admin@demo.cl` | Administrador |

Esto **no es autenticación real**. Al conectar Supabase Auth, el ingreso valida contra el servidor y los permisos se aplican también en la base (RLS).

Para probar el flujo completo con `npm run demo`: entra como patrullero e inicia turno en el Móvil 03; cierra sesión; entra como operador, crea un procedimiento y despáchalo al Móvil 03; vuelve a entrar como patrullero y avanza los estados.

## Variables de entorno

Copia `.env.example` como `.env.local` en la raíz. Nunca subas valores reales al repositorio.

- `VITE_MAPA_ESTILO_URL`: estilo del mapa base del proveedor contratado (por ejemplo MapTiler), con la clave restringida por dominio. Sin esta variable el mapa muestra solo los límites de las unidades vecinales.
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: cuando exista el proyecto de Supabase.

## Seguridad

- Sin secretos en el código ni en el repositorio; `.env*` está en `.gitignore`.
- Roles asignados por un administrador; nadie elige su propio rol.
- Sesión que se cierra tras 30 minutos sin uso y bloqueo de 5 minutos tras 5 intentos fallidos (en la demo, en el navegador; en producción, en el servidor).
- Permisos por fila en la base (RLS), auditoría que no se puede modificar y vistas de análisis sin datos personales.
- Cabeceras de seguridad en `vercel.json`.
- Solo datos de ejemplo: ningún dato real de personas.

## Despliegue

`vercel.json` publica los tres sistemas bajo un mismo dominio (`/halcones`, `/georreferenciado`, `/analisis`). Para usar dominios separados basta con desplegar cada carpeta de `dist/` por su cuenta.

-- =====================================================================
-- Plataforma de Seguridad Pública · esquema inicial
-- Una sola base para Halcones, Georreferenciado y Análisis de eventos.
-- Multi-organización: cada fila pertenece a un municipio (organizacion_id).
-- Seguridad: RLS en todas las tablas; el rol del usuario viene de public.usuarios.
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type prioridad as enum ('critica', 'alta', 'media', 'baja');
create type semaforo as enum ('rojo', 'amarillo', 'verde');
create type estado_procedimiento as enum ('recibido', 'asignado', 'en_desplazamiento', 'en_el_lugar', 'en_procedimiento', 'finalizado', 'cancelado');
create type estado_movil as enum ('disponible', 'asignado', 'en_procedimiento', 'fuera_de_servicio');
create type rol_usuario as enum ('administrador', 'jefatura', 'supervisor', 'operador', 'patrullero', 'analista');

-- ---------- Organizaciones y usuarios ----------
create table organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  configuracion jsonb not null default '{}',
  creada_en timestamptz not null default now()
);

create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  organizacion_id uuid not null references organizaciones (id),
  nombre text not null,
  rol rol_usuario not null,
  activo boolean not null default true,
  movil_id uuid,
  creado_en timestamptz not null default now()
);

-- Funciones auxiliares para las políticas (security definer: no exponen la tabla).
create or replace function mi_organizacion() returns uuid
language sql stable security definer set search_path = public as
$$ select organizacion_id from usuarios where id = auth.uid() and activo $$;

create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as
$$ select rol from usuarios where id = auth.uid() and activo $$;

-- ---------- Catálogo de claves ----------
create table claves (
  numero smallint primary key,
  nombre text not null,
  prioridad prioridad not null,
  semaforo semaforo generated always as (
    case prioridad when 'critica' then 'rojo'::semaforo when 'alta' then 'rojo'::semaforo
                   when 'media' then 'amarillo'::semaforo else 'verde'::semaforo end
  ) stored,
  meta_minutos smallint generated always as (
    case prioridad when 'critica' then 3 when 'alta' then 5 when 'media' then 15 else null end
  ) stored
);

-- ---------- Territorio ----------
create table unidades_vecinales (
  organizacion_id uuid not null references organizaciones (id),
  numero smallint not null,
  nombre text not null,
  barrio text not null,
  geom geometry (Polygon, 4326) not null,
  primary key (organizacion_id, numero)
);
create index on unidades_vecinales using gist (geom);

-- ---------- Flota ----------
create table moviles (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  nombre text not null,
  tipo text not null,
  patente text,
  estado estado_movil not null default 'disponible',
  procedimiento_id uuid,
  unique (organizacion_id, nombre)
);

-- ---------- Procedimientos ----------
create table procedimientos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  folio bigint generated always as identity,
  clave_numero smallint not null references claves (numero),
  descripcion text not null default '',
  direccion text not null,
  ubicacion geography (Point, 4326) not null,
  unidad_vecinal smallint,
  estado estado_procedimiento not null default 'recibido',
  movil_id uuid references moviles (id),
  resultado text,
  creado_en timestamptz not null default now(),
  creado_por uuid not null references usuarios (id)
);
create index on procedimientos (organizacion_id, creado_en desc);
create index on procedimientos (organizacion_id, estado) where estado not in ('finalizado', 'cancelado');
create index on procedimientos using gist (ubicacion);

-- Cada cambio de estado con hora, autor y ubicación: base de la línea de tiempo y de los indicadores.
create table procedimiento_eventos (
  id bigint generated always as identity primary key,
  procedimiento_id uuid not null references procedimientos (id) on delete cascade,
  organizacion_id uuid not null references organizaciones (id),
  estado estado_procedimiento not null,
  en timestamptz not null default now(),
  por uuid not null references usuarios (id),
  nota text,
  ubicacion geography (Point, 4326)
);
create index on procedimiento_eventos (procedimiento_id, en);

-- Unidad vecinal calculada desde el punto exacto, no escrita a mano.
create or replace function asignar_unidad_vecinal() returns trigger
language plpgsql as $$
begin
  select uv.numero into new.unidad_vecinal
  from unidades_vecinales uv
  where uv.organizacion_id = new.organizacion_id and st_contains(uv.geom, new.ubicacion::geometry)
  limit 1;
  return new;
end $$;
create trigger procedimientos_uv before insert or update of ubicacion on procedimientos
for each row execute function asignar_unidad_vecinal();

-- ---------- Turnos, posiciones y evidencia ----------
create table turnos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  usuario_id uuid not null references usuarios (id),
  movil_id uuid references moviles (id),
  modalidad text not null,
  checklist jsonb not null default '{}',
  km_inicial integer,
  km_final integer,
  iniciado_en timestamptz not null default now(),
  cerrado_en timestamptz,
  novedades text
);

create table posiciones (
  id bigint generated always as identity primary key,
  organizacion_id uuid not null references organizaciones (id),
  movil_id uuid references moviles (id),
  usuario_id uuid references usuarios (id),
  turno_id uuid references turnos (id),
  ubicacion geography (Point, 4326) not null,
  precision_m real,
  en timestamptz not null default now()
);
create index on posiciones (movil_id, en desc);

create table evidencias (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  procedimiento_id uuid references procedimientos (id),
  turno_id uuid references turnos (id),
  ruta_almacenamiento text not null,
  tipo text not null,
  subida_por uuid not null references usuarios (id),
  subida_en timestamptz not null default now()
);

-- ---------- Auditoría (solo inserción) ----------
create table auditoria (
  id bigint generated always as identity primary key,
  organizacion_id uuid,
  usuario_id uuid,
  accion text not null,
  tabla text,
  registro_id text,
  detalle jsonb,
  en timestamptz not null default now()
);

create or replace function auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (organizacion_id, usuario_id, accion, tabla, registro_id, detalle)
  values (coalesce(new.organizacion_id, old.organizacion_id), auth.uid(), tg_op, tg_table_name,
          coalesce(new.id, old.id)::text, jsonb_build_object('nuevo', to_jsonb(new), 'anterior', to_jsonb(old)));
  return coalesce(new, old);
end $$;
create trigger auditar_procedimientos after insert or update or delete on procedimientos for each row execute function auditar();
create trigger auditar_moviles after insert or update or delete on moviles for each row execute function auditar();
create trigger auditar_usuarios after insert or update or delete on usuarios for each row execute function auditar();

-- ---------- Seguridad por filas (RLS) ----------
alter table organizaciones enable row level security;
alter table usuarios enable row level security;
alter table claves enable row level security;
alter table unidades_vecinales enable row level security;
alter table moviles enable row level security;
alter table procedimientos enable row level security;
alter table procedimiento_eventos enable row level security;
alter table turnos enable row level security;
alter table posiciones enable row level security;
alter table evidencias enable row level security;
alter table auditoria enable row level security;

create policy "claves: lectura autenticada" on claves for select to authenticated using (true);
create policy "organización propia" on organizaciones for select to authenticated using (id = mi_organizacion());
create policy "usuarios: ver los de mi organización" on usuarios for select to authenticated using (organizacion_id = mi_organizacion());
create policy "usuarios: solo administrador modifica" on usuarios for all to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() = 'administrador')
  with check (organizacion_id = mi_organizacion() and mi_rol() = 'administrador');
create policy "uv: lectura" on unidades_vecinales for select to authenticated using (organizacion_id = mi_organizacion());
create policy "móviles: lectura" on moviles for select to authenticated using (organizacion_id = mi_organizacion());
create policy "móviles: central actualiza" on moviles for update to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'supervisor', 'operador'));

-- El patrullero solo ve los procedimientos de su móvil; el analista no lee la tabla (usa las vistas anónimas).
create policy "procedimientos: lectura" on procedimientos for select to authenticated using (
  organizacion_id = mi_organizacion() and (
    mi_rol() in ('administrador', 'jefatura', 'supervisor', 'operador')
    or (mi_rol() = 'patrullero' and movil_id = (select movil_id from usuarios where id = auth.uid()))
  )
);
create policy "procedimientos: crear" on procedimientos for insert to authenticated
  with check (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'supervisor', 'operador') and creado_por = auth.uid());
create policy "procedimientos: actualizar" on procedimientos for update to authenticated using (
  organizacion_id = mi_organizacion() and (
    mi_rol() in ('administrador', 'supervisor', 'operador')
    or (mi_rol() = 'patrullero' and movil_id = (select movil_id from usuarios where id = auth.uid()))
  )
);
create policy "eventos: lectura" on procedimiento_eventos for select to authenticated
  using (organizacion_id = mi_organizacion() and exists (select 1 from procedimientos p where p.id = procedimiento_id));
create policy "eventos: registrar" on procedimiento_eventos for insert to authenticated
  with check (organizacion_id = mi_organizacion() and por = auth.uid()
              and exists (select 1 from procedimientos p where p.id = procedimiento_id));
create policy "turnos: propios o central" on turnos for all to authenticated using (
  organizacion_id = mi_organizacion() and (usuario_id = auth.uid() or mi_rol() in ('administrador', 'supervisor', 'operador', 'jefatura'))
) with check (organizacion_id = mi_organizacion() and (usuario_id = auth.uid() or mi_rol() in ('administrador', 'supervisor')));
create policy "posiciones: registrar propias" on posiciones for insert to authenticated
  with check (organizacion_id = mi_organizacion() and usuario_id = auth.uid());
create policy "posiciones: central lee" on posiciones for select to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'supervisor', 'operador', 'jefatura'));
create policy "evidencias: lectura" on evidencias for select to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'supervisor', 'operador', 'jefatura'));
create policy "evidencias: subir" on evidencias for insert to authenticated
  with check (organizacion_id = mi_organizacion() and subida_por = auth.uid());
create policy "auditoría: administrador y jefatura" on auditoria for select to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'jefatura'));
-- Nadie actualiza ni borra la auditoría: no hay políticas de update/delete.

-- ---------- Vistas de análisis (sin datos personales) ----------
-- Tiempos por procedimiento, en minutos. Sirven al sistema de Análisis y a Power BI (usuario de solo lectura).
-- La vista no expone descripción, dirección exacta ni personas; filtra por organización y rol en su propio WHERE,
-- por eso corre con los permisos de su dueño (el analista no tiene lectura directa de la tabla procedimientos).
create view v_tiempos_procedimiento as
select
  p.id,
  p.organizacion_id,
  p.folio,
  p.clave_numero,
  c.prioridad,
  c.semaforo,
  c.meta_minutos,
  p.unidad_vecinal,
  p.estado,
  p.creado_en,
  extract(epoch from (e.asignado - e.recibido)) / 60 as min_despacho,
  extract(epoch from (e.en_lugar - e.asignado)) / 60 as min_llegada,
  extract(epoch from (e.en_lugar - e.recibido)) / 60 as min_respuesta,
  extract(epoch from (e.finalizado - e.en_lugar)) / 60 as min_en_lugar,
  case when c.meta_minutos is null or e.en_lugar is null then null
       else (extract(epoch from (e.en_lugar - e.recibido)) / 60) <= c.meta_minutos end as dentro_de_meta
from procedimientos p
join claves c on c.numero = p.clave_numero
left join lateral (
  select
    min(en) filter (where estado = 'recibido') as recibido,
    min(en) filter (where estado = 'asignado') as asignado,
    min(en) filter (where estado = 'en_el_lugar') as en_lugar,
    min(en) filter (where estado = 'finalizado') as finalizado
  from procedimiento_eventos ev where ev.procedimiento_id = p.id
) e on true
where p.organizacion_id = mi_organizacion()
  and mi_rol() in ('administrador', 'jefatura', 'supervisor', 'analista');

grant select on v_tiempos_procedimiento to authenticated;

-- ---------- Tiempo real ----------
alter publication supabase_realtime add table procedimientos, procedimiento_eventos, moviles;

-- ---------- Catálogo de claves (heredado del sistema anterior) ----------
insert into claves (numero, nombre, prioridad) values
  (1, 'Abigeato', 'media'),
  (2, 'Accidente', 'alta'),
  (3, 'Acuartelamiento', 'media'),
  (4, 'Adopte medidas de seguridad', 'media'),
  (5, 'Agresión', 'alta'),
  (6, 'Alarma', 'alta'),
  (7, 'Autentifíquese', 'baja'),
  (8, 'Aplique plan de cierre ciudad', 'critica'),
  (9, 'Aplique procedimiento', 'media'),
  (10, 'Armamento', 'critica'),
  (11, 'Alimentación', 'baja'),
  (12, 'Allanamiento', 'alta'),
  (13, 'Asalto mano armada', 'critica'),
  (14, 'Patrullero es atacado', 'critica'),
  (15, 'Comerciante ambulante', 'media'),
  (16, 'Comunicaciones interferidas', 'media'),
  (17, 'Comunicaciones restringidas', 'media'),
  (18, 'Control a', 'media'),
  (19, 'Cuartel de seguridad atacado', 'critica'),
  (20, 'Cuartel de seguridad', 'media'),
  (21, 'Daños', 'alta'),
  (22, 'Detenidos', 'alta'),
  (23, 'Desorden', 'alta'),
  (24, 'Desplazamiento de tropas', 'media'),
  (25, 'Disparos', 'critica'),
  (26, 'Drogas', 'alta'),
  (27, 'Ebrios', 'media'),
  (28, 'Edificios de', 'media'),
  (29, 'Entrevista', 'baja'),
  (30, 'En dirección', 'baja'),
  (31, 'Escolta', 'media'),
  (32, 'Explosivos', 'critica'),
  (33, 'Extremistas', 'alta'),
  (34, 'Facilidades', 'baja'),
  (35, 'Fiscalice', 'media'),
  (36, 'Grupo o individuo armado', 'critica'),
  (37, 'Grupo o individuo sospechoso', 'alta'),
  (38, 'Huelga', 'alta'),
  (39, 'Hurto', 'media'),
  (40, 'Homicidio', 'critica'),
  (41, 'Incendio', 'critica'),
  (42, 'Intercepte vehículo', 'alta'),
  (43, 'Jefe de', 'baja'),
  (44, 'Lesionado', 'alta'),
  (45, 'Llame por teléfono', 'baja'),
  (46, 'Manténgase en el lugar', 'baja'),
  (47, 'Muerto', 'critica'),
  (48, 'Novedades solicito', 'baja'),
  (49, 'No hay novedad', 'baja'),
  (50, 'Normalice los servicios', 'baja'),
  (51, 'Obstáculo vía pública', 'media'),
  (52, 'Ocupación de', 'media'),
  (53, 'Operativo de', 'media'),
  (54, 'Paro', 'alta'),
  (55, 'Patrulle e informe', 'media'),
  (56, 'Pase a canal', 'baja'),
  (57, 'Preste cooperación', 'media'),
  (58, 'Proceda con personal de carabineros', 'alta'),
  (59, 'Procedimiento que involucra autoridades', 'alta'),
  (60, 'Protesta', 'alta'),
  (61, 'Rapto', 'critica'),
  (62, 'Recójase a cuartel', 'baja'),
  (63, 'Reclamo', 'media'),
  (64, 'Retirarse del lugar', 'baja'),
  (65, 'Resultado', 'baja'),
  (66, 'Riña', 'alta'),
  (67, 'Robo', 'alta'),
  (68, 'Saqueo', 'critica'),
  (69, 'Secuestro', 'critica'),
  (70, 'Sin efecto', 'baja'),
  (71, 'Solicita antecedentes', 'media'),
  (72, 'Solucionado en el lugar', 'baja'),
  (73, 'Solicita autorización carro', 'media'),
  (74, 'Suicidio', 'critica'),
  (75, 'Trasládese a', 'media'),
  (76, 'Ubicación y dirección', 'media'),
  (77, 'Uniformado sospechoso', 'alta'),
  (78, 'Usurpación de identidad', 'alta'),
  (79, 'Vigilancia especial', 'media'),
  (80, 'Violación', 'critica'),
  (81, 'Vehículo abandonado', 'media');

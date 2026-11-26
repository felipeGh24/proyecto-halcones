-- =====================================================================
-- 0004 · Varias unidades por procedimiento (a cargo + apoyos) y personal sin móvil
-- =====================================================================

create type estado_unidad as enum ('asignado', 'en_camino', 'en_el_lugar', 'liberado');

-- Personal en punto fijo o a pie: el turno es la unidad que se despacha.
alter table turnos add column procedimiento_id uuid references procedimientos (id);

create table procedimiento_unidades (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  procedimiento_id uuid not null references procedimientos (id) on delete cascade,
  movil_id uuid references moviles (id),
  turno_id uuid references turnos (id),          -- punto fijo o a pie
  a_cargo boolean not null default false,
  estado estado_unidad not null default 'asignado',
  asignado_en timestamptz not null default now(),
  recibido_en timestamptz,                        -- el patrullero tocó «Entendido»
  actualizado_en timestamptz not null default now(),
  asignado_por uuid not null references usuarios (id) default auth.uid(),
  check (num_nonnulls(movil_id, turno_id) = 1)
);
-- Una sola unidad a cargo activa por procedimiento, y una unidad no puede estar en dos procedimientos a la vez.
create unique index proc_unidades_un_a_cargo on procedimiento_unidades (procedimiento_id) where a_cargo and estado <> 'liberado';
create unique index proc_unidades_movil_ocupado on procedimiento_unidades (movil_id) where estado <> 'liberado' and movil_id is not null;
create unique index proc_unidades_turno_ocupado on procedimiento_unidades (turno_id) where estado <> 'liberado' and turno_id is not null;
create index on procedimiento_unidades (procedimiento_id);

alter table procedimiento_unidades enable row level security;
create policy "unidades: lectura central y la propia unidad" on procedimiento_unidades for select to authenticated using (
  organizacion_id = mi_organizacion()
  and (
    mi_rol() in ('administrador', 'jefatura', 'supervisor', 'operador', 'analista')
    or exists (select 1 from turnos t where t.usuario_id = auth.uid() and t.cerrado_en is null and (t.id = turno_id or t.movil_id = procedimiento_unidades.movil_id))
  )
);
create policy "unidades: la Central despacha" on procedimiento_unidades for insert to authenticated
  with check (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'supervisor', 'operador'));
create policy "unidades: la Central y la propia unidad actualizan" on procedimiento_unidades for update to authenticated using (
  organizacion_id = mi_organizacion()
  and (
    mi_rol() in ('administrador', 'supervisor', 'operador')
    or exists (select 1 from turnos t where t.usuario_id = auth.uid() and t.cerrado_en is null and (t.id = turno_id or t.movil_id = procedimiento_unidades.movil_id))
  )
);

create trigger auditar_procedimiento_unidades after insert or update on procedimiento_unidades for each row execute function auditar();

-- Avisos: la app del patrullero se suscribe por Realtime a sus filas de procedimiento_unidades;
-- con la app cerrada, un Edge Function envía notificación push (Web Push) al dispositivo del turno.
alter publication supabase_realtime add table procedimiento_unidades;

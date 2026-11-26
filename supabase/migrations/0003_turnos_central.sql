-- =====================================================================
-- 0003 · Turnos de la Central y registro de acciones visible para el turno
-- =====================================================================

create table turnos_central (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  usuario_id uuid not null references usuarios (id) default auth.uid(),
  nombre text not null check (length(trim(nombre)) >= 3),
  halcon text not null check (length(trim(halcon)) >= 1),
  turno text not null check (turno in ('manana', 'tarde', 'noche')),  -- A-1 07–14 · B-2 14–22 · C-3 22–07
  iniciado_en timestamptz not null default now(),
  cerrado_en timestamptz,
  novedades_recepcion text not null default '',
  novedades_entrega text not null default '',
  -- Resumen congelado al cerrar (cifras, personas, pendientes y acciones), para imprimir y auditar.
  resumen jsonb,
  check (cerrado_en is null or cerrado_en >= iniciado_en)
);
create unique index turnos_central_uno_abierto on turnos_central (usuario_id) where cerrado_en is null;
create index on turnos_central (organizacion_id, cerrado_en desc);

alter table turnos_central enable row level security;
create policy "turnos central: lectura en la organización" on turnos_central for select to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'jefatura', 'supervisor', 'operador'));
create policy "turnos central: cada uno abre el suyo" on turnos_central for insert to authenticated
  with check (organizacion_id = mi_organizacion() and usuario_id = auth.uid() and cerrado_en is null);
create policy "turnos central: cerrar el propio (o supervisor)" on turnos_central for update to authenticated
  using (organizacion_id = mi_organizacion() and cerrado_en is null and (usuario_id = auth.uid() or mi_rol() in ('administrador', 'supervisor')))
  with check (organizacion_id = mi_organizacion());

-- Toda acción de la Central queda en auditoría a nombre del turno abierto (nombre y halcón).
alter table auditoria add column turno_central_id uuid references turnos_central (id);

create or replace function turno_central_actual() returns uuid
language sql stable security definer set search_path = public as
$$ select id from turnos_central where usuario_id = auth.uid() and cerrado_en is null limit 1 $$;

create or replace function auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (organizacion_id, usuario_id, accion, tabla, registro_id, detalle, turno_central_id)
  values (coalesce(new.organizacion_id, old.organizacion_id), auth.uid(), tg_op, tg_table_name,
          coalesce(new.id, old.id)::text, jsonb_build_object('nuevo', to_jsonb(new), 'anterior', to_jsonb(old)),
          turno_central_actual());
  return coalesce(new, old);
end $$;

create trigger auditar_turnos_central after insert or update on turnos_central for each row execute function auditar();

-- Supervisores y operadores ven las acciones (el cierre de turno las resume); los datos completos siguen siendo de administrador y jefatura.
create policy "auditoría: la Central ve las acciones de los turnos" on auditoria for select to authenticated
  using (organizacion_id = mi_organizacion() and mi_rol() in ('supervisor', 'operador') and turno_central_id is not null);

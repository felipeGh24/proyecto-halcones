-- =====================================================================
-- 0002 · Reportes de terreno, fotos y videos, checklist y cambio de móvil
-- Refleja lo que la demo ya hace en el navegador (packages/datos/src/cliente.ts).
-- No crea ni modifica ningún proyecto: se aplica cuando exista la base.
-- =====================================================================

-- Los móviles parten sin turno; la Central solo despacha a los que tienen patrullero.
alter type estado_movil add value if not exists 'sin_turno';

create type tipo_reporte as enum ('patrullaje_preventivo', 'procedimiento', 'punto_estatico');

-- ---------- Turnos: halcón, combustible, cierre y cambio de móvil ----------
alter table turnos
  add column halcon text,
  add column acompanante text,
  add column combustible_inicial text,
  add column combustible_final text,
  add column novedades_cierre text[] not null default '{}',
  add column lugar text,                                     -- punto fijo o sector a pie
  add column ubicacion geography (Point, 4326),
  -- «Cambiar de móvil o modalidad» cierra un turno y abre otro enlazado.
  add column turno_anterior_id uuid references turnos (id),
  add constraint turnos_km_validos check (km_final is null or km_inicial is null or km_final >= km_inicial),
  add constraint turnos_modalidad check (modalidad in ('movil', 'punto_fijo', 'a_pie'));

-- Un usuario solo puede tener un turno abierto, y un móvil solo un turno abierto.
create unique index turnos_un_abierto_por_usuario on turnos (usuario_id) where cerrado_en is null;
create unique index turnos_un_abierto_por_movil on turnos (movil_id) where cerrado_en is null and movil_id is not null;

-- ---------- Reportes de terreno ----------
create sequence reportes_folio;

create table reportes (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  folio text not null default ('R-' || lpad(nextval('reportes_folio')::text, 5, '0')),
  usuario_id uuid not null references usuarios (id) default auth.uid(),
  turno_id uuid references turnos (id),
  movil_id uuid references moviles (id),
  halcon text,
  unidad text not null,
  tipo tipo_reporte not null,
  direccion text not null check (length(trim(direccion)) >= 3),
  ubicacion geography (Point, 4326),
  unidad_vecinal smallint,
  barrio text,
  procedimiento_id uuid references procedimientos (id),
  observaciones text not null default '' check (length(observaciones) <= 4000),
  leido_por_central_en timestamptz,
  leido_por uuid references usuarios (id),
  creado_en timestamptz not null default now(),
  unique (organizacion_id, folio),
  -- Un reporte de procedimiento debe indicar cuál o explicar qué pasó.
  check (tipo <> 'procedimiento' or procedimiento_id is not null or length(trim(observaciones)) >= 5)
);
create index on reportes (organizacion_id, creado_en desc);
create index on reportes (organizacion_id, unidad_vecinal, creado_en desc);
create index on reportes using gist (ubicacion);

create table reporte_complementos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones (id),
  reporte_id uuid not null references reportes (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) default auth.uid(),
  texto text not null default '' check (length(texto) <= 4000),
  creado_en timestamptz not null default now()
);
create index on reporte_complementos (reporte_id, creado_en);

-- Unidad vecinal y barrio se calculan en la base desde el punto (no se confía en el cliente).
create or replace function asignar_uv_y_barrio() returns trigger
language plpgsql as $$
begin
  if new.ubicacion is null then
    new.unidad_vecinal := null;
    new.barrio := null;
    return new;
  end if;
  select uv.numero, uv.barrio into new.unidad_vecinal, new.barrio
  from unidades_vecinales uv
  where uv.organizacion_id = new.organizacion_id and st_contains(uv.geom, new.ubicacion::geometry)
  limit 1;
  return new;
end $$;
create trigger reportes_uv before insert or update of ubicacion on reportes
for each row execute function asignar_uv_y_barrio();

-- Un complemento vuelve a marcar el reporte como no leído para la Central.
create or replace function complemento_marca_no_leido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update reportes set leido_por_central_en = null, leido_por = null where id = new.reporte_id;
  return new;
end $$;
create trigger reporte_complementos_no_leido after insert on reporte_complementos
for each row execute function complemento_marca_no_leido();

-- La Central marca como leído sin poder cambiar nada más del reporte.
create or replace function marcar_reporte_leido(p_reporte uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() not in ('administrador', 'jefatura', 'supervisor', 'operador') then
    raise exception 'Sin permiso para marcar reportes';
  end if;
  update reportes set leido_por_central_en = now(), leido_por = auth.uid()
  where id = p_reporte and organizacion_id = mi_organizacion() and leido_por_central_en is null;
end $$;
revoke all on function marcar_reporte_leido(uuid) from public;
grant execute on function marcar_reporte_leido(uuid) to authenticated;

-- ---------- Fotos y videos ----------
-- Los archivos van al bucket privado «evidencias»; esta tabla guarda a qué pertenecen.
alter table evidencias
  add column reporte_id uuid references reportes (id),
  add column complemento_id uuid references reporte_complementos (id),
  add column checklist_item text,
  add column descripcion text,
  add column nombre_original text,
  add column bytes bigint check (bytes is null or bytes <= 80 * 1024 * 1024),
  add constraint evidencias_tipo check (tipo in ('imagen', 'video')),
  add constraint evidencias_a_algo check (num_nonnulls(procedimiento_id, turno_id, reporte_id, complemento_id) >= 1);
create index on evidencias (reporte_id);
create index on evidencias (turno_id);

-- ---------- Seguridad (RLS) ----------
alter table reportes enable row level security;
alter table reporte_complementos enable row level security;

create policy "reportes: el patrullero ve los suyos; la Central y análisis, todos" on reportes for select to authenticated using (
  organizacion_id = mi_organizacion()
  and (usuario_id = auth.uid() or mi_rol() in ('administrador', 'jefatura', 'supervisor', 'operador', 'analista'))
);
create policy "reportes: cada uno envía los suyos" on reportes for insert to authenticated
  with check (organizacion_id = mi_organizacion() and usuario_id = auth.uid() and leido_por_central_en is null);
-- Sin políticas de update/delete: un reporte enviado no se edita ni se borra; se complementa.

create policy "complementos: lectura como el reporte" on reporte_complementos for select to authenticated using (
  organizacion_id = mi_organizacion()
  and exists (select 1 from reportes r where r.id = reporte_id and (r.usuario_id = auth.uid() or mi_rol() in ('administrador', 'jefatura', 'supervisor', 'operador', 'analista')))
);
create policy "complementos: solo el autor del reporte" on reporte_complementos for insert to authenticated with check (
  organizacion_id = mi_organizacion() and usuario_id = auth.uid()
  and exists (select 1 from reportes r where r.id = reporte_id and r.usuario_id = auth.uid())
);

-- El patrullero también ve la evidencia que él mismo subió.
create policy "evidencias: autor" on evidencias for select to authenticated
  using (organizacion_id = mi_organizacion() and subida_por = auth.uid());

-- Almacenamiento: bucket privado, ruta «<organización>/<usuario>/<archivo>», enlaces firmados que caducan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 83886080, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy "evidencias: subir a mi carpeta" on storage.objects for insert to authenticated with check (
  bucket_id = 'evidencias'
  and (storage.foldername(name))[1] = mi_organizacion()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);
create policy "evidencias: ver propias o como Central" on storage.objects for select to authenticated using (
  bucket_id = 'evidencias'
  and (storage.foldername(name))[1] = mi_organizacion()::text
  and ((storage.foldername(name))[2] = auth.uid()::text or mi_rol() in ('administrador', 'jefatura', 'supervisor', 'operador'))
);

-- ---------- Auditoría ----------
create trigger auditar_reportes after insert or update or delete on reportes for each row execute function auditar();
create trigger auditar_turnos after insert or update or delete on turnos for each row execute function auditar();

-- ---------- Vista para análisis y Power BI (sin nombres ni observaciones) ----------
create view v_reportes_analisis with (security_barrier) as
select r.id, r.organizacion_id, r.folio, r.tipo, r.halcon, r.unidad, r.unidad_vecinal, r.barrio,
       r.procedimiento_id, r.creado_en,
       (select count(*) from evidencias e where e.reporte_id = r.id) as adjuntos
from reportes r
where r.organizacion_id = mi_organizacion() and mi_rol() in ('administrador', 'jefatura', 'supervisor', 'analista');

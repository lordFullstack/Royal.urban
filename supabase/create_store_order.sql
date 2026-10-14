-- ============================================================
-- ROYAL URBAN — registrar pedidos de la tienda en una sola llamada
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- Por qué: la tienda creaba el pedido con dos INSERT desde el navegador y las reglas
-- de seguridad (RLS) de "orders" rechazaban algunos ("new row violates row-level security
-- policy"). Esta función hace todo en el servidor, de forma atómica (o se registra completo
-- o no se registra nada), y toma el precio real de cada producto de la base de datos.
-- ============================================================

-- líneas del pedido con el precio vigente del producto (si la variante existe) y cantidad 1..99
create or replace function public.ru_order_lines(p_items jsonb)
returns table (variant_id uuid, product_name text, color_name text, size_name text, qty int, unit_price numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    nullif(i->>'variant_id', '')::uuid,
    left(coalesce(i->>'product_name', ''), 200),
    left(coalesce(i->>'color_name', ''), 80),
    left(coalesce(i->>'size_name', ''), 40),
    least(greatest(coalesce((i->>'qty')::int, 1), 1), 99),
    coalesce(
      (select p.price from public.product_variants v join public.products p on p.id = v.product_id
        where v.id = nullif(i->>'variant_id', '')::uuid),
      (i->>'unit_price')::numeric
    )
  from jsonb_array_elements(p_items) i;
$$;

create or replace function public.create_store_order(
  p_items jsonb,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns table (id text, order_number text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_total numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'El pedido tiene demasiados productos';
  end if;

  select coalesce(sum(l.qty * l.unit_price), 0) into v_total from public.ru_order_lines(p_items) l;

  insert into public.orders (customer_name, customer_phone, total, status)
  values (p_customer_name, p_customer_phone, v_total, 'Nuevo')
  returning * into v_order;

  insert into public.order_items (order_id, variant_id, product_name, color_name, size_name, qty, unit_price)
  select v_order.id, l.variant_id, l.product_name, l.color_name, l.size_name, l.qty, l.unit_price
  from public.ru_order_lines(p_items) l;

  return query select v_order.id::text, v_order.order_number::text, v_order.total;
end;
$$;

-- guardar el texto del mensaje de WhatsApp en el pedido recién creado
create or replace function public.set_order_whatsapp_message(p_order_id text, p_message text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders set whatsapp_message = left(p_message, 4000)
  where id::text = p_order_id and status = 'Nuevo' and created_at > now() - interval '10 minutes';
$$;

revoke all on function public.ru_order_lines(jsonb) from public, anon, authenticated;
revoke all on function public.create_store_order(jsonb, text, text) from public;
revoke all on function public.set_order_whatsapp_message(text, text) from public;
grant execute on function public.create_store_order(jsonb, text, text) to anon, authenticated;
grant execute on function public.set_order_whatsapp_message(text, text) to anon, authenticated;

-- ============================================================
-- Cambiar el estado de un pedido desde el panel (cualquier rol del equipo).
-- Descuenta el stock UNA vez al entrar en Confirmado/Preparando/Enviado/Entregado
-- (lo que no haya queda por encargo) y lo devuelve al cancelar o volver a Nuevo/Contactado.
-- Corre en el servidor: no depende de los permisos de inventory_movements del rol.
-- ============================================================
create or replace function public.set_order_status(p_order_id uuid, p_status order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  committed order_status[] := array['Confirmado', 'Preparando', 'Enviado', 'Entregado']::order_status[];
  v_prev order_status;
  v_taken boolean;
  r record;
  v_stock int;
  v_qty int;
  v_reason text := 'Pedido #' || p_order_id;
begin
  if get_my_role() is null then
    raise exception 'No tienes permiso para gestionar pedidos';
  end if;

  select status into v_prev from orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado';
  end if;

  -- ¿tiene unidades descontadas ahora mismo? (salidas menos devoluciones)
  select coalesce(bool_or(q > 0), false) into v_taken from (
    select sum(case when type = 'salida' then qty else -qty end) as q
    from inventory_movements
    where reason in (v_reason, v_reason || ' (devuelto)')
    group by variant_id
  ) s;

  if not (p_status = any(committed)) and v_taken then
    for r in
      select variant_id, sum(case when type = 'salida' then qty else -qty end) as q
      from inventory_movements
      where reason in (v_reason, v_reason || ' (devuelto)')
      group by variant_id
    loop
      if r.q > 0 then
        insert into inventory_movements (variant_id, type, qty, reason, user_id)
        values (r.variant_id, 'entrada', r.q, v_reason || ' (devuelto)', auth.uid());
      end if;
    end loop;
  elsif p_status = any(committed) and not v_taken and not (v_prev = any(committed)) then
    for r in
      select variant_id, sum(qty) as q from order_items
      where order_id = p_order_id and variant_id is not null
      group by variant_id
    loop
      select stock into v_stock from product_variants where id = r.variant_id;
      v_qty := least(r.q, coalesce(v_stock, 0));
      if v_qty > 0 then
        insert into inventory_movements (variant_id, type, qty, reason, user_id)
        values (r.variant_id, 'salida', v_qty, v_reason, auth.uid());
      end if;
    end loop;
  end if;

  update orders set status = p_status, updated_at = now() where id = p_order_id;
end;
$$;

revoke all on function public.set_order_status(uuid, order_status) from public, anon;
grant execute on function public.set_order_status(uuid, order_status) to authenticated;

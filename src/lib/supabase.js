// ============================================================
// YEI-SI ROYALE URBAN — Fase 5: integración WhatsApp end-to-end
// Conecta: carrito (Fase 2) -> pedido real en Supabase (Fase 4)
//          -> mensaje WhatsApp -> confirmación admin (Fase 3)
//          -> descuento de stock vía kardex
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ------------------------------------------------------------
// 1. CATÁLOGO PÚBLICO (reemplaza los mocks PRODUCTS/PROMOS
//    del artifact de Fase 2)
// ------------------------------------------------------------
export async function fetchPublicProducts() {
  const { data, error } = await supabase
    .from("public_products")
    .select("*, product_variants(id, color_id, size_id)");
  if (error) throw error;
  return data;
}

export async function fetchVariantStatus(productId) {
  // Usa la vista pública: nunca expone el número de stock, solo el estado
  const { data, error } = await supabase
    .from("public_product_variants")
    .select("*")
    .eq("product_id", productId);
  if (error) throw error;
  return data; // [{ id, color_name, size_name, status }]
}

export async function fetchActivePromotions() {
  const { data, error } = await supabase.from("promotions").select("*").order("position");
  if (error) throw error;
  return data;
}

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((s) => [s.key, s.value]));
}

// ------------------------------------------------------------
// 2. CREAR PEDIDO (se ejecuta al pulsar "Comprar por WhatsApp"
//    en el carrito — ANTES de abrir WhatsApp). Esto es lo que
//    hace que el pedido quede registrado internamente, tal como
//    pide el punto 18 del brief.
//    NOTA: no descuenta stock todavía — eso ocurre al confirmar
//    (ver sección 4), para no bloquear stock por pedidos que
//    nunca se concretan por WhatsApp.
// ------------------------------------------------------------
export async function createOrderFromCart(cart, customer = {}) {
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_name: customer.name ?? null,
      customer_phone: customer.phone ?? null,
      total,
      status: "Nuevo",
    })
    .select()
    .single();
  if (orderErr) throw orderErr;

  const items = cart.map((c) => ({
    order_id: order.id,
    variant_id: c.variantId, // id real de product_variants
    product_name: c.name,
    color_name: c.color,
    size_name: c.size,
    qty: c.qty,
    unit_price: c.price,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) throw itemsErr;

  const message = buildWhatsappMessage(order, cart);

  const { error: msgErr } = await supabase
    .from("orders")
    .update({ whatsapp_message: message })
    .eq("id", order.id);
  if (msgErr) throw msgErr;

  return { order, message };
}

// ------------------------------------------------------------
// 3. MENSAJE DE WHATSAPP — incluye el número de pedido real,
//    así el admin puede buscarlo directo en el panel al recibir
//    el chat.
// ------------------------------------------------------------
export function buildWhatsappMessage(order, cart) {
  let msg = `Hola, quiero realizar el pedido *#${order.order_number}* en *YEI-SI ROYALE URBAN*.\n\nProductos:\n\n`;
  cart.forEach((c) => {
    msg += `• ${c.name}\n  Talla: ${c.size} | Color: ${c.color}\n  Cantidad: ${c.qty}\n  Precio: $${c.price.toLocaleString("es-CO")}\n\n`;
  });
  msg += `Total: $${order.total.toLocaleString("es-CO")}\n\nQuedo atento.`;
  return msg;
}

export async function openWhatsappCheckout(cart, customer = {}) {
  const { number } = (await fetchSettings()).whatsapp;
  const { order, message } = await createOrderFromCart(cart, customer);
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
  return order;
}

// ------------------------------------------------------------
// 4. CONFIRMAR PEDIDO (desde el panel admin, Fase 3, al cambiar
//    el estado a 'Confirmado'). AQUÍ SÍ se descuenta stock real:
//    se genera un movimiento 'salida' por cada order_item.
//    El trigger de la Fase 4 aplica el descuento y bloquea si ya
//    no hay disponibilidad (por ejemplo, si dos clientes pidieron
//    la última unidad casi al mismo tiempo por WhatsApp).
// ------------------------------------------------------------
export async function confirmOrderAndDiscountStock(orderId) {
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (itemsErr) throw itemsErr;

  const movements = items
    .filter((i) => i.variant_id) // ignora ítems sin variante asociada (legacy/manual)
    .map((i) => ({
      variant_id: i.variant_id,
      type: "salida",
      qty: i.qty,
      reason: `Pedido #${orderId}`,
    }));

  // Insert secuencial: si un ítem falla por falta de stock, se detiene
  // y el admin ve exactamente cuál variante quedó sin disponibilidad.
  for (const m of movements) {
    const { error } = await supabase.from("inventory_movements").insert(m);
    if (error) {
      throw new Error(`No se pudo confirmar el pedido: ${error.message}`);
    }
  }

  const { error: statusErr } = await supabase
    .from("orders")
    .update({ status: "Confirmado", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (statusErr) throw statusErr;
}

// ------------------------------------------------------------
// 5. Puntos de reemplazo en los artifacts existentes
// ------------------------------------------------------------
// Fase 2 (yeisi-royale-urban.jsx):
//   - PRODUCTS/PROMOS mock  -> fetchPublicProducts() / fetchActivePromotions()
//   - stockStatus(qty,min)  -> usar directamente el campo `status` de fetchVariantStatus()
//   - whatsappCheckout()    -> openWhatsappCheckout(cart, customer)
//
// Fase 3 (yeisi-royale-urban-admin.jsx):
//   - INITIAL_ORDERS mock        -> supabase.from('orders').select('*, order_items(*)')
//   - updateStatus(id,'Confirmado') -> confirmOrderAndDiscountStock(id) en vez de un simple update
//   - INITIAL_MOVEMENTS mock     -> supabase.from('inventory_movements').select('*').order('created_at',{ascending:false})
//   - LoginScreen                -> supabase.auth.signInWithPassword({ email, password })

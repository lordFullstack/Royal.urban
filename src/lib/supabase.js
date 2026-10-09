// ============================================================
// ROYAL URBAN — capa de datos Supabase
// Usada por StoreApp.jsx (público) y AdminApp.jsx (privado)
// ============================================================

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const STATUS_LABEL = {
  disponible: { label: "DISPONIBLE", cls: "text-[#cda45e] border-[#cda45e]/40" },
  ultimas_unidades: { label: "ÚLTIMAS UNIDADES", cls: "text-[#ff2340] border-[#ff2340]/50" },
  por_encargo: { label: "DISPONIBLE POR ENCARGO", cls: "text-white/70 border-white/25" },
  agotado: { label: "AGOTADO", cls: "text-white/40 border-white/15" },
};
export function statusVisual(status) {
  return STATUS_LABEL[status] || STATUS_LABEL.agotado;
}

// ------------------------------------------------------------
// STORAGE — subida de imágenes (portada, productos, campañas)
// ------------------------------------------------------------
export async function uploadImage(file, folder = "misc") {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: false, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("assets").getPublicUrl(path);
  return data.publicUrl;
}

// ------------------------------------------------------------
// CATÁLOGO PÚBLICO
// ------------------------------------------------------------
export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("visible", true)
    .order("position");
  if (error) throw error;
  return data;
}

// Trae productos + variantes agrupadas (color/talla/estado), listo para
// render directo — sin exponer nunca el número de stock.
export async function fetchCatalog() {
  const [{ data: products, error: pErr }, { data: variants, error: vErr }] = await Promise.all([
    supabase.from("public_products").select("*"),
    supabase.from("public_product_variants").select("*"),
  ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;

  return products.map((p) => {
    const productVariants = variants.filter((v) => v.product_id === p.id);
    const colors = [...new Set(productVariants.map((v) => v.color_name))];
    const sizes = [...new Set(productVariants.map((v) => v.size_name))];
    const statusByVariant = {};
    productVariants.forEach((v) => {
      statusByVariant[`${v.color_name}-${v.size_name}`] = { id: v.id, status: v.status };
    });
    const overallStatus = productVariants.some((v) => v.status === "disponible")
      ? "disponible"
      : productVariants.length ? "por_encargo" : "agotado";
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      oldPrice: p.old_price ? Number(p.old_price) : null,
      category: p.category_name,
      img: p.image_url,
      images: [p.image_url, ...(p.gallery || [])].filter(Boolean),
      inCollection: p.in_collection,
      featured: p.featured,
      isNew: p.is_new,
      onPromotion: p.on_promotion,
      colors,
      sizes,
      statusByVariant,
      overallStatus,
    };
  });
}

export async function fetchActivePromotions() {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", true)
    .order("position");
  if (error) throw error;
  return data;
}

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((s) => [s.key, s.value]));
}

// ------------------------------------------------------------
// CHECKOUT — crea el pedido real ANTES de abrir WhatsApp,
// sin descontar stock todavía (eso pasa al confirmar en admin).
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
    variant_id: c.variantId ?? null,
    product_name: c.name,
    color_name: c.color,
    size_name: c.size,
    qty: c.qty,
    unit_price: c.price,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) throw itemsErr;

  const message = buildWhatsappMessage(order, cart);
  await supabase.from("orders").update({ whatsapp_message: message }).eq("id", order.id);

  return { order, message };
}

export function buildWhatsappMessage(order, cart) {
  let msg = `Hola, quiero realizar el pedido *#${order.order_number}* en *ROYAL URBAN*.\n\nProductos:\n\n`;
  cart.forEach((c) => {
    msg += `• ${c.name}\n  Talla: ${c.size} | Color: ${c.color}\n  Cantidad: ${c.qty}${c.onRequest ? "\n  *Por encargo*" : ""}\n  Precio: $${c.price.toLocaleString("es-CO")}\n\n`;
  });
  msg += `Total: $${order.total.toLocaleString("es-CO")}\n\nQuedo atento.`;
  return msg;
}

export async function openWhatsappCheckout(cart, customer = {}, { targetWindow } = {}) {
  const settings = await fetchSettings();
  const number = settings.whatsapp?.number || "573000000000";
  const { order, message } = await createOrderFromCart(cart, customer);
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  // Si ya se abrió una ventana en blanco de forma síncrona (dentro del gesto de clic),
  // solo redirigimos esa ventana. Así evitamos que el navegador bloquee el pop-up
  // por abrirse después de un await.
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    window.open(url, "_blank");
  }
  return order;
}

// ------------------------------------------------------------
// ADMIN — auth
// ------------------------------------------------------------
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile, error: pErr } = await supabase
    .from("user_profiles")
    .select("*, roles(label)")
    .eq("id", data.user.id)
    .single();
  if (pErr) throw pErr;
  return { user: data.user, profile };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*, roles(label)")
    .eq("id", data.session.user.id)
    .single();
  return profile ? { user: data.session.user, profile } : null;
}

// ------------------------------------------------------------
// ADMIN — datos
// ------------------------------------------------------------
export async function fetchAdminProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleProductActive(id, active) {
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function toggleProductCollection(id, inCollection) {
  const { error } = await supabase.from("products").update({ in_collection: inCollection }).eq("id", id);
  if (error) throw error;
}

export async function fetchColors() {
  const { data, error } = await supabase.from("colors").select("*").order("name");
  if (error) throw error;
  return data;
}

// Crea un color manual (o devuelve el existente si ya hay uno con ese nombre).
export async function createColor(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  const { data: existing, error: sErr } = await supabase.from("colors").select("*").ilike("name", clean).limit(1);
  if (sErr) throw sErr;
  if (existing?.length) return existing[0];
  const { data, error } = await supabase.from("colors").insert({ name: clean }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchSizes() {
  const { data, error } = await supabase.from("sizes").select("*").order("position");
  if (error) throw error;
  return data;
}

function slugifyProduct(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Crea el producto y, si se seleccionaron colores/tallas, genera automáticamente
// la matriz de variantes (con stock en 0 — el stock real se carga después desde
// Movimientos, tal como pide la regla de negocio: todo cambio de stock pasa por el kardex).
export async function createProductWithVariants({
  name, description, categoryId, price, oldPrice, skuBase, featured, isNew, inCollection, imageUrl,
  colorIds = [], sizeIds = [], minStock = 0, stockByKey = {}, gallery = [],
}) {
  const slug = slugifyProduct(name);
  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      name, slug, description: description || null,
      category_id: categoryId || null,
      price, old_price: oldPrice || null,
      sku_base: skuBase || null,
      featured: !!featured, is_new: !!isNew, in_collection: !!inCollection,
      image_url: imageUrl || null,
      gallery,
      active: true,
    })
    .select()
    .single();
  if (pErr) throw pErr;

  if (colorIds.length && sizeIds.length) {
    const variants = [];
    for (const colorId of colorIds) {
      for (const sizeId of sizeIds) {
        variants.push({ product_id: product.id, color_id: colorId, size_id: sizeId, min_stock: minStock, stock: 0 });
      }
    }
    const { data: created, error: vErr } = await supabase.from("product_variants").insert(variants).select("id, color_id, size_id");
    if (vErr) throw vErr;
    await registerInitialStock(created, stockByKey, "Stock inicial");
  }

  return product;
}

// Todo cambio de stock pasa por el kardex (inventory_movements): el trigger actualiza product_variants.
async function registerInitialStock(variants, stockByKey, reason) {
  for (const v of variants) {
    const qty = Math.max(0, Math.floor(Number(stockByKey[`${v.color_id}|${v.size_id}`]) || 0));
    if (qty > 0) await registerMovement({ variantId: v.id, type: "entrada", qty, reason });
  }
}

export async function fetchProductVariantKeys(productId) {
  const { data, error } = await supabase.from("product_variants").select("id, color_id, size_id, stock").eq("product_id", productId);
  if (error) throw error;
  return data;
}

// Edita un producto ya publicado. Solo AGREGA variantes nuevas (color/talla):
// las existentes se conservan para no perder su stock ni su historial de movimientos/pedidos.
export async function updateProductWithVariants(id, {
  name, description, categoryId, price, oldPrice, skuBase, featured, isNew, inCollection, imageUrl,
  colorIds = [], sizeIds = [], stockByKey = {}, gallery = [],
}) {
  const { error: pErr } = await supabase
    .from("products")
    .update({
      name, description: description || null,
      category_id: categoryId || null,
      price, old_price: oldPrice || null,
      sku_base: skuBase || null,
      featured: !!featured, is_new: !!isNew, in_collection: !!inCollection,
      image_url: imageUrl || null,
      gallery,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (pErr) throw pErr;

  const current = await fetchProductVariantKeys(id);
  const existing = new Set(current.map((v) => `${v.color_id}|${v.size_id}`));

  // Variantes existentes: si cambió la cantidad, se registra un ajuste por la diferencia.
  for (const v of current) {
    const key = `${v.color_id}|${v.size_id}`;
    if (!(key in stockByKey) || stockByKey[key] === "") continue;
    const target = Math.max(0, Math.floor(Number(stockByKey[key]) || 0));
    if (target !== v.stock) {
      await registerMovement({ variantId: v.id, type: "ajuste", qty: target - v.stock, reason: "Edición de producto" });
    }
  }

  const variants = [];
  for (const colorId of colorIds) {
    for (const sizeId of sizeIds) {
      if (!existing.has(`${colorId}|${sizeId}`)) {
        variants.push({ product_id: id, color_id: colorId, size_id: sizeId, min_stock: 0, stock: 0 });
      }
    }
  }
  if (variants.length) {
    const { data: created, error: vErr } = await supabase.from("product_variants").insert(variants).select("id, color_id, size_id");
    if (vErr) throw vErr;
    await registerInitialStock(created, stockByKey, "Stock inicial");
  }
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAdminCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("position");
  if (error) throw error;
  return data;
}

export async function toggleCategoryVisible(id, visible) {
  const { error } = await supabase.from("categories").update({ visible }).eq("id", id);
  if (error) throw error;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCategory(name) {
  const slug = slugify(name);
  const { data: maxRow } = await supabase.from("categories").select("position").order("position", { ascending: false }).limit(1).single();
  const nextPosition = (maxRow?.position ?? 0) + 1;
  const { error } = await supabase.from("categories").insert({ name, slug, position: nextPosition });
  if (error) throw error;
}

export async function updateCategoryName(id, name) {
  const { error } = await supabase.from("categories").update({ name, slug: slugify(name) }).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// PROMOCIONES / MURO SOCIAL (tarjetas de campaña)
// ------------------------------------------------------------
export async function fetchAdminPromotions() {
  const { data, error } = await supabase.from("promotions").select("*").order("position");
  if (error) throw error;
  return data;
}

export async function createPromotion({ title, description, image_url, cta_label, cta_category_id, cta_product_id }) {
  const { data: maxRow } = await supabase.from("promotions").select("position").order("position", { ascending: false }).limit(1).single();
  const nextPosition = (maxRow?.position ?? 0) + 1;
  const { error } = await supabase
    .from("promotions")
    .insert({
      title, description, image_url, cta_label,
      cta_category_id: cta_category_id || null,
      cta_product_id: cta_product_id || null,
      active: true, position: nextPosition,
    });
  if (error) throw error;
}

export async function updatePromotion(id, { title, description, image_url, cta_label, cta_category_id, cta_product_id }) {
  const { error } = await supabase
    .from("promotions")
    .update({
      title, description, image_url, cta_label,
      cta_category_id: cta_category_id || null,
      cta_product_id: cta_product_id || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function togglePromotionActive(id, active) {
  const { error } = await supabase.from("promotions").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deletePromotion(id) {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchInventory() {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, stock, min_stock, sku, products(name), colors(name), sizes(name)")
    .order("stock");
  if (error) throw error;
  return data;
}

export async function fetchMovements(limit = 50) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, product_variants(sku, products(name), colors(name), sizes(name))")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function registerMovement({ variantId, type, qty, reason }) {
  const { error } = await supabase
    .from("inventory_movements")
    .insert({ variant_id: variantId, type, qty, reason });
  if (error) throw error;
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Confirmar pedido: genera movimientos 'salida' por cada ítem (el trigger
// descuenta stock real y bloquea si ya no hay disponibilidad) y solo
// entonces marca el pedido como Confirmado.
export async function updateOrderStatus(orderId, status, orderItems = []) {
  if (status === "Confirmado") {
    for (const item of orderItems) {
      if (!item.variant_id) continue;
      // Lo que no está en stock queda "por encargo": solo se descuenta lo disponible.
      const { data: v } = await supabase.from("product_variants").select("stock").eq("id", item.variant_id).single();
      const qty = Math.min(item.qty, v?.stock ?? 0);
      if (qty <= 0) continue;
      const { error } = await supabase
        .from("inventory_movements")
        .insert({ variant_id: item.variant_id, type: "salida", qty, reason: `Pedido #${orderId}` });
      if (error) throw new Error(`No se pudo confirmar: ${error.message}`);
    }
  }
  const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
  if (error) throw error;
}

export async function updateSettings(key, value) {
  const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

import React, { useState, useMemo, useRef } from "react";
import { Search, ShoppingBag, X, Plus, Minus, Home, Grid3x3, MessageCircle, ChevronLeft, Flame } from "lucide-react";

/* ---------------------------------------------------------
   YEI-SI ROYALE URBAN — Catálogo público
   Token system:
   - bg base   #050505 / cards #0d0d0d
   - gold      #cda45e  (títulos premium, precios)
   - neon red  #ff2340  (glow, estados activos)
   - white     #f2f2f0
   - muted     #7a7a7a
   Display type: Oswald (condensada, actitud) / Body: Inter
   Signature: el "glow" rojo de streetlight — nace del logo y se
   propaga por los bordes activos, nunca es color de fondo.
--------------------------------------------------------- */

const WHATSAPP_NUMBER = "573000000000"; // configurable en admin

const CATEGORIES = ["Nuevos", "Camisetas", "Hoodies", "Chaquetas", "Gorras", "Ofertas"];

const PRODUCTS = [
  {
    id: "p1",
    name: "Camiseta Royale",
    category: "Camisetas",
    price: 89900,
    oldPrice: null,
    tag: "NUEVO",
    img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
    colors: ["Negro", "Blanco", "Gris"],
    sizes: ["S", "M", "L", "XL"],
    stockByVariant: { "Negro-S": 3, "Negro-M": 7, "Negro-L": 0, "Negro-XL": 5, "Blanco-S": 2, "Blanco-M": 1, "Blanco-L": 4, "Blanco-XL": 0, "Gris-S": 6, "Gris-M": 6, "Gris-L": 6, "Gris-XL": 6 },
    minStock: 3,
    desc: "Algodón peinado 220gsm, corte oversized, etiqueta bordada dorada. Pieza base de la colección Royale.",
  },
  {
    id: "p2",
    name: "Hoodie Blackout",
    category: "Hoodies",
    price: 179900,
    oldPrice: 219900,
    tag: "OFERTA",
    img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80",
    colors: ["Negro", "Gris"],
    sizes: ["M", "L", "XL", "XXL"],
    stockByVariant: { "Negro-M": 2, "Negro-L": 4, "Negro-XL": 1, "Negro-XXL": 0, "Gris-M": 5, "Gris-L": 5, "Gris-XL": 5, "Gris-XXL": 5 },
    minStock: 3,
    desc: "Hoodie pesado 400gsm, capucha forrada, bolsillo canguro reforzado. Silueta streetwear premium.",
  },
  {
    id: "p3",
    name: "Chaqueta Night Rider",
    category: "Chaquetas",
    price: 349900,
    oldPrice: null,
    tag: "DESTACADO",
    img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
    colors: ["Negro"],
    sizes: ["M", "L", "XL"],
    stockByVariant: { "Negro-M": 1, "Negro-L": 2, "Negro-XL": 0 },
    minStock: 2,
    desc: "Chaqueta técnica con detalles reflectivos rojo neón. Edición limitada, forro térmico.",
  },
  {
    id: "p4",
    name: "Gorra Crest Gold",
    category: "Gorras",
    price: 69900,
    oldPrice: null,
    tag: null,
    img: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80",
    colors: ["Negro", "Blanco"],
    sizes: ["Única"],
    stockByVariant: { "Negro-Única": 12, "Blanco-Única": 0 },
    minStock: 4,
    desc: "Gorra six-panel, bordado dorado en relieve, visera curva. Ajuste snapback.",
  },
];

const PROMOS = [
  { id: "b1", title: "COLECCIÓN NOCTURNA", desc: "Nueva caída disponible esta semana", cta: "Ver colección" },
  { id: "b2", title: "-20% HOODIES", desc: "Solo por tiempo limitado", cta: "Ver ofertas" },
];

function money(n) {
  return "$" + n.toLocaleString("es-CO");
}

function stockStatus(qty, minStock) {
  if (qty <= 0) return { label: "AGOTADO", cls: "text-white/40 border-white/15" };
  if (qty <= minStock) return { label: "ÚLTIMAS UNIDADES", cls: "text-[#ff2340] border-[#ff2340]/50" };
  return { label: "DISPONIBLE", cls: "text-[#cda45e] border-[#cda45e]/40" };
}

function totalStock(product) {
  return Object.values(product.stockByVariant).reduce((a, b) => a + b, 0);
}

export default function StoreApp() {
  const [view, setView] = useState("home"); // home | product | cart
  const [activeCategory, setActiveCategory] = useState("Nuevos");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showAdminHint, setShowAdminHint] = useState(false);
  const tapTimer = useRef(null);

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (activeCategory !== "Nuevos") list = list.filter((p) => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, query]);

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const cartTotal = cart.reduce((a, c) => a + c.qty * c.price, 0);

  function openProduct(p) {
    setSelectedProduct(p);
    setView("product");
  }

  function addToCart(product, color, size, qty) {
    const key = `${product.id}-${color}-${size}`;
    const maxStock = product.stockByVariant[`${color}-${size}`] ?? 0;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, qty: Math.min(maxStock, c.qty + qty) } : c));
      }
      return [...prev, { key, id: product.id, name: product.name, color, size, qty: Math.min(maxStock, qty), price: product.price, img: product.img, maxStock }];
    });
    setView("home");
  }

  function updateQty(key, delta) {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, qty: Math.max(0, Math.min(c.maxStock ?? Infinity, c.qty + delta)) } : c))
        .filter((c) => c.qty > 0)
    );
  }

  function removeItem(key) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  function handleLogoTap() {
    clearTimeout(tapTimer.current);
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) {
      setShowAdminHint(true);
      setLogoTaps(0);
    } else {
      tapTimer.current = setTimeout(() => setLogoTaps(0), 1200);
    }
  }

  function whatsappCheckout() {
    if (cart.length === 0) return;
    let msg = "Hola, quiero realizar un pedido en *YEI-SI ROYALE URBAN*.\n\nProductos:\n\n";
    cart.forEach((c) => {
      msg += `• ${c.name}\n  Talla: ${c.size} | Color: ${c.color}\n  Cantidad: ${c.qty}\n  Precio: ${money(c.price)}\n\n`;
    });
    msg += `Total: ${money(cartTotal)}\n\nQuedo atento.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f2f2f0]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
        .glow-red { box-shadow: 0 0 0 1px rgba(255,35,64,0.35), 0 0 18px rgba(255,35,64,0.15); }
        .glow-red-strong { box-shadow: 0 0 0 1px rgba(255,35,64,0.6), 0 0 28px rgba(255,35,64,0.35); }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handleLogoTap} className="flex flex-col leading-none active:scale-95 transition-transform">
            <span className="font-display text-lg font-bold tracking-wider">
              YEI<span className="text-[#ff2340]">-</span>SI
            </span>
            <span className="text-[8px] tracking-[0.35em] text-[#cda45e]">ROYALE URBAN</span>
          </button>
          <div className="flex items-center gap-3">
            <button className="p-2 text-white/70" onClick={() => setView("search")}>
              <Search size={20} />
            </button>
            <button className="relative p-2 text-white/70" onClick={() => setView("cart")}>
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ff2340] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {showAdminHint && (
        <div className="mx-4 mt-3 p-3 border border-[#cda45e]/40 rounded-lg text-xs text-[#cda45e] flex items-center justify-between">
          <span>Acceso privado detectado — módulo /admin no incluido en esta vista pública.</span>
          <button onClick={() => setShowAdminHint(false)} className="ml-2 text-white/50"><X size={14} /></button>
        </div>
      )}

      {/* HOME VIEW */}
      {view === "home" && (
        <main className="pb-24">
          {/* HERO */}
          <section className="relative mx-4 mt-4 rounded-2xl overflow-hidden h-72 border border-white/5">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80"
              alt="YEI-SI ROYALE URBAN"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchpriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
            <div className="absolute bottom-0 p-5">
              <p className="font-display text-3xl font-bold leading-tight">
                VISTE TU<br /><span className="text-[#cda45e]">MEJOR VERSIÓN</span>
              </p>
              <div className="flex gap-2 mt-4">
                <button className="px-4 py-2 rounded-full bg-[#f2f2f0] text-black text-xs font-semibold">
                  VER COLECCIÓN
                </button>
                <button
                  onClick={whatsappCheckout}
                  className="px-4 py-2 rounded-full border border-[#ff2340] text-[#ff2340] text-xs font-semibold glow-red flex items-center gap-1"
                >
                  <MessageCircle size={13} /> WHATSAPP
                </button>
              </div>
            </div>
          </section>

          {/* PROMO FEED */}
          <section className="mt-5 px-4 flex gap-3 overflow-x-auto scrollbar-none">
            {PROMOS.map((p) => (
              <div key={p.id} className="min-w-[240px] bg-[#0d0d0d] border border-white/5 rounded-xl p-4 shrink-0">
                <div className="flex items-center gap-1 text-[#ff2340] text-[10px] font-semibold mb-1">
                  <Flame size={11} /> CAMPAÑA
                </div>
                <p className="font-display text-base font-semibold">{p.title}</p>
                <p className="text-xs text-white/50 mt-1">{p.desc}</p>
                <button className="text-xs text-[#cda45e] mt-2 underline underline-offset-2">{p.cta}</button>
              </div>
            ))}
          </section>

          {/* CATEGORIES */}
          <section className="mt-6 px-4 flex gap-2 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === c
                    ? "bg-[#f2f2f0] text-black border-[#f2f2f0]"
                    : "border-white/15 text-white/60"
                }`}
              >
                {c}
              </button>
            ))}
          </section>

          {/* PRODUCT GRID */}
          <section className="mt-5 px-4 grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const status = stockStatus(totalStock(p), p.minStock);
              return (
                <button
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className="text-left bg-[#0d0d0d] border border-[#ff2340]/10 rounded-xl overflow-hidden hover:border-[#ff2340]/40 hover:glow-red transition-all"
                >
                  <div className="relative aspect-[3/4]">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    {p.tag && (
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded bg-black/70 text-[#cda45e] border border-[#cda45e]/30">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-[#cda45e] font-display text-sm font-semibold">{money(p.price)}</span>
                      {p.oldPrice && <span className="text-[10px] text-white/30 line-through">{money(p.oldPrice)}</span>}
                    </div>
                    <span className={`inline-block mt-1.5 text-[9px] font-semibold border rounded px-1.5 py-0.5 ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-2 text-center text-white/40 text-sm py-10">No hay productos en esta categoría todavía.</p>
            )}
          </section>
        </main>
      )}

      {/* SEARCH VIEW */}
      {view === "search" && (
        <main className="px-4 pt-4 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setView("home")} className="p-1"><ChevronLeft size={20} /></button>
            <div className="flex-1 flex items-center gap-2 bg-[#0d0d0d] border border-white/10 rounded-full px-3 py-2">
              <Search size={16} className="text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos, categorías..."
                className="bg-transparent outline-none text-sm w-full placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => openProduct(p)} className="text-left bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
                <img src={p.img} className="w-full aspect-[3/4] object-cover" alt={p.name} loading="lazy" decoding="async" />
                <div className="p-2.5">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <span className="text-[#cda45e] font-display text-sm">{money(p.price)}</span>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* PRODUCT DETAIL */}
      {view === "product" && selectedProduct && (
        <ProductDetail product={selectedProduct} onBack={() => setView("home")} onAdd={addToCart} onWhatsapp={whatsappCheckout} />
      )}

      {/* CART VIEW */}
      {view === "cart" && (
        <main className="px-4 pt-4 pb-32">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setView("home")} className="p-1"><ChevronLeft size={20} /></button>
            <p className="font-display text-lg font-semibold">TU PEDIDO</p>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-white/40 text-sm py-16">Tu carrito está vacío.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((c) => (
                <div key={c.key} className="flex gap-3 bg-[#0d0d0d] border border-white/5 rounded-xl p-3">
                  <img src={c.img} className="w-16 h-20 object-cover rounded-lg" alt={c.name} loading="lazy" decoding="async" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">Talla {c.size} · {c.color}</p>
                    <p className="text-[#cda45e] text-sm font-display mt-1">{money(c.price)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-white/15 rounded-full">
                        <button onClick={() => updateQty(c.key, -1)} className="p-1.5"><Minus size={12} /></button>
                        <span className="text-xs w-5 text-center">{c.qty}</span>
                        <button
                          onClick={() => updateQty(c.key, 1)}
                          disabled={c.qty >= (c.maxStock ?? Infinity)}
                          className="p-1.5 disabled:opacity-30"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      {c.qty >= (c.maxStock ?? Infinity) && (
                        <span className="text-[9px] text-[#ff2340]">máx. disponible</span>
                      )}
                      <button onClick={() => removeItem(c.key)} className="text-[10px] text-white/40 underline">quitar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="fixed bottom-16 left-0 right-0 bg-[#050505] border-t border-white/10 px-4 py-3">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/60">Total</span>
                <span className="font-display text-lg font-semibold text-[#cda45e]">{money(cartTotal)}</span>
              </div>
              <button
                onClick={whatsappCheckout}
                className="w-full py-3 rounded-full bg-[#ff2340] text-white text-sm font-semibold flex items-center justify-center gap-2 glow-red-strong"
              >
                <MessageCircle size={16} /> COMPRAR POR WHATSAPP
              </button>
            </div>
          )}
        </main>
      )}

      {/* BOTTOM NAV */}
      {view !== "product" && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/10 flex items-center justify-around py-2.5 z-30">
          <NavBtn icon={<Home size={19} />} label="Inicio" active={view === "home"} onClick={() => setView("home")} />
          <NavBtn icon={<Grid3x3 size={19} />} label="Categorías" active={false} onClick={() => setView("home")} />
          <NavBtn icon={<Search size={19} />} label="Buscar" active={view === "search"} onClick={() => setView("search")} />
          <NavBtn icon={<ShoppingBag size={19} />} label="Carrito" active={view === "cart"} badge={cartCount} onClick={() => setView("cart")} />
        </nav>
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center gap-1 px-3 ${active ? "text-[#ff2340]" : "text-white/50"}`}>
      {icon}
      {badge > 0 && (
        <span className="absolute -top-1 right-1 bg-[#ff2340] text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
          {badge}
        </span>
      )}
      <span className="text-[9px] tracking-wide">{label}</span>
    </button>
  );
}

function ProductDetail({ product, onBack, onAdd, onWhatsapp }) {
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);

  const variantStock = product.stockByVariant[`${color}-${size}`] ?? 0;
  const status = stockStatus(variantStock, product.minStock);
  const isAvailable = variantStock > 0;

  return (
    <main className="pb-28">
      <div className="relative">
        <img src={product.img} className="w-full aspect-[3/4] object-cover" alt={product.name} loading="eager" fetchpriority="high" />
        <button onClick={onBack} className="absolute top-4 left-4 bg-black/60 p-2 rounded-full backdrop-blur">
          <ChevronLeft size={18} />
        </button>
        {product.tag && (
          <span className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded bg-black/70 text-[#cda45e] border border-[#cda45e]/30">
            {product.tag}
          </span>
        )}
      </div>

      <div className="px-4 pt-4">
        <p className="font-display text-2xl font-semibold">{product.name}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[#cda45e] font-display text-xl">{money(product.price)}</span>
          {product.oldPrice && <span className="text-sm text-white/30 line-through">{money(product.oldPrice)}</span>}
        </div>
        <span className={`inline-block mt-2 text-[10px] font-semibold border rounded px-2 py-0.5 ${status.cls}`}>
          {status.label}
        </span>

        <p className="text-sm text-white/50 mt-4 leading-relaxed">{product.desc}</p>

        <div className="mt-5">
          <p className="text-xs text-white/40 mb-2 tracking-wide">COLOR</p>
          <div className="flex gap-2 flex-wrap">
            {product.colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  color === c ? "border-[#ff2340] text-[#ff2340] glow-red" : "border-white/15 text-white/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-white/40 mb-2 tracking-wide">TALLA</p>
          <div className="flex gap-2 flex-wrap">
            {product.sizes.map((s) => {
              const stock = product.stockByVariant[`${color}-${s}`] ?? 0;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  disabled={stock <= 0}
                  className={`w-11 h-11 rounded-lg text-xs border flex items-center justify-center ${
                    stock <= 0
                      ? "border-white/5 text-white/20 line-through"
                      : size === s
                      ? "border-[#ff2340] text-[#ff2340] glow-red"
                      : "border-white/15 text-white/60"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {isAvailable && (
          <div className="mt-5 flex items-center gap-3">
            <p className="text-xs text-white/40 tracking-wide">CANTIDAD</p>
            <div className="flex items-center border border-white/15 rounded-full">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2"><Minus size={13} /></button>
              <span className="text-sm w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(variantStock, q + 1))} className="p-2"><Plus size={13} /></button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/10 px-4 py-3 flex gap-2">
        <button
          disabled={!isAvailable}
          onClick={() => onAdd(product, color, size, qty)}
          className={`flex-1 py-3 rounded-full text-sm font-semibold ${
            isAvailable ? "bg-[#f2f2f0] text-black" : "bg-white/10 text-white/30"
          }`}
        >
          {isAvailable ? "AGREGAR AL CARRITO" : "AGOTADO"}
        </button>
        <button
          onClick={onWhatsapp}
          className="w-12 h-12 rounded-full border border-[#ff2340] text-[#ff2340] flex items-center justify-center glow-red shrink-0"
        >
          <MessageCircle size={18} />
        </button>
      </div>
    </main>
  );
}

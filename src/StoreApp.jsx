import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, ShoppingBag, X, Plus, Minus, Home, Grid3x3, MessageCircle, ChevronLeft, Flame } from "lucide-react";
import { fetchCatalog, fetchCategories, fetchActivePromotions, fetchSettings, openWhatsappCheckout, statusVisual } from "./lib/supabase";

/* ---------------------------------------------------------
   ROYAL URBAN — Catálogo público (conectado a Supabase)
--------------------------------------------------------- */

function money(n) {
  return "$" + n.toLocaleString("es-CO");
}

export default function StoreApp() {
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promos, setPromos] = useState([]);
  const [settings, setSettings] = useState(null);

  const [activeCategory, setActiveCategory] = useState("Nuevos");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const tapTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchCatalog(), fetchCategories(), fetchActivePromotions(), fetchSettings()])
      .then(([p, c, pr, s]) => {
        if (!alive) return;
        setProducts(p);
        setCategories(c);
        setPromos(pr);
        setSettings(s);
      })
      .catch((e) => alive && setLoadError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const categoryNames = ["Nuevos", ...categories.map((c) => c.name)];

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "Nuevos") list = list.filter((p) => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, query]);

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const cartTotal = cart.reduce((a, c) => a + c.qty * c.price, 0);

  function openProduct(p) {
    setSelectedProduct(p);
    setView("product");
  }

  function addToCart(product, color, size, qty) {
    const variant = product.statusByVariant[`${color}-${size}`];
    const key = `${product.id}-${color}-${size}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c));
      }
      return [...prev, { key, variantId: variant?.id, id: product.id, name: product.name, color, size, qty, price: product.price, img: product.img }];
    });
    setView("home");
  }

  function updateQty(key, delta) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty: Math.max(0, c.qty + delta) } : c)).filter((c) => c.qty > 0));
  }
  function removeItem(key) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  function handleLogoTap() {
    clearTimeout(tapTimer.current);
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) {
      setPinValue("");
      setPinError("");
      setShowPinModal(true);
      setLogoTaps(0);
    } else {
      tapTimer.current = setTimeout(() => setLogoTaps(0), 1200);
    }
  }

  function submitAdminPin(e) {
    e.preventDefault();
    const correctPin = import.meta.env.VITE_ADMIN_PIN;
    if (!correctPin) {
      setPinError("No hay PIN configurado (VITE_ADMIN_PIN).");
      return;
    }
    if (pinValue === correctPin) {
      window.location.href = `${import.meta.env.BASE_URL}admin/`;
    } else {
      setPinError("PIN incorrecto.");
      setPinValue("");
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCheckoutError("");
    try {
      await openWhatsappCheckout(cart, {});
      setCart([]);
      setView("home");
    } catch (e) {
      setCheckoutError("No se pudo registrar el pedido. Intenta de nuevo.");
    }
  }

  const brand = settings?.brand || { name: "ROYAL URBAN", slogan: "Viste tu mejor versión", hero_image: "" };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f2f2f0] flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p className="text-sm text-white/40">Cargando catálogo…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f2f2f0] flex items-center justify-center px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div>
          <p className="text-sm text-[#ff2340] mb-2">No se pudo cargar el catálogo.</p>
          <p className="text-xs text-white/40">{loadError}</p>
        </div>
      </div>
    );
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

      <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handleLogoTap} className="flex flex-col leading-none active:scale-95 transition-transform">
            <span className="font-display text-lg font-bold tracking-wider">
              ROYAL<span className="text-[#ff2340]"> </span>URBAN
            </span>
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

      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6" onClick={() => setShowPinModal(false)}>
          <form
            onSubmit={submitAdminPin}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-[#0d0d0d] border border-[#cda45e]/40 rounded-2xl p-5"
          >
            <p className="text-xs tracking-widest text-[#cda45e] mb-3">ACCESO PRIVADO</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinValue}
              onChange={(e) => { setPinValue(e.target.value); setPinError(""); }}
              placeholder="PIN"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#cda45e]/60 text-center tracking-[0.4em]"
            />
            {pinError && <p className="text-[#ff2340] text-xs mt-2">{pinError}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold">
                Entrar
              </button>
            </div>
          </form>
        </div>
      )}

      {view === "home" && (
        <main className="pb-24">
          <section className="relative mx-4 mt-4 rounded-2xl overflow-hidden h-72 border border-white/5">
            <img src={brand.hero_image} alt={brand.name} className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchpriority="high" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
            <div className="absolute bottom-0 p-5">
              <p className="font-display text-3xl font-bold leading-tight">
                {brand.slogan?.split(" ").slice(0, 2).join(" ").toUpperCase()}<br />
                <span className="text-[#cda45e]">{brand.slogan?.split(" ").slice(2).join(" ").toUpperCase()}</span>
              </p>
              <div className="flex gap-2 mt-4">
                <button className="px-4 py-2 rounded-full bg-[#f2f2f0] text-black text-xs font-semibold">VER COLECCIÓN</button>
                <button onClick={handleCheckout} className="px-4 py-2 rounded-full border border-[#ff2340] text-[#ff2340] text-xs font-semibold glow-red flex items-center gap-1">
                  <MessageCircle size={13} /> WHATSAPP
                </button>
              </div>
            </div>
          </section>

          {promos.length > 0 && (
            <section className="mt-5 px-4 flex gap-3 overflow-x-auto scrollbar-none">
              {promos.map((p) => (
                <div key={p.id} className="min-w-[240px] bg-[#0d0d0d] border border-white/5 rounded-xl p-4 shrink-0">
                  <div className="flex items-center gap-1 text-[#ff2340] text-[10px] font-semibold mb-1">
                    <Flame size={11} /> CAMPAÑA
                  </div>
                  <p className="font-display text-base font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-white mt-1">{p.description}</p>
                  {p.cta_label && <button className="text-xs text-[#cda45e] mt-2 underline underline-offset-2">{p.cta_label}</button>}
                </div>
              ))}
            </section>
          )}

          <section className="mt-6 px-4 flex gap-2 overflow-x-auto scrollbar-none">
            {categoryNames.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === c ? "bg-[#f2f2f0] text-black border-[#f2f2f0]" : "border-white/15 text-white/60"
                }`}
              >
                {c}
              </button>
            ))}
          </section>

          <section className="mt-5 px-4 grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const status = statusVisual(p.overallStatus);
              const tag = p.isNew ? "NUEVO" : p.onPromotion ? "OFERTA" : p.featured ? "DESTACADO" : null;
              return (
                <button
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className="text-left bg-[#0d0d0d] border border-[#ff2340]/10 rounded-xl overflow-hidden hover:border-[#ff2340]/40 hover:glow-red transition-all"
                >
                  <div className="relative aspect-[3/4]">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    {tag && (
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded bg-black/70 text-[#cda45e] border border-[#cda45e]/30">{tag}</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-[#cda45e] font-display text-sm font-semibold">{money(p.price)}</span>
                      {p.oldPrice && <span className="text-[10px] text-white/30 line-through">{money(p.oldPrice)}</span>}
                    </div>
                    <span className={`inline-block mt-1.5 text-[9px] font-semibold border rounded px-1.5 py-0.5 ${status.cls}`}>{status.label}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="col-span-2 text-center text-white/40 text-sm py-10">No hay productos en esta categoría todavía.</p>}
          </section>
        </main>
      )}

      {view === "search" && (
        <main className="px-4 pt-4 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setView("home")} className="p-1"><ChevronLeft size={20} /></button>
            <div className="flex-1 flex items-center gap-2 bg-[#0d0d0d] border border-white/10 rounded-full px-3 py-2">
              <Search size={16} className="text-white/40" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar productos, categorías..." className="bg-transparent outline-none text-sm w-full placeholder:text-white/30" />
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

      {view === "product" && selectedProduct && (
        <ProductDetail product={selectedProduct} onBack={() => setView("home")} onAdd={addToCart} onWhatsapp={handleCheckout} />
      )}

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
                        <button onClick={() => updateQty(c.key, 1)} className="p-1.5"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => removeItem(c.key)} className="text-[10px] text-white/40 underline">quitar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {checkoutError && <p className="text-[#ff2340] text-xs mt-3">{checkoutError}</p>}

          {cart.length > 0 && (
            <div className="fixed bottom-16 left-0 right-0 bg-[#050505] border-t border-white/10 px-4 py-3">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/60">Total</span>
                <span className="font-display text-lg font-semibold text-[#cda45e]">{money(cartTotal)}</span>
              </div>
              <button onClick={handleCheckout} className="w-full py-3 rounded-full bg-[#ff2340] text-white text-sm font-semibold flex items-center justify-center gap-2 glow-red-strong">
                <MessageCircle size={16} /> COMPRAR POR WHATSAPP
              </button>
            </div>
          )}
        </main>
      )}

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
      {badge > 0 && <span className="absolute -top-1 right-1 bg-[#ff2340] text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{badge}</span>}
      <span className="text-[9px] tracking-wide">{label}</span>
    </button>
  );
}

function ProductDetail({ product, onBack, onAdd, onWhatsapp }) {
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);

  const variant = product.statusByVariant[`${color}-${size}`];
  const status = statusVisual(variant?.status || "agotado");
  const isAvailable = variant && variant.status !== "agotado";

  return (
    <main className="pb-28">
      <div className="relative">
        <img src={product.img} className="w-full aspect-[3/4] object-cover" alt={product.name} loading="eager" fetchpriority="high" />
        <button onClick={onBack} className="absolute top-4 left-4 bg-black/60 p-2 rounded-full backdrop-blur"><ChevronLeft size={18} /></button>
      </div>

      <div className="px-4 pt-4">
        <p className="font-display text-2xl font-semibold">{product.name}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[#cda45e] font-display text-xl">{money(product.price)}</span>
          {product.oldPrice && <span className="text-sm text-white/30 line-through">{money(product.oldPrice)}</span>}
        </div>
        <span className={`inline-block mt-2 text-[10px] font-semibold border rounded px-2 py-0.5 ${status.cls}`}>{status.label}</span>
        <p className="text-sm text-white/50 mt-4 leading-relaxed">{product.description}</p>

        <div className="mt-5">
          <p className="text-xs text-white/40 mb-2 tracking-wide">COLOR</p>
          <div className="flex gap-2 flex-wrap">
            {product.colors.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`px-3 py-1.5 rounded-full text-xs border ${color === c ? "border-[#ff2340] text-[#ff2340] glow-red" : "border-white/15 text-white/60"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-white/40 mb-2 tracking-wide">TALLA</p>
          <div className="flex gap-2 flex-wrap">
            {product.sizes.map((s) => {
              const v = product.statusByVariant[`${color}-${s}`];
              const disabled = !v || v.status === "agotado";
              return (
                <button key={s} onClick={() => setSize(s)} disabled={disabled} className={`w-11 h-11 rounded-lg text-xs border flex items-center justify-center ${disabled ? "border-white/5 text-white/20 line-through" : size === s ? "border-[#ff2340] text-[#ff2340] glow-red" : "border-white/15 text-white/60"}`}>{s}</button>
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
              <button onClick={() => setQty((q) => q + 1)} className="p-2"><Plus size={13} /></button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/10 px-4 py-3 flex gap-2">
        <button disabled={!isAvailable} onClick={() => onAdd(product, color, size, qty)} className={`flex-1 py-3 rounded-full text-sm font-semibold ${isAvailable ? "bg-[#f2f2f0] text-black" : "bg-white/10 text-white/30"}`}>
          {isAvailable ? "AGREGAR AL CARRITO" : "AGOTADO"}
        </button>
        <button onClick={onWhatsapp} className="w-12 h-12 rounded-full border border-[#ff2340] text-[#ff2340] flex items-center justify-center glow-red shrink-0"><MessageCircle size={18} /></button>
      </div>
    </main>
  );
}

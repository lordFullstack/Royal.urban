import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, ShoppingBag, X, Plus, Minus, Home, LayoutGrid, MessageCircle, ChevronLeft, ChevronRight,
  Flame, Trash2, Shirt, RefreshCw, WifiOff, ArrowRight, SearchX,
} from "lucide-react";
import { fetchCatalog, fetchCategories, fetchActivePromotions, fetchSettings, openWhatsappCheckout, statusVisual } from "./lib/supabase";
import { BrandMark, Button, IconButton, Badge, EmptyState, Alert, Toast, SectionHeader, cx, money } from "./ui";

/* ---------------------------------------------------------
   ROYAL URBAN — Catálogo público (conectado a Supabase)
   Rediseño 2026: Bienvenida → Home → Producto → Carrito
--------------------------------------------------------- */

const SPLASH_MIN_MS = 900; // evita un parpadeo si Supabase responde muy rápido
const SPLASH_FADE_MS = 240;
const BRAND_CACHE_KEY = "ru:brand"; // solo para pintar la bienvenida en visitas siguientes

function readBrandCache() {
  try {
    return JSON.parse(localStorage.getItem(BRAND_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}
function writeBrandCache(brand) {
  try {
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify({ name: brand?.name, hero_image: brand?.hero_image }));
  } catch {
    /* almacenamiento no disponible: no pasa nada */
  }
}

// Estado de disponibilidad → tono visual del sistema
const STATUS_TONE = { disponible: "success", ultimas_unidades: "warning", agotado: "neutral" };

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
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast, setToast] = useState(null);
  const [splash, setSplash] = useState("visible"); // visible | leaving | gone
  const tapTimer = useRef(null);
  const gridRef = useRef(null);
  const aliveRef = useRef(true);
  const mountedAt = useRef(Date.now());

  function scrollToGrid() {
    setView("home");
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function openCollection() {
    setView("collection");
  }

  const loadStore = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([fetchCatalog(), fetchCategories(), fetchActivePromotions(), fetchSettings()])
      .then(([p, c, pr, s]) => {
        if (!aliveRef.current) return;
        setProducts(p);
        setCategories(c);
        setPromos(pr);
        setSettings(s);
        writeBrandCache(s?.brand);
      })
      .catch((e) => aliveRef.current && setLoadError(e?.message || "Error de conexión"))
      .finally(() => aliveRef.current && setLoading(false));
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    loadStore();
    return () => {
      aliveRef.current = false;
    };
  }, [loadStore]);

  // Salida de la bienvenida cuando los datos esenciales están listos
  useEffect(() => {
    if (loading || loadError || splash !== "visible") return;
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - mountedAt.current));
    const t1 = setTimeout(() => setSplash("leaving"), wait);
    const t2 = setTimeout(() => setSplash("gone"), wait + SPLASH_FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading, loadError, splash]);

  // Cada pantalla nueva arranca arriba (el home conserva su propio scroll)
  useEffect(() => {
    if (view !== "home") window.scrollTo({ top: 0 });
  }, [view, selectedProduct]);

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

  const collection = useMemo(() => products.filter((p) => p.inCollection), [products]);

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
    // Feedback sin sacar al usuario del producto
    setToast({
      id: Date.now(),
      message: `${product.name} · ${size} agregado al carrito`,
      action: { label: "Ver carrito", onClick: () => setView("cart") },
    });
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
      setLogoTaps(0);
      // Navega al panel admin (HTML independiente, ver admin/index.html).
      // 'admin/' es relativo, así que respeta cualquier subruta de GitHub Pages.
      window.location.href = "admin/";
    } else {
      tapTimer.current = setTimeout(() => setLogoTaps(0), 1200);
    }
  }

  async function openGeneralWhatsapp() {
    try {
      const s = await fetchSettings();
      const number = s.whatsapp?.number || "573000000000";
      const message = s.whatsapp?.default_message || `Hola, quiero más información de ${s.brand?.name || "ROYAL URBAN"}.`;
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
    } catch {
      window.open("https://wa.me/573000000000", "_blank");
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) return openGeneralWhatsapp();
    setCheckoutError("");
    setCheckingOut(true);
    try {
      await openWhatsappCheckout(cart, {});
      setCart([]);
      setView("home");
      setToast({ id: Date.now(), message: "Pedido registrado. Continúa la compra en WhatsApp." });
    } catch (e) {
      setCheckoutError("No se pudo registrar el pedido. Intenta de nuevo.");
    } finally {
      setCheckingOut(false);
    }
  }

  const closeToast = useCallback(() => setToast(null), []);
  const brand = settings?.brand || { name: "ROYAL URBAN", slogan: "Viste tu mejor versión", hero_image: "" };
  const dataReady = !loading && !loadError;
  const showNav = view !== "product";

  return (
    <div className="min-h-screen bg-bg text-ink">
      {splash !== "gone" && (
        <WelcomeScreen leaving={splash === "leaving"} error={loadError} retrying={loading && splash === "visible"} onRetry={loadStore} />
      )}

      {dataReady && (
        <>
          {view !== "product" && (
            <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-line/60 pt-safe">
              <div className="mx-auto max-w-6xl flex items-center justify-between h-14 pl-4 pr-2">
                <button onClick={handleLogoTap} className="py-2 -ml-1 px-1 rounded-control active:scale-95 transition-transform" aria-label={brand.name || "Royal Urban"}>
                  <BrandMark size="md" />
                </button>
                <div className="flex items-center">
                  <IconButton label="Buscar" onClick={() => setView("search")}>
                    <Search size={20} />
                  </IconButton>
                  <IconButton label={`Carrito, ${cartCount} productos`} onClick={() => setView("cart")}>
                    <ShoppingBag size={20} />
                    {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
                  </IconButton>
                </div>
              </div>
            </header>
          )}

          <div className="animate-fade-in">
            {view === "home" && (
              <main className="mx-auto max-w-6xl pb-[calc(var(--ru-nav-h)+2rem)]">
                {/* Buscador rápido */}
                <div className="px-4 pt-3">
                  <button
                    onClick={() => setView("search")}
                    className="w-full flex items-center gap-3 h-11 px-4 rounded-full bg-surface border border-line/70 text-faint text-sm hover:border-faint/50 transition-colors"
                  >
                    <Search size={16} /> Buscar productos, categorías…
                  </button>
                </div>

                {/* Hero editorial */}
                <section className="relative mx-4 mt-4 rounded-card overflow-hidden h-[400px] sm:h-[440px] bg-surface">
                  {brand.hero_image ? (
                    <img src={brand.hero_image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchpriority="high" />
                  ) : (
                    <div className="absolute inset-0 brand-vignette" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/0" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 animate-fade-up">
                    <p className="eyebrow text-gold/90 mb-2">{brand.name || "Royal Urban"}</p>
                    <h1 className="font-display text-[2.4rem] sm:text-6xl font-bold leading-[0.95] uppercase text-balance">
                      {brand.slogan?.split(" ").slice(0, 2).join(" ")}
                      <br />
                      <span className="text-gold">{brand.slogan?.split(" ").slice(2).join(" ")}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-5">
                      <Button onClick={openCollection} icon={null}>
                        Ver colección <ArrowRight size={16} />
                      </Button>
                      <Button variant="outline" onClick={handleCheckout} loading={checkingOut} icon={<MessageCircle size={16} />} className="bg-black/40 backdrop-blur-md border-white/15">
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Campañas */}
                {promos.length > 0 && (
                  <section className="mt-6" aria-label="Campañas">
                    <div className="px-4 flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory">
                      {promos.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (p.cta_product_id) {
                              const prod = products.find((x) => x.id === p.cta_product_id);
                              if (prod) return openProduct(prod);
                            }
                            if (p.cta_category_id) {
                              const cat = categories.find((x) => x.id === p.cta_category_id);
                              if (cat) setActiveCategory(cat.name);
                            }
                            scrollToGrid();
                          }}
                          className="snap-start shrink-0 w-[280px] sm:w-[320px] h-[108px] flex text-left surface overflow-hidden hover:border-faint/50 transition-colors group"
                        >
                          {p.image_url && (
                            <img src={p.image_url} alt="" className="w-[92px] h-full object-cover shrink-0" loading="lazy" decoding="async" />
                          )}
                          <div className="flex-1 min-w-0 p-3.5 flex flex-col">
                            <span className="flex items-center gap-1 text-neon text-[10px] font-semibold uppercase tracking-[0.12em]">
                              <Flame size={11} /> Campaña
                            </span>
                            <p className="text-sm font-semibold text-ink mt-1 truncate">{p.title}</p>
                            {p.description && <p className="text-xs text-faint mt-0.5 line-clamp-1">{p.description}</p>}
                            {p.cta_label && (
                              <span className="mt-auto flex items-center gap-1 text-xs font-medium text-gold">
                                {p.cta_label} <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Categorías (sticky) */}
                <section ref={gridRef} className="scroll-mt-4" aria-label="Filtrar por categoría">
                  <div className="sticky top-14 z-20 bg-bg/85 backdrop-blur-xl mt-6 py-2.5">
                    <div className="px-4 flex gap-2 overflow-x-auto scrollbar-none" role="tablist">
                      {categoryNames.map((c) => (
                        <button
                          key={c}
                          role="tab"
                          aria-selected={activeCategory === c}
                          onClick={() => setActiveCategory(c)}
                          className={cx("chip", activeCategory === c && "chip-active")}
                        >
                          {c === "Nuevos" ? "Todos" : c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 mt-3">
                    <SectionHeader
                      title={activeCategory === "Nuevos" ? "Catálogo" : activeCategory}
                      subtitle={`${filtered.length} ${filtered.length === 1 ? "producto" : "productos"}`}
                      className="mb-4"
                    />
                    {filtered.length > 0 ? (
                      <ProductGrid items={filtered} onOpen={openProduct} />
                    ) : (
                      <EmptyState
                        icon={<Shirt size={22} />}
                        title="Nada por aquí todavía"
                        description="No hay productos en esta categoría por ahora."
                        action={<Button variant="outline" size="sm" onClick={() => setActiveCategory("Nuevos")}>Ver todo el catálogo</Button>}
                      />
                    )}
                  </div>
                </section>
              </main>
            )}

            {view === "collection" && (
              <SubPage title="Colección" subtitle={`${collection.length} prendas seleccionadas`} onBack={() => setView("home")}>
                {collection.length > 0 ? (
                  <ProductGrid items={collection} onOpen={openProduct} />
                ) : (
                  <EmptyState
                    icon={<Shirt size={22} />}
                    title="La colección está en preparación"
                    description="Todavía no hay prendas seleccionadas para la colección."
                    action={<Button variant="outline" size="sm" onClick={scrollToGrid}>Ver catálogo</Button>}
                  />
                )}
              </SubPage>
            )}

            {view === "categories" && (
              <SubPage title="Categorías" subtitle={`${categories.length} categorías`} onBack={() => setView("home")}>
                {categories.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {categories.map((c) => {
                      const inCat = products.filter((p) => p.category === c.name);
                      const cover = inCat.find((p) => p.img)?.img;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveCategory(c.name);
                            scrollToGrid();
                          }}
                          className="group relative text-left rounded-card overflow-hidden bg-surface border border-line/70 aspect-[4/5] hover:border-faint/60 transition-colors"
                        >
                          {cover ? (
                            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" decoding="async" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-faint"><Shirt size={28} /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 inset-x-0 p-3.5">
                            <p className="text-[15px] font-semibold text-ink">{c.name}</p>
                            <p className="text-[11px] text-muted mt-0.5">{inCat.length} {inCat.length === 1 ? "producto" : "productos"}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={<LayoutGrid size={22} />} title="No hay categorías todavía" />
                )}
              </SubPage>
            )}

            {view === "search" && (
              <main className="mx-auto max-w-6xl px-4 pt-3 pb-[calc(var(--ru-nav-h)+2rem)]">
                <div className="flex items-center gap-2">
                  <IconButton label="Volver" onClick={() => setView("home")} className="-ml-2">
                    <ChevronLeft size={22} />
                  </IconButton>
                  <div className="flex-1 flex items-center gap-2 h-11 px-4 rounded-full bg-surface border border-line focus-within:border-ink/40 transition-colors">
                    <Search size={16} className="text-faint shrink-0" />
                    <input
                      autoFocus
                      type="search"
                      enterKeyHint="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar productos, categorías…"
                      aria-label="Buscar productos"
                      className="bg-transparent outline-none text-sm w-full placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="text-faint hover:text-ink p-1 -mr-1">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {activeCategory !== "Nuevos" && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-faint">
                    Filtrando en
                    <button onClick={() => setActiveCategory("Nuevos")} className="chip chip-soft-active min-h-[30px] px-3 text-xs">
                      {activeCategory} <X size={12} />
                    </button>
                  </div>
                )}

                <div className="mt-5">
                  {query.trim() && <p className="text-xs text-faint mb-4">{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</p>}
                  {filtered.length > 0 ? (
                    <ProductGrid items={filtered} onOpen={openProduct} />
                  ) : (
                    <EmptyState
                      icon={<SearchX size={22} />}
                      title={query.trim() ? `Sin resultados para “${query.trim()}”` : "No hay productos para mostrar"}
                      description="Prueba con otro nombre o revisa las categorías."
                      action={<Button variant="outline" size="sm" onClick={() => setView("categories")}>Ver categorías</Button>}
                    />
                  )}
                </div>
              </main>
            )}

            {view === "product" && selectedProduct && (
              <ProductDetail
                product={selectedProduct}
                onBack={() => setView("home")}
                onAdd={addToCart}
                onWhatsapp={handleCheckout}
                whatsappBusy={checkingOut}
                cartCount={cartCount}
                onCart={() => setView("cart")}
              />
            )}

            {view === "cart" && (
              <SubPage
                title="Tu carrito"
                subtitle={cartCount > 0 ? `${cartCount} ${cartCount === 1 ? "producto" : "productos"}` : null}
                onBack={() => setView("home")}
                extraBottom={cart.length > 0}
                narrow
              >
                {cart.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag size={22} />}
                    title="Tu carrito está vacío"
                    description="Explora la colección y agrega tus prendas favoritas."
                    action={<Button onClick={scrollToGrid}>Explorar colección</Button>}
                  />
                ) : (
                  <>
                    <ul className="space-y-3">
                      {cart.map((c) => (
                        <li key={c.key} className="surface p-3 flex gap-3 animate-fade-up">
                          <div className="w-[76px] h-[92px] rounded-control overflow-hidden bg-elevated shrink-0">
                            <ProductImage src={c.img} alt={c.name} />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{c.name}</p>
                                <p className="text-xs text-faint mt-0.5">Talla {c.size} · {c.color}</p>
                              </div>
                              <IconButton label={`Quitar ${c.name}`} onClick={() => removeItem(c.key)} className="-mt-2 -mr-2 w-9 h-9 hover:text-neon">
                                <Trash2 size={16} />
                              </IconButton>
                            </div>
                            <div className="mt-auto flex items-end justify-between gap-2">
                              <div className="stepper" aria-label="Cantidad">
                                <button onClick={() => updateQty(c.key, -1)} aria-label="Restar uno"><Minus size={14} /></button>
                                <span aria-live="polite">{c.qty}</span>
                                <button onClick={() => updateQty(c.key, 1)} aria-label="Sumar uno"><Plus size={14} /></button>
                              </div>
                              <div className="text-right">
                                {c.qty > 1 && <p className="text-[11px] text-faint tabular-nums">{money(c.price)} c/u</p>}
                                <p className="price text-[15px]">{money(c.price * c.qty)}</p>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="surface mt-4 p-4 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Subtotal ({cartCount} {cartCount === 1 ? "producto" : "productos"})</span>
                        <span className="tabular-nums">{money(cartTotal)}</span>
                      </div>
                      <div className="divider" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="price text-xl">{money(cartTotal)}</span>
                      </div>
                      <p className="text-[11px] text-faint leading-relaxed pt-1">
                        Al finalizar se registra tu pedido y se abre WhatsApp con el detalle para coordinar pago y envío.
                      </p>
                    </div>

                    {checkoutError && <Alert className="mt-3">{checkoutError}</Alert>}

                    <div className="fixed left-0 right-0 bottom-nav-offset z-20 bg-bg/90 backdrop-blur-xl border-t border-line/60">
                      <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-4">
                        <div className="hidden min-[380px]:block shrink-0">
                          <p className="text-[11px] text-faint">Total</p>
                          <p className="price text-lg leading-tight">{money(cartTotal)}</p>
                        </div>
                        <Button size="lg" className="flex-1" onClick={handleCheckout} loading={checkingOut} icon={<MessageCircle size={18} />}>
                          {checkingOut ? "Registrando pedido…" : "Finalizar por WhatsApp"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </SubPage>
            )}
          </div>

          {showNav && (
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg/90 backdrop-blur-xl border-t border-line/60 pb-safe" aria-label="Navegación principal">
              <div className="mx-auto max-w-md grid grid-cols-4 h-16">
                <NavBtn icon={<Home size={21} />} label="Inicio" active={view === "home" || view === "collection"} onClick={() => setView("home")} />
                <NavBtn icon={<LayoutGrid size={21} />} label="Categorías" active={view === "categories"} onClick={() => setView("categories")} />
                <NavBtn icon={<Search size={21} />} label="Buscar" active={view === "search"} onClick={() => setView("search")} />
                <NavBtn icon={<ShoppingBag size={21} />} label="Carrito" active={view === "cart"} badge={cartCount} onClick={() => setView("cart")} />
              </div>
            </nav>
          )}

          <Toast
            toast={toast}
            onClose={closeToast}
            className={showNav ? (view === "cart" && cart.length > 0 ? "bottom-[calc(var(--ru-nav-h)+env(safe-area-inset-bottom)+5.5rem)]" : "bottom-[calc(var(--ru-nav-h)+env(safe-area-inset-bottom)+0.75rem)]") : "bottom-[calc(env(safe-area-inset-bottom)+6rem)]"}
          />
        </>
      )}
    </div>
  );
}

/* ============================================================
   Bienvenida / carga — NO es login.
   ============================================================ */
function WelcomeScreen({ leaving, error, retrying, onRetry }) {
  const cached = useMemo(readBrandCache, []);
  return (
    <div
      className={cx(
        "fixed inset-0 z-[70] overflow-hidden brand-vignette flex flex-col transition-opacity ease-out",
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
      role="status"
      aria-live="polite"
      aria-busy={!error}
    >
      {/* Arte de fondo: foto de portada cacheada (si existe) + líneas de neón sutiles */}
      {cached?.hero_image && (
        <img src={cached.hero_image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale-[35%]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/70 to-bg" />
      <div className="absolute -left-10 top-[18%] w-[70%] brand-glow-line rotate-[-24deg] opacity-60" aria-hidden="true" />
      <div className="absolute -right-10 top-[12%] w-[55%] brand-glow-line rotate-[28deg] opacity-40" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-up">
        <BrandMark size="lg" tagline crownClass="text-neon drop-shadow-[0_0_14px_rgb(255_35_64/0.55)]" />
        <p className="mt-10 text-lg sm:text-xl text-ink/90 leading-snug font-light">
          Más que moda,
          <br />
          <span className="text-neon font-normal brand-glow-text">es un estilo de vida.</span>
        </p>
      </div>

      <div className="relative pb-[max(3rem,env(safe-area-inset-bottom))] px-8 flex flex-col items-center min-h-[140px]">
        {error && !retrying ? (
          <div className="w-full max-w-xs flex flex-col items-center text-center animate-fade-up">
            <div className="w-11 h-11 rounded-full bg-neon/10 border border-neon/30 flex items-center justify-center text-neon mb-3">
              <WifiOff size={18} />
            </div>
            <p className="text-sm font-semibold">No pudimos cargar la tienda</p>
            <p className="text-xs text-faint mt-1">Revisa tu conexión e inténtalo de nuevo.</p>
            <Button variant="secondary" className="mt-4 w-full" onClick={onRetry} icon={<RefreshCw size={16} />}>
              Reintentar
            </Button>
            <p className="text-[10px] text-faint/70 mt-3 break-all">{error}</p>
          </div>
        ) : (
          <>
            <div className="w-40 h-[3px] rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
              <div className="h-full w-2/5 rounded-full bg-neon shadow-[0_0_10px_rgb(255_35_64/0.8)] animate-progress" />
            </div>
            <p className="mt-3 text-[11px] text-muted tracking-wide">Cargando tu experiencia…</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Piezas del catálogo
   ============================================================ */
function SubPage({ title, subtitle, onBack, children, extraBottom, narrow }) {
  return (
    <main className={cx("mx-auto px-4 pt-2", narrow ? "max-w-2xl" : "max-w-6xl", extraBottom ? "pb-[calc(var(--ru-nav-h)+9rem)]" : "pb-[calc(var(--ru-nav-h)+2rem)]")}>
      <div className="flex items-center gap-1 mb-4 -ml-2">
        <IconButton label="Volver" onClick={onBack}>
          <ChevronLeft size={22} />
        </IconButton>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-faint">{subtitle}</p>}
        </div>
      </div>
      {children}
    </main>
  );
}

function ProductGrid({ items, onOpen }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} onClick={() => onOpen(p)} />
      ))}
    </div>
  );
}

function ProductImage({ src, alt, className = "", eager }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cx("w-full h-full flex items-center justify-center text-faint bg-elevated", className)}>
        <Shirt size={26} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cx("w-full h-full object-cover", className)}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchpriority: "high" } : {})}
    />
  );
}

function discountPct(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round((1 - price / oldPrice) * 100);
}

function ProductCard({ product: p, onClick }) {
  const status = statusVisual(p.overallStatus);
  const soldOut = p.overallStatus === "agotado";
  const tag = p.isNew ? "Nuevo" : p.onPromotion ? "Oferta" : p.featured ? "Destacado" : null;
  const off = discountPct(p.price, p.oldPrice);
  return (
    <button onClick={onClick} className="group text-left rounded-card focus-visible:outline-offset-4">
      <div className="relative aspect-[3/4] rounded-card overflow-hidden bg-surface border border-line/50">
        <ProductImage src={p.img} alt={p.name} className={cx("transition-transform duration-500 ease-out group-hover:scale-[1.04]", soldOut && "opacity-50 grayscale")} />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {tag && <Badge tone={tag === "Oferta" ? "red" : "gold"} className="bg-black/60 backdrop-blur-md">{tag}</Badge>}
          {off && <Badge tone="red" className="bg-black/60 backdrop-blur-md">-{off}%</Badge>}
        </div>
        {soldOut && (
          <span className="absolute bottom-2 left-2 badge-neutral bg-black/70 backdrop-blur-md">Agotado</span>
        )}
      </div>
      <div className="pt-2.5 px-0.5">
        <p className="text-[13px] font-medium text-ink/90 line-clamp-1">{p.name}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="price text-[15px]">{money(p.price)}</span>
          {p.oldPrice && <span className="text-[11px] text-faint line-through tabular-nums">{money(p.oldPrice)}</span>}
        </div>
        {!soldOut && (
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            <span className={cx("w-1.5 h-1.5 rounded-full", p.overallStatus === "disponible" ? "bg-success" : "bg-warning")} />
            {status.label.charAt(0) + status.label.slice(1).toLowerCase()}
          </span>
        )}
      </div>
    </button>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx("relative flex flex-col items-center justify-center gap-1 transition-colors duration-fast", active ? "text-ink" : "text-faint hover:text-muted")}
    >
      <span className={cx("absolute top-0 h-[2px] w-8 rounded-full transition-all duration-base", active ? "bg-neon opacity-100" : "opacity-0")} />
      <span className={cx("relative", active && "text-neon")}>
        {icon}
        {badge > 0 && <span className="count-badge -top-1.5 -right-2.5">{badge}</span>}
      </span>
      <span className={cx("text-[10px] tracking-wide", active ? "font-semibold" : "font-medium")}>{label}</span>
    </button>
  );
}

// Nombres de color → muestra visual. Si el color no está en la lista, se muestra solo el texto.
const COLOR_HEX = {
  negro: "#111113", blanco: "#f4f4f2", gris: "#8b8b90", "gris oscuro": "#4a4a50", "gris claro": "#c4c4c8",
  rojo: "#d0213a", vinotinto: "#5e1624", azul: "#2b4fd8", "azul marino": "#1b2a4a", celeste: "#8ec5ea",
  verde: "#2f7a4a", "verde oliva": "#6b6b3a", beige: "#d8c7a8", crema: "#efe6d2", cafe: "#6b4a2e",
  marron: "#6b4a2e", camel: "#b8864e", amarillo: "#e8c547", naranja: "#e8742a", rosado: "#e59bb3",
  rosa: "#e59bb3", morado: "#6b3fa0", lila: "#b79ad8", dorado: "#cda45e", plateado: "#c0c0c8",
};
function colorHex(name = "") {
  const key = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return COLOR_HEX[key] || null;
}

function ProductDetail({ product, onBack, onAdd, onWhatsapp, whatsappBusy, cartCount, onCart }) {
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);

  const variant = product.statusByVariant[`${color}-${size}`];
  const status = statusVisual(variant?.status || "agotado");
  const isAvailable = variant && variant.status !== "agotado";
  const off = discountPct(product.price, product.oldPrice);

  function handleAdd() {
    onAdd(product, color, size, qty);
    setQty(1);
  }

  return (
    <main className="pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pt-6">
      <div className="mx-auto max-w-6xl md:px-6 md:grid md:grid-cols-2 md:gap-10 lg:gap-14 md:items-start">
        {/* Imagen dominante */}
        <div className="relative md:sticky md:top-6">
          <div className="aspect-[4/5] md:rounded-card overflow-hidden bg-surface">
            <ProductImage src={product.img} alt={product.name} eager />
          </div>
          <div className="absolute inset-x-0 top-0 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent md:from-transparent">
            <IconButton glass label="Volver" onClick={onBack}>
              <ChevronLeft size={22} />
            </IconButton>
            <IconButton glass label={`Carrito, ${cartCount} productos`} onClick={onCart}>
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
            </IconButton>
          </div>
        </div>

        {/* Información */}
        <div className="px-4 md:px-0 pt-5 md:pt-2 animate-fade-up">
          {product.category && <p className="eyebrow">{product.category}</p>}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1.5 text-balance">{product.name}</h1>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="price text-2xl">{money(product.price)}</span>
            {product.oldPrice && <span className="text-sm text-faint line-through tabular-nums">{money(product.oldPrice)}</span>}
            {off && <Badge tone="red">-{off}%</Badge>}
          </div>

          {/* Disponibilidad antes de variantes */}
          <div className="mt-4">
            <Badge tone={STATUS_TONE[variant?.status || "agotado"]} dot>
              {status.label}
            </Badge>
          </div>

          {product.description && <p className="text-sm text-muted mt-4 leading-relaxed">{product.description}</p>}

          <div className="divider my-5" />

          <fieldset>
            <legend className="text-xs font-medium text-muted mb-2.5">
              Color <span className="text-ink ml-1">{color}</span>
            </legend>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map((c) => {
                const hex = colorHex(c);
                const selected = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-pressed={selected}
                    className={cx("chip pl-2.5 pr-3.5", selected && "chip-soft-active")}
                  >
                    {hex && <span className="w-5 h-5 rounded-full border border-white/20" style={{ background: hex }} />}
                    {c}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-xs font-medium text-muted mb-2.5">
              Talla <span className="text-ink ml-1">{size}</span>
            </legend>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((s) => {
                const v = product.statusByVariant[`${color}-${s}`];
                const disabled = !v || v.status === "agotado";
                const selected = size === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={`Talla ${s}${disabled ? " agotada" : ""}`}
                    className={cx(
                      "min-w-[48px] h-12 px-3 rounded-control text-sm font-semibold border flex items-center justify-center transition-colors duration-fast",
                      disabled
                        ? "border-line/50 text-faint/60 line-through cursor-not-allowed"
                        : selected
                        ? "border-ink bg-ink text-bg"
                        : "border-line text-muted hover:text-ink hover:border-faint/60"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {isAvailable && (
            <div className="mt-5 flex items-center justify-between max-w-xs">
              <p className="text-xs font-medium text-muted">Cantidad</p>
              <div className="stepper">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Restar uno"><Minus size={15} /></button>
                <span aria-live="polite">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Sumar uno"><Plus size={15} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA sticky */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg/90 backdrop-blur-xl border-t border-line/60 pb-safe">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3 flex gap-2 md:justify-end">
          <Button size="lg" disabled={!isAvailable} onClick={handleAdd} icon={<ShoppingBag size={18} />} className="flex-1 md:flex-none md:min-w-[280px]">
            {isAvailable ? (qty > 1 ? `Agregar ${qty} · ${money(product.price * qty)}` : "Agregar al carrito") : "Agotado"}
          </Button>
          <Button variant="whatsapp" size="lg" onClick={onWhatsapp} loading={whatsappBusy} aria-label="Consultar por WhatsApp" className="px-0 w-[52px] shrink-0" icon={<MessageCircle size={20} />} />
        </div>
      </div>
    </main>
  );
}

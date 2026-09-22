import React, { useState, useEffect, useMemo, useCallback, useContext, createContext, useRef } from "react";
import {
  Lock, LayoutDashboard, Shirt, Layers, Boxes, ArrowLeftRight, ClipboardList,
  Settings, LogOut, Plus, Search, AlertTriangle, PackageX, Star, Menu, Trash2, Pencil, Image as ImageIcon,
  X, ChevronRight, ChevronDown, Eye, EyeOff, Clock, ArrowUpRight, Upload, Check, Store,
} from "lucide-react";
import {
  signIn, signOut, getCurrentSession,
  fetchAdminProducts, toggleProductActive, toggleProductCollection, createProductWithVariants, deleteProduct, fetchColors, fetchSizes,
  fetchAdminCategories, toggleCategoryVisible, createCategory, updateCategoryName, deleteCategory,
  fetchAdminPromotions, createPromotion, updatePromotion, togglePromotionActive, deletePromotion,
  fetchInventory, fetchMovements, registerMovement,
  fetchOrders, updateOrderStatus,
  fetchSettings, updateSettings, uploadImage,
} from "./lib/supabase";
import {
  BrandMark, Button, IconButton, Badge, BADGE_TONE, Field, Input, Select, Switch, Skeleton, EmptyState, Alert, Toast, Sheet, cx, money,
} from "./ui";

/* ---------------------------------------------------------
   ROYAL URBAN — Panel administrativo
   Rediseño 2026: shell operativa + CRUD responsive.
   La lógica de datos (Supabase), roles y permisos no cambian.
--------------------------------------------------------- */

function stockBadge(stock, min) {
  if (stock <= 0) return { label: "Agotado", tone: "neutral", key: "agotado" };
  if (stock <= min) return { label: "Stock bajo", tone: "red", key: "bajo" };
  return { label: "Disponible", tone: "success", key: "ok" };
}

const ORDER_STATUSES = ["Nuevo", "Contactado", "Confirmado", "Preparando", "Enviado", "Entregado", "Cancelado"];
const ORDER_TONE = {
  Nuevo: "red", Contactado: "warning", Confirmado: "gold", Preparando: "gold", Enviado: "neutral", Entregado: "success", Cancelado: "neutral",
};

const NAV = [
  { group: "General", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Catálogo",
    items: [
      { id: "productos", label: "Productos", icon: Shirt },
      { id: "categorias", label: "Categorías", icon: Layers },
      { id: "promociones", label: "Campañas", icon: ImageIcon },
    ],
  },
  {
    group: "Operación",
    items: [
      { id: "inventario", label: "Inventario", icon: Boxes },
      { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { id: "pedidos", label: "Pedidos", icon: ClipboardList },
    ],
  },
  { group: "Sistema", items: [{ id: "configuracion", label: "Configuración", icon: Settings }] },
];
const SECTION_LABEL = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, i.label])));

function fmtDate(d, withTime) {
  const date = new Date(d);
  return withTime
    ? date.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------- Contexto de UI: confirmaciones + avisos ---------- */
const AdminUI = createContext({ confirm: async () => true, notify: () => {} });
const useAdminUI = () => useContext(AdminUI);

function AdminUIProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    setDialog(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);
  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  };
  const notify = useCallback((message, tone = "success") => setToast({ id: Date.now(), message, tone }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <AdminUI.Provider value={value}>
      {children}
      <Sheet
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title}
        size="sm"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => close(false)}>Cancelar</Button>
            <Button variant={dialog?.danger ? "danger" : "secondary"} className="flex-1" onClick={() => close(true)} autoFocus>
              {dialog?.confirmLabel || "Confirmar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted leading-relaxed">{dialog?.message}</p>
      </Sheet>
      <Toast toast={toast} onClose={closeToast} className="bottom-6" />
    </AdminUI.Provider>
  );
}

/* ============================================================
   App
   ============================================================ */
export default function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getCurrentSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-5">
        <BrandMark size="md" />
        <span className="spinner text-faint" aria-label="Cargando" />
      </div>
    );
  }
  if (!session) return <LoginScreen onLogin={setSession} />;

  const role = session.profile?.role_id || "editor";
  const roleSections = {
    admin: ["dashboard", "productos", "categorias", "promociones", "inventario", "movimientos", "pedidos", "configuracion"],
    editor: ["dashboard", "productos", "categorias", "promociones", "pedidos"],
    inventario: ["dashboard", "inventario", "movimientos"],
  }[role] || ["dashboard"];

  async function handleLogout() {
    await signOut();
    setSession(null);
  }

  const go = (s) => {
    if (roleSections.includes(s)) setSection(s);
  };

  const sidebarProps = {
    role,
    roleLabel: session.profile?.roles?.label,
    email: session.user?.email,
    section,
    sections: roleSections,
    onLogout: handleLogout,
  };

  return (
    <AdminUIProvider>
      <div className="min-h-screen bg-bg text-ink md:flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-line/70 bg-surface/40">
          <SidebarContent {...sidebarProps} setSection={setSection} />
        </aside>

        {/* Barra superior móvil */}
        <div className="md:hidden sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-line/70 pt-safe">
          <div className="flex items-center gap-1 h-14 px-2">
            <IconButton label="Abrir menú" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </IconButton>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-faint uppercase tracking-[0.14em] leading-none">Royal Urban</p>
              <p className="text-sm font-semibold truncate mt-0.5">{SECTION_LABEL[section]}</p>
            </div>
            <Badge tone="neutral" className="mr-2 normal-case">{role}</Badge>
          </div>
        </div>

        {/* Drawer móvil */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-label="Menú" className="relative w-[82%] max-w-[300px] h-full bg-surface border-r border-line shadow-lift animate-slide-in">
              <IconButton label="Cerrar menú" onClick={() => setMenuOpen(false)} className="absolute top-3 right-2">
                <X size={18} />
              </IconButton>
              <SidebarContent {...sidebarProps} setSection={(s) => { setSection(s); setMenuOpen(false); }} />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 px-4 md:px-8 lg:px-10 py-5 md:py-8">
          <div className="max-w-6xl mx-auto animate-fade-in" key={section}>
            {section === "dashboard" && <Dashboard onNavigate={go} sections={roleSections} />}
            {section === "productos" && roleSections.includes("productos") && <Productos />}
            {section === "categorias" && roleSections.includes("categorias") && <Categorias />}
            {section === "promociones" && roleSections.includes("promociones") && <Promociones />}
            {section === "inventario" && roleSections.includes("inventario") && <Inventario />}
            {section === "movimientos" && roleSections.includes("movimientos") && <Movimientos />}
            {section === "pedidos" && roleSections.includes("pedidos") && <Pedidos />}
            {section === "configuracion" && roleSections.includes("configuracion") && <Configuracion />}
          </div>
        </main>
      </div>
    </AdminUIProvider>
  );
}

function SidebarContent({ role, roleLabel, email, section, setSection, sections, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <BrandMark size="sm" />
        <p className="text-[10px] tracking-[0.3em] text-gold/90 uppercase mt-2 ml-6">Panel admin</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5" aria-label="Secciones">
        {NAV.map((g) => {
          const items = g.items.filter((i) => sections.includes(i.id));
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{g.group}</p>
              <div className="space-y-0.5">
                {items.map((i) => {
                  const active = section === i.id;
                  const Icon = i.icon;
                  return (
                    <button
                      key={i.id}
                      onClick={() => setSection(i.id)}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative w-full flex items-center gap-3 px-3 h-10 rounded-control text-sm transition-colors duration-fast",
                        active ? "bg-elevated text-ink font-medium" : "text-muted hover:text-ink hover:bg-elevated/60"
                      )}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-neon" />}
                      <Icon size={17} className={active ? "text-neon" : ""} /> {i.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line/70 p-3 pb-safe">
        <a href="../" className="flex items-center gap-3 px-3 h-10 rounded-control text-sm text-muted hover:text-ink hover:bg-elevated/60 transition-colors">
          <Store size={17} /> Ver tienda
        </a>
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 rounded-full bg-elevated border border-line flex items-center justify-center text-xs font-semibold uppercase text-gold shrink-0">
            {(email || role || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink truncate">{email || "Sesión activa"}</p>
            <p className="text-[11px] text-faint capitalize">{roleLabel || role}</p>
          </div>
          <IconButton label="Cerrar sesión" onClick={onLogout} className="w-9 h-9 hover:text-neon">
            <LogOut size={16} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Login (flujo independiente)
   ============================================================ */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await signIn(email, pass);
      onLogin(session);
    } catch (err) {
      setError("Usuario o contraseña incorrectos, o no tienes un perfil autorizado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-5 py-10 brand-vignette">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex justify-center mb-10">
          <BrandMark size="lg" tagline />
        </div>
        <div className="surface-elevated p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
            <p className="text-xs text-faint mt-1">Acceso exclusivo para el equipo Royal Urban.</p>
          </div>
          <form onSubmit={submit} className="space-y-4" noValidate={false}>
            <Field label="Correo electrónico" htmlFor="login-email">
              <Input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@royalurban.com" invalid={!!error} />
            </Field>
            <Field label="Contraseña" htmlFor="login-pass">
              <div className="relative">
                <Input id="login-pass" type={showPass ? "text" : "password"} autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" className="pr-12" invalid={!!error} />
                <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10">
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </Button>
          </form>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-faint mt-5">
          <Lock size={12} /> Conexión privada · Los usuarios y roles se gestionan en Supabase.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Piezas compartidas del admin
   ============================================================ */
function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-faint mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex gap-2 shrink-0">{action}</div>}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder, className = "" }) {
  return (
    <div className={cx("relative", className)}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-10 bg-surface" />
    </div>
  );
}

function Segmented({ options, value, onChange, className = "" }) {
  return (
    <div className={cx("inline-flex p-1 rounded-control bg-surface border border-line/70 gap-1 overflow-x-auto scrollbar-none max-w-full", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "shrink-0 px-3 h-8 rounded-[9px] text-xs font-medium transition-colors duration-fast flex items-center gap-1.5",
            value === o.id ? "bg-elevated text-ink shadow-soft" : "text-faint hover:text-muted"
          )}
        >
          {o.label}
          {o.count != null && <span className={cx("tabular-nums text-[10px]", value === o.id ? "text-muted" : "text-faint/80")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

function ToggleBadge({ on, onLabel, offLabel, onClick, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
      className={cx("badge badge-dot transition-colors hover:brightness-125 disabled:opacity-50 min-h-[24px]", on ? "badge-success" : "badge-neutral")}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

function Thumb({ src, className = "w-10 h-12" }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx("rounded-[10px] overflow-hidden bg-elevated border border-line/70 shrink-0 flex items-center justify-center text-faint", className)}>
      {src && !failed ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} /> : <ImageIcon size={16} />}
    </div>
  );
}

function ImageUpload({ url, uploading, onChange, label = "Subir imagen", aspect = "aspect-[16/9]", help }) {
  return (
    <div>
      <label className={cx("group relative block w-full rounded-control border border-dashed border-line hover:border-faint/60 bg-bg/40 overflow-hidden cursor-pointer transition-colors", aspect)}>
        {url ? (
          <>
            <img src={url} alt="Vista previa" className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute bottom-2 right-2 btn btn-sm bg-black/70 text-ink backdrop-blur-md">
              {uploading ? <span className="spinner" /> : <Upload size={14} />} {uploading ? "Subiendo…" : "Cambiar"}
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-faint group-hover:text-muted">
            {uploading ? <span className="spinner" /> : <Upload size={20} />}
            <span className="text-xs font-medium">{uploading ? "Subiendo…" : label}</span>
          </span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={onChange} disabled={uploading} />
      </label>
      {help && <p className="help">{help}</p>}
    </div>
  );
}

function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-card" />
      ))}
    </div>
  );
}

function OptionChip({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cx("chip min-h-[36px] px-3.5 text-xs", selected && "chip-soft-active")}>
      {selected && <Check size={13} />} {children}
    </button>
  );
}

/* ============================================================
   Dashboard — primero lo que requiere atención
   ============================================================ */
function Dashboard({ onNavigate, sections }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // allSettled: si un rol no tiene acceso a una tabla, el resto del tablero igual carga.
    Promise.allSettled([fetchOrders(), fetchInventory()]).then(([o, i]) => {
      const orders = o.status === "fulfilled" ? o.value : null;
      const inv = i.status === "fulfilled" ? i.value : null;
      const pending = orders ? orders.filter((x) => ["Nuevo", "Confirmado"].includes(x.status)) : [];
      setStats({
        orders,
        inv,
        ordersTotal: orders?.length ?? null,
        lowStock: inv ? inv.filter((x) => x.stock > 0 && x.stock <= x.min_stock) : [],
        outOfStock: inv ? inv.filter((x) => x.stock <= 0) : [],
        pending,
      });
    });
  }, []);

  const todayRaw = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  if (!stats) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle={today} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px] rounded-card" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    );
  }

  const critical = [...stats.outOfStock, ...stats.lowStock];
  const attention = stats.pending.length + critical.length;
  const canOrders = sections.includes("pedidos") && stats.orders;
  const canInv = sections.includes("inventario") && stats.inv;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={today}
        action={
          attention > 0 ? (
            <Badge tone="red" dot className="h-7 px-3">{attention} {attention === 1 ? "asunto requiere" : "asuntos requieren"} atención</Badge>
          ) : (
            <Badge tone="success" dot className="h-7 px-3">Todo al día</Badge>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.orders && (
          <Kpi label="Pedidos pendientes" value={stats.pending.length} context="Nuevos + confirmados" icon={<Clock size={16} />} tone={stats.pending.length ? "gold" : "neutral"} onClick={canOrders ? () => onNavigate("pedidos") : null} />
        )}
        {stats.inv && (
          <>
            <Kpi label="Stock bajo" value={stats.lowStock.length} context="Variantes en o bajo el mínimo" icon={<AlertTriangle size={16} />} tone={stats.lowStock.length ? "warning" : "neutral"} onClick={canInv ? () => onNavigate("inventario") : null} />
            <Kpi label="Agotados" value={stats.outOfStock.length} context="Variantes sin unidades" icon={<PackageX size={16} />} tone={stats.outOfStock.length ? "red" : "neutral"} onClick={canInv ? () => onNavigate("inventario") : null} />
          </>
        )}
        {stats.orders && (
          <Kpi label="Pedidos totales" value={stats.ordersTotal} context="Histórico registrado" icon={<ClipboardList size={16} />} tone="neutral" onClick={canOrders ? () => onNavigate("pedidos") : null} />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        {stats.orders && (
          <Panel
            title="Pedidos pendientes"
            icon={<Star size={15} className="text-gold" />}
            action={canOrders && stats.pending.length > 0 ? <PanelLink onClick={() => onNavigate("pedidos")}>Ver pedidos</PanelLink> : null}
          >
            {stats.pending.length === 0 ? (
              <EmptyState className="py-8" icon={<Check size={20} />} title="No hay pedidos pendientes" description="Los pedidos nuevos desde WhatsApp aparecerán aquí." />
            ) : (
              <ul className="divide-y divide-line/60">
                {stats.pending.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">#{o.order_number}</p>
                      <p className="text-xs text-faint">{fmtDate(o.created_at, true)} · {o.order_items?.length || 0} ítem(s)</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge>
                      <span className="price text-sm w-24 text-right">{money(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {stats.inv && (
          <Panel
            title="Stock crítico"
            icon={<AlertTriangle size={15} className="text-warning" />}
            action={canInv && critical.length > 0 ? <PanelLink onClick={() => onNavigate("inventario")}>Ver inventario</PanelLink> : null}
          >
            {critical.length === 0 ? (
              <EmptyState className="py-8" icon={<Check size={20} />} title="Inventario saludable" description="Ninguna variante está agotada o bajo el mínimo." />
            ) : (
              <ul className="divide-y divide-line/60">
                {critical.slice(0, 6).map((r) => {
                  const b = stockBadge(r.stock, r.min_stock);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.products?.name}</p>
                        <p className="text-xs text-faint">{r.colors?.name} / {r.sizes?.name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge tone={b.tone}>{b.label}</Badge>
                        <span className="text-sm tabular-nums w-14 text-right">
                          {r.stock}<span className="text-faint">/{r.min_stock}</span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {!stats.orders && !stats.inv && (
        <Alert className="mt-4">No se pudo cargar la información del tablero. Revisa tu conexión y recarga la página.</Alert>
      )}
    </div>
  );
}

function Kpi({ label, value, context, icon, tone = "neutral", onClick }) {
  const toneCls = { neutral: "text-muted", gold: "text-gold", warning: "text-warning", red: "text-neon" }[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick || undefined} className={cx("surface p-4 text-left flex flex-col min-h-[112px] transition-colors", onClick && "hover:border-faint/50 hover:bg-elevated/40 group")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted font-medium">{label}</span>
        <span className={cx("w-8 h-8 rounded-full flex items-center justify-center bg-elevated", toneCls)}>{icon}</span>
      </div>
      <p className={cx("text-3xl font-semibold tabular-nums mt-auto pt-2", tone === "red" && value > 0 ? "text-neon" : "text-ink")}>{value ?? "—"}</p>
      <p className="text-[11px] text-faint mt-0.5 flex items-center gap-1">
        {context}
        {onClick && <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
      </p>
    </Tag>
  );
}

function Panel({ title, icon, action, children }) {
  return (
    <section className="surface px-4 pt-4 pb-1">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">{icon} {title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function PanelLink({ onClick, children }) {
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 text-xs text-muted hover:text-ink transition-colors py-1">
      {children} <ChevronRight size={14} />
    </button>
  );
}

/* ============================================================
   Productos
   ============================================================ */
function Productos() {
  const { confirm, notify } = useAdminUI();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busyId, setBusyId] = useState(null);
  const emptyForm = { name: "", description: "", categoryId: "", price: "", oldPrice: "", skuBase: "", featured: false, isNew: false, inCollection: false, imageUrl: "", colorIds: [], sizeIds: [] };
  const [form, setForm] = useState(emptyForm);

  function reload() { fetchAdminProducts().then(setProducts).finally(() => setLoading(false)); }
  useEffect(() => {
    reload();
    fetchAdminCategories().then(setCategories);
    fetchColors().then(setColors);
    fetchSizes().then(setSizes);
  }, []);

  async function toggle(id, active) {
    setBusyId(id);
    try {
      await toggleProductActive(id, !active);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: !active } : p)));
    } catch (err) {
      notify("No se pudo cambiar el estado: " + err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCollection(id, inCollection) {
    setBusyId(id);
    try {
      await toggleProductCollection(id, !inCollection);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, in_collection: !inCollection } : p)));
    } catch (err) {
      notify("No se pudo actualizar la colección: " + err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p) {
    const ok = await confirm({
      title: `¿Eliminar “${p.name}”?`,
      message: "También se borran sus variantes. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar producto",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(p.id);
      notify("Producto eliminado");
      reload();
    } catch (err) {
      notify("No se pudo eliminar: " + err.message, "error");
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setFieldErrors({});
    setShowForm(true);
  }

  function toggleIn(list, id) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, "products");
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError("No se pudo subir la imagen: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const fe = {};
    if (!form.name.trim()) fe.name = "Escribe el nombre del producto.";
    if (!form.price) fe.price = "Indica el precio.";
    setFieldErrors(fe);
    if (Object.keys(fe).length) {
      setError("Nombre y precio son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await createProductWithVariants({
        name: form.name.trim(),
        description: form.description,
        categoryId: form.categoryId || null,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        skuBase: form.skuBase,
        featured: form.featured,
        isNew: form.isNew,
        inCollection: form.inCollection,
        imageUrl: form.imageUrl,
        colorIds: form.colorIds,
        sizeIds: form.sizeIds,
      });
      setShowForm(false);
      notify("Producto creado");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const list = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const variantsPreview = form.colorIds.length * form.sizeIds.length;

  return (
    <div>
      <PageHeader
        title="Productos"
        subtitle={loading ? "Cargando catálogo…" : `${products.length} productos · ${products.filter((p) => p.active).length} visibles en la tienda`}
        action={<Button onClick={openCreate} icon={<Plus size={16} />}>Nuevo producto</Button>}
      />

      <SearchBox value={query} onChange={setQuery} placeholder="Buscar producto…" className="mb-4 max-w-sm" />

      {loading ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Shirt size={22} />}
            title={query ? "Sin resultados" : "No hay productos todavía"}
            description={query ? `Ningún producto coincide con “${query}”.` : "Crea el primer producto para empezar a vender."}
            action={!query && <Button size="sm" onClick={openCreate} icon={<Plus size={14} />}>Nuevo producto</Button>}
          />
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block surface overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th><th>Categoría</th><th className="text-right">Precio</th><th className="text-center">Destacado</th><th>Colección</th><th>Estado</th><th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Thumb src={p.image_url} />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[260px]">{p.name}</p>
                          <p className="text-xs text-faint">{p.sku_base || "Sin SKU"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{p.categories?.name || <span className="text-faint">—</span>}</td>
                    <td className="text-right">
                      <p className="price">{money(p.price)}</p>
                      {p.old_price && <p className="text-[11px] text-faint line-through tabular-nums">{money(p.old_price)}</p>}
                    </td>
                    <td className="text-center">{p.featured ? <Star size={15} className="inline text-gold fill-gold" aria-label="Destacado" /> : <span className="text-faint">—</span>}</td>
                    <td><ToggleBadge on={p.in_collection} onLabel="Sí" offLabel="No" busy={busyId === p.id} onClick={() => toggleCollection(p.id, p.in_collection)} /></td>
                    <td><ToggleBadge on={p.active} onLabel="Activo" offLabel="Oculto" busy={busyId === p.id} onClick={() => toggle(p.id, p.active)} /></td>
                    <td className="text-right">
                      <IconButton label={`Eliminar ${p.name}`} onClick={() => remove(p)} className="w-9 h-9 hover:text-neon">
                        <Trash2 size={16} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas accionables */}
          <ul className="md:hidden space-y-2">
            {list.map((p) => (
              <li key={p.id} className="surface p-3 flex gap-3">
                <Thumb src={p.image_url} className="w-16 h-20" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {p.featured && <Star size={12} className="text-gold fill-gold shrink-0" />} {p.name}
                      </p>
                      <p className="text-xs text-faint truncate">{p.categories?.name || "Sin categoría"} · {p.sku_base || "Sin SKU"}</p>
                    </div>
                    <IconButton label={`Eliminar ${p.name}`} onClick={() => remove(p)} className="w-9 h-9 -mt-1.5 -mr-1.5 hover:text-neon">
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                  <p className="price text-sm mt-1">{money(p.price)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <ToggleBadge on={p.active} onLabel="Activo" offLabel="Oculto" busy={busyId === p.id} onClick={() => toggle(p.id, p.active)} />
                    <ToggleBadge on={p.in_collection} onLabel="En colección" offLabel="Fuera de colección" busy={busyId === p.id} onClick={() => toggleCollection(p.id, p.in_collection)} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nuevo producto"
        subtitle="Las variantes se crean automáticamente por color y talla."
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" form="product-form" variant="secondary" className="flex-1" loading={saving}>{saving ? "Creando…" : "Crear producto"}</Button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="space-y-6">
          <FormGroup title="Información">
            <Field label="Nombre del producto *" htmlFor="p-name" error={fieldErrors.name}>
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Hoodie Royal Urban" invalid={!!fieldErrors.name} />
            </Field>
            <Field label="Descripción" htmlFor="p-desc">
              <textarea id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Materiales, fit, detalles…" rows={3} className="input" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Categoría" htmlFor="p-cat">
                <Select id="p-cat" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="SKU base" htmlFor="p-sku" help="Opcional">
                <Input id="p-sku" value={form.skuBase} onChange={(e) => setForm({ ...form, skuBase: e.target.value })} placeholder="Ej. RU-HOOD" />
              </Field>
            </div>
          </FormGroup>

          <FormGroup title="Precio">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Precio *" htmlFor="p-price" error={fieldErrors.price}>
                <Input id="p-price" type="number" inputMode="numeric" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="89900" invalid={!!fieldErrors.price} />
              </Field>
              <Field label="Precio anterior" htmlFor="p-old" help="Se muestra tachado">
                <Input id="p-old" type="number" inputMode="numeric" min="0" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} placeholder="Opcional" />
              </Field>
            </div>
          </FormGroup>

          <FormGroup title="Foto principal">
            <ImageUpload url={form.imageUrl} uploading={uploading} onChange={handleImageUpload} label="Subir foto del producto" aspect="aspect-[4/3] sm:aspect-[16/9]" />
          </FormGroup>

          <FormGroup title="Variantes" hint={variantsPreview > 0 ? `${variantsPreview} variantes se crearán` : null}>
            <div>
              <p className="label">Colores</p>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <OptionChip key={c.id} selected={form.colorIds.includes(c.id)} onClick={() => setForm((f) => ({ ...f, colorIds: toggleIn(f.colorIds, c.id) }))}>{c.name}</OptionChip>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Tallas</p>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((s) => (
                  <OptionChip key={s.id} selected={form.sizeIds.includes(s.id)} onClick={() => setForm((f) => ({ ...f, sizeIds: toggleIn(f.sizeIds, s.id) }))}>{s.name}</OptionChip>
                ))}
              </div>
              <p className="help">Las variantes se crean con stock en 0 — cárgalo después desde Movimientos.</p>
            </div>
          </FormGroup>

          <FormGroup title="Visibilidad">
            <div className="surface divide-y divide-line/60 px-3.5 py-1">
              <Switch label="Destacado" description="Aparece con la etiqueta Destacado" checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
              <Switch label="Nuevo" description="Aparece con la etiqueta Nuevo" checked={form.isNew} onChange={(v) => setForm({ ...form, isNew: v })} />
              <Switch label="En colección" description="Se muestra en la vista Colección" checked={form.inCollection} onChange={(v) => setForm({ ...form, inCollection: v })} />
            </div>
          </FormGroup>

          {error && <Alert>{error}</Alert>}
        </form>
      </Sheet>
    </div>
  );
}

function FormGroup({ title, hint, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{title}</p>
        {hint && <span className="text-[11px] text-gold">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/* ============================================================
   Categorías
   ============================================================ */
function Categorias() {
  const { confirm, notify } = useAdminUI();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  function reload() { fetchAdminCategories().then(setCats).finally(() => setLoading(false)); }
  useEffect(reload, []);

  async function toggle(id, visible) {
    try {
      await toggleCategoryVisible(id, !visible);
      setCats((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !visible } : c)));
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    setCreating(true);
    try {
      await createCategory(newName.trim());
      setNewName("");
      notify("Categoría creada");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  async function saveEdit(id) {
    if (editingId !== id) return;
    if (!editName.trim()) return;
    try {
      await updateCategoryName(id, editName.trim());
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(c) {
    const ok = await confirm({
      title: `¿Eliminar “${c.name}”?`,
      message: "Los productos que la usan quedarán sin categoría.",
      confirmLabel: "Eliminar categoría",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(c.id);
      notify("Categoría eliminada");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Categorías" subtitle="Organizan el catálogo y los filtros de la tienda." />

      <form onSubmit={addCategory} className="surface p-4 mb-5">
        <label htmlFor="new-cat" className="label">Nueva categoría</label>
        <div className="flex gap-2">
          <Input id="new-cat" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Hoodies" />
          <Button type="submit" variant="secondary" loading={creating} disabled={!newName.trim()} icon={<Plus size={16} />} className="shrink-0">Crear</Button>
        </div>
      </form>
      {error && <Alert className="mb-4">{error}</Alert>}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : cats.length === 0 ? (
        <div className="surface"><EmptyState icon={<Layers size={22} />} title="No hay categorías todavía" description="Crea la primera arriba." /></div>
      ) : (
        <ul className="surface divide-y divide-line/60">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 min-h-[60px]">
              {editingId === c.id ? (
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(c.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => saveEdit(c.id)}
                  aria-label="Nombre de la categoría"
                  className="flex-1 min-h-[40px]"
                />
              ) : (
                <p className={cx("text-sm font-medium truncate", !c.visible && "text-faint")}>{c.name}</p>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <ToggleBadge on={c.visible} onLabel="Visible" offLabel="Oculta" onClick={() => toggle(c.id, c.visible)} />
                <IconButton label={`Renombrar ${c.name}`} onClick={() => startEdit(c)} className="w-9 h-9 ml-1">
                  <Pencil size={15} />
                </IconButton>
                <IconButton label={`Eliminar ${c.name}`} onClick={() => remove(c)} className="w-9 h-9 hover:text-neon">
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   Campañas
   ============================================================ */
function Promociones() {
  const { confirm, notify } = useAdminUI();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = crear, objeto = editar
  const emptyForm = { title: "", description: "", image_url: "", cta_label: "", linkType: "none", cta_category_id: "", cta_product_id: "" };
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function reload() { fetchAdminPromotions().then(setPromos).finally(() => setLoading(false)); }
  useEffect(() => {
    reload();
    fetchAdminCategories().then(setCategories);
    fetchAdminProducts().then(setProducts);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }
  function openEdit(p) {
    setEditing(p);
    setError("");
    setForm({
      title: p.title, description: p.description || "", image_url: p.image_url || "", cta_label: p.cta_label || "",
      linkType: p.cta_product_id ? "product" : p.cta_category_id ? "category" : "none",
      cta_category_id: p.cta_category_id || "", cta_product_id: p.cta_product_id || "",
    });
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const payload = {
      title: form.title, description: form.description, image_url: form.image_url, cta_label: form.cta_label,
      cta_category_id: form.linkType === "category" ? form.cta_category_id : null,
      cta_product_id: form.linkType === "product" ? form.cta_product_id : null,
    };
    setSaving(true);
    try {
      if (editing) await updatePromotion(editing.id, payload);
      else await createPromotion(payload);
      setShowForm(false);
      notify(editing ? "Campaña actualizada" : "Campaña creada");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, "promotions");
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setError("No se pudo subir la imagen: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function toggle(id, active) {
    try {
      await togglePromotionActive(id, !active);
      reload();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function remove(p) {
    const ok = await confirm({
      title: `¿Eliminar “${p.title}”?`,
      message: "La tarjeta dejará de mostrarse en la tienda.",
      confirmLabel: "Eliminar campaña",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePromotion(p.id);
      notify("Campaña eliminada");
      reload();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  function targetLabel(p) {
    if (p.cta_product_id) return "Producto: " + (products.find((x) => x.id === p.cta_product_id)?.name || "—");
    if (p.cta_category_id) return "Categoría: " + (categories.find((x) => x.id === p.cta_category_id)?.name || "—");
    return "Catálogo general";
  }

  return (
    <div>
      <PageHeader
        title="Campañas"
        subtitle={loading ? "Cargando…" : `${promos.filter((p) => p.active).length} activas de ${promos.length}`}
        action={<Button onClick={openCreate} icon={<Plus size={16} />}>Nueva campaña</Button>}
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-card" />)}</div>
      ) : promos.length === 0 ? (
        <div className="surface">
          <EmptyState icon={<ImageIcon size={22} />} title="No hay campañas todavía" description="Las campañas aparecen como tarjetas en el inicio de la tienda." action={<Button size="sm" onClick={openCreate} icon={<Plus size={14} />}>Nueva campaña</Button>} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p) => (
            <article key={p.id} className={cx("surface overflow-hidden flex flex-col", !p.active && "opacity-70")}>
              <div className="aspect-[16/9] bg-elevated relative">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-faint"><ImageIcon size={22} /></div>}
                <div className="absolute top-2.5 right-2.5">
                  <ToggleBadge on={p.active} onLabel="Activa" offLabel="Oculta" onClick={() => toggle(p.id, p.active)} />
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm font-semibold">{p.title}</p>
                {p.description && <p className="text-xs text-faint mt-1 line-clamp-2">{p.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  {p.cta_label && <span className="text-gold font-medium">{p.cta_label} →</span>}
                  <span className="text-faint">{targetLabel(p)}</span>
                </div>
                <div className="flex items-center gap-1 mt-auto pt-3 border-t border-line/60 -mx-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)} icon={<Pencil size={14} />}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p)} icon={<Trash2 size={14} />} className="hover:text-neon">Eliminar</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Editar campaña" : "Nueva campaña"}
        subtitle="Tarjeta horizontal en el inicio de la tienda."
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" form="promo-form" variant="secondary" className="flex-1" loading={saving}>{editing ? "Guardar cambios" : "Crear campaña"}</Button>
          </>
        }
      >
        <form id="promo-form" onSubmit={submit} className="space-y-4">
          <Field label="Título *" htmlFor="pr-title">
            <Input id="pr-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Colección Nocturna" />
          </Field>
          <Field label="Descripción" htmlFor="pr-desc">
            <Input id="pr-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Una línea corta" />
          </Field>
          <Field label="Imagen">
            <ImageUpload url={form.image_url} uploading={uploading} onChange={handleImageUpload} />
          </Field>
          <Field label="Texto del botón" htmlFor="pr-cta">
            <Input id="pr-cta" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Ej. Ver colección" />
          </Field>
          <div>
            <p className="label">Al tocar la tarjeta, llevar a</p>
            <Segmented
              value={form.linkType}
              onChange={(id) => setForm({ ...form, linkType: id })}
              options={[
                { id: "none", label: "Catálogo general" },
                { id: "category", label: "Categoría" },
                { id: "product", label: "Producto" },
              ]}
            />
            {form.linkType === "category" && (
              <Select value={form.cta_category_id} onChange={(e) => setForm({ ...form, cta_category_id: e.target.value })} className="mt-3" aria-label="Categoría destino">
                <option value="">Selecciona categoría…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            {form.linkType === "product" && (
              <Select value={form.cta_product_id} onChange={(e) => setForm({ ...form, cta_product_id: e.target.value })} className="mt-3" aria-label="Producto destino">
                <option value="">Selecciona producto…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
          </div>
          {error && <Alert>{error}</Alert>}
        </form>
      </Sheet>
    </div>
  );
}

/* ============================================================
   Inventario
   ============================================================ */
function Inventario() {
  const [inv, setInv] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [query, setQuery] = useState("");
  useEffect(() => { fetchInventory().then(setInv).finally(() => setLoading(false)); }, []);

  const counts = useMemo(() => {
    const c = { todos: inv.length, bajo: 0, agotado: 0 };
    inv.forEach((r) => {
      const k = stockBadge(r.stock, r.min_stock).key;
      if (k in c) c[k]++;
    });
    return c;
  }, [inv]);

  const rows = inv.filter((r) => {
    if (filter !== "todos" && stockBadge(r.stock, r.min_stock).key !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [r.products?.name, r.sku, r.colors?.name, r.sizes?.name].some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Stock por variante. Esta información nunca se expone en la tienda pública." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: "todos", label: "Todos", count: counts.todos },
            { id: "bajo", label: "Stock bajo", count: counts.bajo },
            { id: "agotado", label: "Agotados", count: counts.agotado },
          ]}
        />
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar producto, SKU, color…" className="sm:max-w-xs flex-1" />
      </div>

      {loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <div className="surface"><EmptyState icon={<Boxes size={22} />} title="Sin variantes para mostrar" description={filter !== "todos" ? "Ninguna variante coincide con este filtro." : "Crea productos con colores y tallas para ver su stock aquí."} /></div>
      ) : (
        <>
          <div className="hidden md:block surface overflow-hidden">
            <table className="table">
              <thead>
                <tr><th>Producto</th><th>Variante</th><th>SKU</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const badge = stockBadge(r.stock, r.min_stock);
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.products?.name}</td>
                      <td className="text-muted">{r.colors?.name} / {r.sizes?.name}</td>
                      <td className="text-faint text-xs">{r.sku}</td>
                      <td className={cx("text-right font-semibold tabular-nums", badge.key === "bajo" && "text-neon", badge.key === "agotado" && "text-faint")}>{r.stock}</td>
                      <td className="text-right text-faint tabular-nums">{r.min_stock}</td>
                      <td><Badge tone={badge.tone} dot>{badge.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-2">
            {rows.map((r) => {
              const badge = stockBadge(r.stock, r.min_stock);
              return (
                <li key={r.id} className="surface p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.products?.name}</p>
                    <p className="text-xs text-faint truncate">{r.colors?.name} / {r.sizes?.name} · {r.sku}</p>
                    <Badge tone={badge.tone} dot className="mt-2">{badge.label}</Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cx("text-2xl font-semibold tabular-nums leading-none", badge.key === "bajo" && "text-neon", badge.key === "agotado" && "text-faint")}>{r.stock}</p>
                    <p className="text-[11px] text-faint mt-1">mín. {r.min_stock}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Movimientos (Kardex)
   ============================================================ */
const MOVE_TONE = { entrada: "success", salida: "red", ajuste: "neutral" };

function Movimientos() {
  const { notify } = useAdminUI();
  const [moves, setMoves] = useState([]);
  const [inv, setInv] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ variantId: "", type: "entrada", qty: "", reason: "" });
  const [error, setError] = useState("");

  function reload() {
    fetchMovements().then(setMoves).finally(() => setLoading(false));
    fetchInventory().then(setInv);
  }
  useEffect(reload, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.variantId || !form.qty) {
      setError("Selecciona la variante e indica la cantidad.");
      return;
    }
    setSaving(true);
    try {
      await registerMovement({ variantId: form.variantId, type: form.type, qty: Number(form.qty), reason: form.reason });
      setForm({ variantId: "", type: "entrada", qty: "", reason: "" });
      setShowForm(false);
      notify("Movimiento registrado");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedVariant = inv.find((v) => v.id === form.variantId);

  return (
    <div>
      <PageHeader
        title="Movimientos"
        subtitle="Kardex: entradas, salidas y ajustes de stock (últimos 50)."
        action={<Button onClick={() => { setError(""); setShowForm(true); }} icon={<Plus size={16} />}>Registrar movimiento</Button>}
      />

      {loading ? (
        <ListSkeleton />
      ) : moves.length === 0 ? (
        <div className="surface"><EmptyState icon={<ArrowLeftRight size={22} />} title="Sin movimientos todavía" description="Registra una entrada para cargar stock inicial." /></div>
      ) : (
        <>
          <div className="hidden md:block surface overflow-hidden">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="text-right">Cant.</th><th>Antes → Después</th><th>Motivo</th></tr>
              </thead>
              <tbody>
                {moves.map((m) => {
                  const diff = m.stock_after - m.stock_before;
                  return (
                    <tr key={m.id}>
                      <td className="text-muted whitespace-nowrap text-xs">{fmtDate(m.created_at, true)}</td>
                      <td>
                        <p className="font-medium">{m.product_variants?.products?.name}</p>
                        <p className="text-xs text-faint">{m.product_variants?.colors?.name}/{m.product_variants?.sizes?.name}</p>
                      </td>
                      <td><Badge tone={MOVE_TONE[m.type]}>{m.type}</Badge></td>
                      <td className={cx("text-right font-semibold tabular-nums", diff > 0 ? "text-success" : diff < 0 ? "text-neon" : "text-muted")}>{diff > 0 ? "+" : ""}{diff}</td>
                      <td className="text-muted tabular-nums">{m.stock_before} → <span className="text-ink">{m.stock_after}</span></td>
                      <td className="text-faint text-xs max-w-[220px] truncate">{m.reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-2">
            {moves.map((m) => {
              const diff = m.stock_after - m.stock_before;
              return (
                <li key={m.id} className="surface p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.product_variants?.products?.name}</p>
                      <p className="text-xs text-faint">{m.product_variants?.colors?.name}/{m.product_variants?.sizes?.name} · {fmtDate(m.created_at, true)}</p>
                    </div>
                    <p className={cx("text-lg font-semibold tabular-nums shrink-0", diff > 0 ? "text-success" : diff < 0 ? "text-neon" : "text-muted")}>{diff > 0 ? "+" : ""}{diff}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <Badge tone={MOVE_TONE[m.type]}>{m.type}</Badge>
                    <span className="text-faint tabular-nums">{m.stock_before} → {m.stock_after}</span>
                    {m.reason && <span className="text-faint truncate">· {m.reason}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nuevo movimiento"
        subtitle="Actualiza el stock real de una variante."
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" form="move-form" variant="secondary" className="flex-1" loading={saving}>Registrar</Button>
          </>
        }
      >
        <form id="move-form" onSubmit={submit} className="space-y-4">
          <Field label="Variante *" htmlFor="mv-variant" help={selectedVariant ? `Stock actual: ${selectedVariant.stock} · mínimo ${selectedVariant.min_stock}` : null}>
            <Select id="mv-variant" required value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })}>
              <option value="">Selecciona variante…</option>
              {inv.map((v) => (
                <option key={v.id} value={v.id}>{v.products?.name} — {v.colors?.name}/{v.sizes?.name} (stock {v.stock})</option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="label">Tipo</p>
            <Segmented
              value={form.type}
              onChange={(id) => setForm({ ...form, type: id })}
              options={[{ id: "entrada", label: "Entrada" }, { id: "salida", label: "Salida" }, { id: "ajuste", label: "Ajuste" }]}
            />
          </div>
          <Field label="Cantidad *" htmlFor="mv-qty">
            <Input id="mv-qty" required type="number" inputMode="numeric" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Motivo" htmlFor="mv-reason">
            <Input id="mv-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ej. Compra a proveedor" />
          </Field>
          {error && <Alert>{error}</Alert>}
        </form>
      </Sheet>
    </div>
  );
}

/* ============================================================
   Pedidos
   ============================================================ */
function Pedidos() {
  const { confirm, notify } = useAdminUI();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("todos");
  const [open, setOpen] = useState(null);

  function reload() { fetchOrders().then(setOrders).finally(() => setLoading(false)); }
  useEffect(reload, []);

  async function changeStatus(order, status) {
    if (status === "Confirmado") {
      const ok = await confirm({
        title: `¿Confirmar pedido #${order.order_number}?`,
        message: "Al confirmar se descuenta el stock de cada producto del pedido.",
        confirmLabel: "Confirmar y descontar stock",
      });
      if (!ok) return;
    }
    if (status === "Cancelado") {
      const ok = await confirm({ title: `¿Cancelar pedido #${order.order_number}?`, message: "El pedido quedará marcado como cancelado.", confirmLabel: "Cancelar pedido", danger: true });
      if (!ok) return;
    }
    setBusy(order.id);
    setError("");
    try {
      await updateOrderStatus(order.id, status, order.order_items);
      notify(`Pedido #${order.order_number} → ${status}`);
      reload();
    } catch (err) {
      setError(`Pedido #${order.order_number}: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const c = { todos: orders.length };
    ORDER_STATUSES.forEach((s) => (c[s] = orders.filter((o) => o.status === s).length));
    return c;
  }, [orders]);
  const list = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Pedidos registrados desde el checkout por WhatsApp." />

      <Segmented
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[{ id: "todos", label: "Todos", count: counts.todos }, ...ORDER_STATUSES.filter((s) => counts[s] > 0 || s === "Nuevo").map((s) => ({ id: s, label: s, count: counts[s] }))]}
      />

      {error && <Alert className="mb-3">{error}</Alert>}

      {loading ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <div className="surface"><EmptyState icon={<ClipboardList size={22} />} title={filter === "todos" ? "No hay pedidos todavía" : `Sin pedidos “${filter}”`} /></div>
      ) : (
        <ul className="space-y-2">
          {list.map((o) => {
            const expanded = open === o.id;
            return (
              <li key={o.id} className="surface overflow-hidden">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3">
                  <button onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <ChevronDown size={16} className={cx("text-faint shrink-0 transition-transform duration-fast", expanded && "rotate-180")} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">#{o.order_number}</p>
                      <p className="text-xs text-faint truncate">{fmtDate(o.created_at)} · {o.customer_name ? `${o.customer_name} · ` : ""}{o.order_items?.length || 0} ítem(s)</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="price text-sm">{money(o.total)}</span>
                    <div className="relative">
                      <select
                        disabled={busy === o.id}
                        value={o.status}
                        onChange={(e) => changeStatus(o, e.target.value)}
                        aria-label={`Estado del pedido ${o.order_number}`}
                        className={cx(BADGE_TONE[ORDER_TONE[o.status]], "appearance-none cursor-pointer pr-6 min-h-[32px] px-3 text-[11px] outline-none disabled:opacity-50")}
                      >
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {busy === o.id ? (
                        <span className="spinner w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
                      ) : (
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                      )}
                    </div>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-line/60 bg-bg/40 px-4 py-3 animate-fade-in">
                    {o.customer_phone && <p className="text-xs text-muted mb-2">Tel: {o.customer_phone}</p>}
                    <ul className="divide-y divide-line/50">
                      {(o.order_items || []).map((it) => (
                        <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate">{it.product_name}</p>
                            <p className="text-xs text-faint">{it.color_name} / {it.size_name} · x{it.qty}</p>
                          </div>
                          <span className="tabular-nums text-muted shrink-0">{money(it.unit_price * it.qty)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   Configuración
   ============================================================ */
function Configuracion() {
  const { notify } = useAdminUI();
  const [settings, setSettingsState] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => { fetchSettings().then(setSettingsState); }, []);

  if (!settings) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Configuración" subtitle="Marca, contacto y opciones del catálogo." />
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-card" />)}</div>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      await Promise.all([
        updateSettings("brand", settings.brand),
        updateSettings("whatsapp", settings.whatsapp),
        updateSettings("social", settings.social),
        updateSettings("catalog_flags", settings.catalog_flags),
      ]);
      setSaved(true);
      notify("Configuración guardada");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError("No se pudo guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (group, key, value) => setSettingsState((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadImage(file, "brand");
      set("brand", "hero_image", url);
    } catch (err) {
      setUploadError("No se pudo subir la imagen: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-2xl pb-24">
      <PageHeader title="Configuración" subtitle="Marca, contacto y opciones del catálogo." />

      <SectionBlock title="Marca" description="Se muestra en el inicio de la tienda.">
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingField id="cfg-name" label="Nombre" value={settings.brand?.name || ""} onChange={(v) => set("brand", "name", v)} />
          <SettingField id="cfg-slogan" label="Eslogan" value={settings.brand?.slogan || ""} onChange={(v) => set("brand", "slogan", v)} help="Las dos primeras palabras van en blanco, el resto en dorado." />
        </div>
        <Field label="Imagen de portada" error={uploadError}>
          <ImageUpload url={settings.brand?.hero_image} uploading={uploading} onChange={handleHeroUpload} help="Tamaño ideal: 1600×900px, menos de 300KB." />
        </Field>
      </SectionBlock>

      <SectionBlock title="WhatsApp" description="Número que recibe los pedidos.">
        <SettingField id="cfg-wa" label="Número" value={settings.whatsapp?.number || ""} onChange={(v) => set("whatsapp", "number", v)} placeholder="573001234567" help="Con indicativo de país, sin + ni espacios." inputMode="tel" />
      </SectionBlock>

      <SectionBlock title="Redes sociales">
        <SettingField id="cfg-ig" label="Instagram" value={settings.social?.instagram || ""} onChange={(v) => set("social", "instagram", v)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingField id="cfg-fb" label="Facebook" value={settings.social?.facebook || ""} onChange={(v) => set("social", "facebook", v)} placeholder="Opcional" />
          <SettingField id="cfg-tt" label="TikTok" value={settings.social?.tiktok || ""} onChange={(v) => set("social", "tiktok", v)} placeholder="Opcional" />
        </div>
      </SectionBlock>

      <SectionBlock title="Catálogo">
        <div className="divide-y divide-line/60 -my-1">
          <Switch label="Mostrar productos agotados" checked={!!settings.catalog_flags?.show_out_of_stock} onChange={(v) => set("catalog_flags", "show_out_of_stock", v)} />
          <Switch label="Mostrar sección de ofertas" checked={!!settings.catalog_flags?.show_offers} onChange={(v) => set("catalog_flags", "show_offers", v)} />
          <Switch label="Mostrar sección de nuevos" checked={!!settings.catalog_flags?.show_new} onChange={(v) => set("catalog_flags", "show_new", v)} />
        </div>
      </SectionBlock>

      {saveError && <Alert className="mb-4">{saveError}</Alert>}

      {/* Barra de guardado persistente */}
      <div className="fixed bottom-0 right-0 left-0 md:left-64 z-30 bg-bg/90 backdrop-blur-xl border-t border-line/70 pb-safe">
        <div className="max-w-2xl mx-auto md:mx-0 md:ml-10 px-4 md:px-0 py-3 flex items-center justify-end gap-3">
          <span className="text-xs text-faint mr-auto hidden sm:block">Los cambios se aplican en la tienda al guardar.</span>
          <Button variant="secondary" onClick={save} loading={saving} icon={saved ? <Check size={16} /> : null} className="w-full sm:w-auto">
            {saving ? "Guardando…" : saved ? "Guardado" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ title, description, children }) {
  return (
    <section className="surface p-4 md:p-5 mb-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-faint mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function SettingField({ id, label, value, onChange, placeholder, help, inputMode }) {
  return (
    <Field label={label} htmlFor={id} help={help}>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} />
    </Field>
  );
}

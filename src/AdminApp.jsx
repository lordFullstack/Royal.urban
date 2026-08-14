import React, { useState, useMemo } from "react";
import {
  Lock, LayoutDashboard, Shirt, Layers, Boxes, ArrowLeftRight, ClipboardList,
  Settings, LogOut, Plus, Search, X, TrendingUp, AlertTriangle, PackageX,
  Star, ChevronRight, Menu,
} from "lucide-react";

/* ---------------------------------------------------------
   YEI-SI ROYALE URBAN — /admin
   Mismos tokens que la tienda pública (negro / dorado / glow rojo),
   pero en modo "consola": más densidad, tablas, estados de color
   funcionales en vez de decorativos. RBAC visual: admin / editor / inventario.
--------------------------------------------------------- */

const ROLES = {
  admin: { label: "Administrador", sections: ["dashboard", "productos", "categorias", "inventario", "movimientos", "pedidos", "configuracion"] },
  editor: { label: "Editor", sections: ["dashboard", "productos", "categorias", "pedidos"] },
  inventario: { label: "Inventario", sections: ["dashboard", "inventario", "movimientos"] },
};

const INITIAL_PRODUCTS = [
  { id: "p1", name: "Camiseta Royale", category: "Camisetas", price: 89900, featured: true, active: true, sku: "CR-BASE" },
  { id: "p2", name: "Hoodie Blackout", category: "Hoodies", price: 179900, featured: false, active: true, sku: "HB-001" },
  { id: "p3", name: "Chaqueta Night Rider", category: "Chaquetas", price: 349900, featured: true, active: true, sku: "CNR-LTD" },
  { id: "p4", name: "Gorra Crest Gold", category: "Gorras", price: 69900, featured: false, active: false, sku: "GCG-01" },
];

const INITIAL_CATEGORIES = [
  { id: "c1", name: "Camisetas", count: 12, visible: true },
  { id: "c2", name: "Hoodies", count: 6, visible: true },
  { id: "c3", name: "Chaquetas", count: 4, visible: true },
  { id: "c4", name: "Gorras", count: 5, visible: true },
  { id: "c5", name: "Ofertas", count: 3, visible: false },
];

const INITIAL_INVENTORY = [
  { id: "i1", product: "Camiseta Royale", variant: "Negro / S", sku: "CR-BASE-NG-S", stock: 3, min: 3 },
  { id: "i2", product: "Camiseta Royale", variant: "Negro / L", sku: "CR-BASE-NG-L", stock: 0, min: 3 },
  { id: "i3", product: "Hoodie Blackout", variant: "Negro / XXL", sku: "HB-001-NG-XXL", stock: 0, min: 3 },
  { id: "i4", product: "Hoodie Blackout", variant: "Gris / M", sku: "HB-001-GR-M", stock: 5, min: 3 },
  { id: "i5", product: "Chaqueta Night Rider", variant: "Negro / XL", sku: "CNR-LTD-NG-XL", stock: 0, min: 2 },
  { id: "i6", product: "Gorra Crest Gold", variant: "Blanco / Única", sku: "GCG-01-BL-U", stock: 0, min: 4 },
];

const INITIAL_MOVEMENTS = [
  { id: "m1", date: "2026-08-13 09:14", user: "yeisi.admin", product: "Camiseta Royale", variant: "Negro / M", type: "entrada", qty: 20, before: 0, after: 20, reason: "Compra proveedor" },
  { id: "m2", date: "2026-08-13 15:02", user: "yeisi.admin", product: "Camiseta Royale", variant: "Negro / M", type: "salida", qty: -2, before: 20, after: 18, reason: "Venta WhatsApp #104" },
  { id: "m3", date: "2026-08-14 08:40", user: "yeisi.inv", product: "Hoodie Blackout", variant: "Negro / XXL", type: "ajuste", qty: -1, before: 1, after: 0, reason: "Prenda dañada" },
];

const INITIAL_ORDERS = [
  { id: "1001", date: "2026-08-14", customer: "Cliente WhatsApp", items: 2, total: 269800, status: "Nuevo" },
  { id: "1000", date: "2026-08-13", customer: "Cliente WhatsApp", items: 1, total: 89900, status: "Confirmado" },
  { id: "0999", date: "2026-08-12", customer: "Cliente WhatsApp", items: 3, total: 449700, status: "Enviado" },
  { id: "0998", date: "2026-08-11", customer: "Cliente WhatsApp", items: 1, total: 179900, status: "Entregado" },
];

const ORDER_STATUSES = ["Nuevo", "Contactado", "Confirmado", "Preparando", "Enviado", "Entregado", "Cancelado"];

function money(n) {
  return "$" + n.toLocaleString("es-CO");
}

function stockBadge(stock, min) {
  if (stock <= 0) return { label: "AGOTADO", cls: "text-white/40 bg-white/5 border-white/10" };
  if (stock <= min) return { label: "STOCK BAJO", cls: "text-[#ff2340] bg-[#ff2340]/10 border-[#ff2340]/30" };
  return { label: "DISPONIBLE", cls: "text-[#cda45e] bg-[#cda45e]/10 border-[#cda45e]/30" };
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState("admin");
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  if (!authed) return <LoginScreen onLogin={(r) => { setRole(r); setAuthed(true); }} />;

  const sections = ROLES[role].sections;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f2f2f0] flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
        .glow-red { box-shadow: 0 0 0 1px rgba(255,35,64,0.3), 0 0 16px rgba(255,35,64,0.12); }
      `}</style>

      {/* SIDEBAR (desktop) */}
      <aside className="hidden md:flex flex-col w-56 border-r border-white/5 shrink-0">
        <SidebarContent role={role} section={section} setSection={setSection} sections={sections} onLogout={() => setAuthed(false)} />
      </aside>

      {/* MOBILE TOPBAR + DRAWER */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#050505] border-b border-white/5 flex items-center justify-between px-4 py-3">
        <button onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
        <span className="font-display text-sm tracking-widest">YEI-SI <span className="text-[#cda45e]">/ADMIN</span></span>
        <span className="text-[9px] text-white/40 border border-white/10 rounded-full px-2 py-0.5">{ROLES[role].label}</span>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70" onClick={() => setMenuOpen(false)}>
          <div className="w-64 h-full bg-[#050505] border-r border-white/10" onClick={(e) => e.stopPropagation()}>
            <SidebarContent
              role={role}
              section={section}
              setSection={(s) => { setSection(s); setMenuOpen(false); }}
              sections={sections}
              onLogout={() => setAuthed(false)}
            />
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 px-4 md:px-8 py-6 md:py-8 mt-12 md:mt-0 max-w-6xl">
        {section === "dashboard" && <Dashboard />}
        {section === "productos" && sections.includes("productos") && <Productos />}
        {section === "categorias" && sections.includes("categorias") && <Categorias />}
        {section === "inventario" && sections.includes("inventario") && <Inventario />}
        {section === "movimientos" && sections.includes("movimientos") && <Movimientos />}
        {section === "pedidos" && sections.includes("pedidos") && <Pedidos />}
        {section === "configuracion" && sections.includes("configuracion") && <Configuracion />}
      </main>
    </div>
  );
}

function SidebarContent({ role, section, setSection, sections, onLogout }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "productos", label: "Productos", icon: <Shirt size={16} /> },
    { id: "categorias", label: "Categorías", icon: <Layers size={16} /> },
    { id: "inventario", label: "Inventario", icon: <Boxes size={16} /> },
    { id: "movimientos", label: "Movimientos", icon: <ArrowLeftRight size={16} /> },
    { id: "pedidos", label: "Pedidos", icon: <ClipboardList size={16} /> },
    { id: "configuracion", label: "Configuración", icon: <Settings size={16} /> },
  ].filter((i) => sections.includes(i.id));

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="mb-8 px-2">
        <p className="font-display text-lg font-bold tracking-wider">YEI<span className="text-[#ff2340]">-</span>SI</p>
        <p className="text-[8px] tracking-[0.3em] text-[#cda45e]">ROYALE URBAN / ADMIN</p>
        <span className="inline-block mt-2 text-[9px] text-white/40 border border-white/10 rounded-full px-2 py-0.5">{ROLES[role].label}</span>
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => setSection(i.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
              section === i.id ? "bg-[#0d0d0d] text-[#ff2340] glow-red" : "text-white/60 hover:text-white/90"
            }`}
          >
            {i.icon} {i.label}
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/40 hover:text-white/70">
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!user || !pass) {
      setError("Ingresa usuario y contraseña.");
      return;
    }
    setError("");
    onLogin(role);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f2f2f0] flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
        .glow-red { box-shadow: 0 0 0 1px rgba(255,35,64,0.35), 0 0 22px rgba(255,35,64,0.18); }
      `}</style>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold tracking-wider">YEI<span className="text-[#ff2340]">-</span>SI</p>
          <p className="text-[9px] tracking-[0.35em] text-[#cda45e] mt-1">ROYALE URBAN</p>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 glow-red">
          <div className="flex items-center gap-2 mb-5 text-white/70">
            <Lock size={15} />
            <span className="text-xs tracking-widest">ACCESO PRIVADO</span>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Usuario"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#ff2340]/50"
            />
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#ff2340]/50"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none text-white/70"
            >
              <option value="admin">Rol: Administrador</option>
              <option value="editor">Rol: Editor</option>
              <option value="inventario">Rol: Inventario</option>
            </select>
            {error && <p className="text-[#ff2340] text-xs">{error}</p>}
            <button type="submit" className="w-full py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold mt-2">
              INICIAR SESIÓN
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-4">
          Demo de UI — la autenticación real se valida en backend (Supabase Auth + RLS por rol).
        </p>
      </div>
    </div>
  );
}

function Card({ label, value, delta, icon, danger }) {
  return (
    <div className={`bg-[#0d0d0d] border rounded-xl p-4 ${danger ? "border-[#ff2340]/30" : "border-white/5"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-widest text-white/40">{label}</span>
        <span className={danger ? "text-[#ff2340]" : "text-[#cda45e]"}>{icon}</span>
      </div>
      <p className="font-display text-2xl font-semibold mt-2">{value}</p>
      {delta && <p className="text-[10px] text-[#cda45e] mt-1">{delta}</p>}
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">DASHBOARD</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="PEDIDOS (7D)" value="24" delta="+12%" icon={<ClipboardList size={16} />} />
        <Card label="STOCK BAJO" value="3" icon={<AlertTriangle size={16} />} danger />
        <Card label="AGOTADOS" value="4" icon={<PackageX size={16} />} danger />
        <Card label="MÁS VENDIDO" value="Camiseta Royale" icon={<Star size={16} />} />
      </div>

      <div className="mt-6 bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 text-white/70 mb-3">
          <TrendingUp size={15} className="text-[#cda45e]" />
          <span className="text-xs tracking-widest">PEDIDOS PENDIENTES</span>
        </div>
        <div className="space-y-2">
          {INITIAL_ORDERS.filter((o) => o.status === "Nuevo" || o.status === "Confirmado").map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
              <span className="text-white/70">#{o.id} · {o.items} ítem(s)</span>
              <span className="text-[#cda45e] font-display">{money(o.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Productos() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [query, setQuery] = useState("");
  const list = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  function toggleActive(id) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">PRODUCTOS</h1>
        <button className="flex items-center gap-1.5 text-xs bg-[#f2f2f0] text-black font-semibold px-3 py-2 rounded-lg">
          <Plus size={14} /> Nuevo producto
        </button>
      </div>
      <div className="flex items-center gap-2 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 mb-4 max-w-sm">
        <Search size={14} className="text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." className="bg-transparent outline-none text-sm w-full" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[10px] text-white/40 tracking-widest border-b border-white/10">
              <th className="py-2 font-normal">PRODUCTO</th>
              <th className="font-normal">SKU</th>
              <th className="font-normal">CATEGORÍA</th>
              <th className="font-normal">PRECIO</th>
              <th className="font-normal">DESTACADO</th>
              <th className="font-normal">ESTADO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="py-3">{p.name}</td>
                <td className="text-white/50">{p.sku}</td>
                <td className="text-white/50">{p.category}</td>
                <td className="text-[#cda45e] font-display">{money(p.price)}</td>
                <td>{p.featured ? <span className="text-[#cda45e] text-xs">★</span> : <span className="text-white/20 text-xs">—</span>}</td>
                <td>
                  <button
                    onClick={() => toggleActive(p.id)}
                    className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${
                      p.active ? "text-[#cda45e] border-[#cda45e]/30" : "text-white/30 border-white/10"
                    }`}
                  >
                    {p.active ? "ACTIVO" : "OCULTO"}
                  </button>
                </td>
                <td className="text-right"><ChevronRight size={14} className="text-white/30" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Categorias() {
  const [cats, setCats] = useState(INITIAL_CATEGORIES);
  function toggleVisible(id) {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">CATEGORÍAS</h1>
        <button className="flex items-center gap-1.5 text-xs bg-[#f2f2f0] text-black font-semibold px-3 py-2 rounded-lg">
          <Plus size={14} /> Nueva categoría
        </button>
      </div>
      <div className="space-y-2">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-[#0d0d0d] border border-white/5 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-white/40">{c.count} productos</p>
            </div>
            <button
              onClick={() => toggleVisible(c.id)}
              className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${
                c.visible ? "text-[#cda45e] border-[#cda45e]/30" : "text-white/30 border-white/10"
              }`}
            >
              {c.visible ? "VISIBLE" : "OCULTA"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Inventario() {
  const [inv] = useState(INITIAL_INVENTORY);
  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">INVENTARIO</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-[10px] text-white/40 tracking-widest border-b border-white/10">
              <th className="py-2 font-normal">PRODUCTO</th>
              <th className="font-normal">VARIANTE</th>
              <th className="font-normal">SKU</th>
              <th className="font-normal">STOCK</th>
              <th className="font-normal">MÍNIMO</th>
              <th className="font-normal">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {inv.map((r) => {
              const badge = stockBadge(r.stock, r.min);
              return (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-3">{r.product}</td>
                  <td className="text-white/50">{r.variant}</td>
                  <td className="text-white/40">{r.sku}</td>
                  <td className="font-display">{r.stock}</td>
                  <td className="text-white/40">{r.min}</td>
                  <td>
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${badge.cls}`}>{badge.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-white/30 mt-4">Esta información nunca se expone en la tienda pública — el catálogo solo muestra el estado.</p>
    </div>
  );
}

function Movimientos() {
  const [moves, setMoves] = useState(INITIAL_MOVEMENTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product: "", variant: "", type: "entrada", qty: "", reason: "" });

  function submit(e) {
    e.preventDefault();
    if (!form.product || !form.qty) return;
    const qty = form.type === "entrada" ? Math.abs(Number(form.qty)) : -Math.abs(Number(form.qty));
    const before = 0; // en producción: leer stock real de la variante antes de aplicar
    const after = Math.max(0, before + qty);
    setMoves((prev) => [
      { id: `m${prev.length + 1}`, date: new Date().toISOString().slice(0, 16).replace("T", " "), user: "sesión actual", product: form.product, variant: form.variant, type: form.type, qty, before, after, reason: form.reason },
      ...prev,
    ]);
    setForm({ product: "", variant: "", type: "entrada", qty: "", reason: "" });
    setShowForm(false);
  }

  const typeColor = { entrada: "text-[#cda45e]", salida: "text-[#ff2340]", ajuste: "text-white/60" };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">MOVIMIENTOS (KARDEX)</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-xs bg-[#f2f2f0] text-black font-semibold px-3 py-2 rounded-lg">
          <Plus size={14} /> Registrar movimiento
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-[#0d0d0d] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-base font-semibold">NUEVO MOVIMIENTO</p>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input required value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Producto" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} placeholder="Variante (ej. Negro / M)" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </select>
              <input required type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Cantidad" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Motivo" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold">Registrar</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-[10px] text-white/40 tracking-widest border-b border-white/10">
              <th className="py-2 font-normal">FECHA</th>
              <th className="font-normal">USUARIO</th>
              <th className="font-normal">PRODUCTO</th>
              <th className="font-normal">VARIANTE</th>
              <th className="font-normal">TIPO</th>
              <th className="font-normal">CANT.</th>
              <th className="font-normal">ANTES → DESPUÉS</th>
              <th className="font-normal">MOTIVO</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id} className="border-b border-white/5">
                <td className="py-3 text-white/50 whitespace-nowrap">{m.date}</td>
                <td className="text-white/50">{m.user}</td>
                <td>{m.product}</td>
                <td className="text-white/50">{m.variant}</td>
                <td className={`uppercase text-xs font-semibold ${typeColor[m.type]}`}>{m.type}</td>
                <td className={typeColor[m.type]}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                <td className="text-white/50">{m.before} → {m.after}</td>
                <td className="text-white/40">{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pedidos() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  function updateStatus(id, status) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }
  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">PEDIDOS</h1>
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between bg-[#0d0d0d] border border-white/5 rounded-lg px-4 py-3 gap-3">
            <div>
              <p className="text-sm font-medium">#{o.id} · {o.date}</p>
              <p className="text-xs text-white/40">{o.items} ítem(s) · {o.customer}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#cda45e] font-display text-sm">{money(o.total)}</span>
              <select
                value={o.status}
                onChange={(e) => updateStatus(o.id, e.target.value)}
                className="bg-black/40 border border-white/10 rounded-full px-2.5 py-1 text-[10px] font-semibold outline-none"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Configuracion() {
  const [form, setForm] = useState({
    nombre: "YEI-SI ROYALE URBAN",
    eslogan: "Viste tu mejor versión",
    whatsapp: "+57 300 000 0000",
    instagram: "@yeisiroyaleurban",
    facebook: "",
    tiktok: "",
    mostrarAgotados: false,
    mostrarOfertas: true,
    mostrarNuevos: true,
  });

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-xl font-semibold mb-5">CONFIGURACIÓN</h1>

      <SectionBlock title="MARCA">
        <Field label="Nombre" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
        <Field label="Eslogan" value={form.eslogan} onChange={(v) => setForm({ ...form, eslogan: v })} />
      </SectionBlock>

      <SectionBlock title="WHATSAPP">
        <Field label="Número" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
      </SectionBlock>

      <SectionBlock title="REDES SOCIALES">
        <Field label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
        <Field label="Facebook" value={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} placeholder="Opcional" />
        <Field label="TikTok" value={form.tiktok} onChange={(v) => setForm({ ...form, tiktok: v })} placeholder="Opcional" />
      </SectionBlock>

      <SectionBlock title="CATÁLOGO">
        <Toggle label="Mostrar productos agotados" checked={form.mostrarAgotados} onChange={(v) => setForm({ ...form, mostrarAgotados: v })} />
        <Toggle label="Mostrar sección de ofertas" checked={form.mostrarOfertas} onChange={(v) => setForm({ ...form, mostrarOfertas: v })} />
        <Toggle label="Mostrar sección de nuevos" checked={form.mostrarNuevos} onChange={(v) => setForm({ ...form, mostrarNuevos: v })} />
      </SectionBlock>

      <button className="mt-2 px-5 py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold">Guardar cambios</button>
    </div>
  );
}

function SectionBlock({ title, children }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4 mb-4">
      <p className="text-[10px] tracking-widest text-white/40 mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-white/50 block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ff2340]/40"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center justify-between">
      <span className="text-xs text-white/70">{label}</span>
      <span className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${checked ? "bg-[#ff2340]" : "bg-white/10"}`}>
        <span className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

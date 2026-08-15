import React, { useState, useEffect } from "react";
import {
  Lock, LayoutDashboard, Shirt, Layers, Boxes, ArrowLeftRight, ClipboardList,
  Settings, LogOut, Plus, Search, AlertTriangle, PackageX, Star, Menu, Trash2, Pencil, Image as ImageIcon,
} from "lucide-react";
import {
  signIn, signOut, getCurrentSession,
  fetchAdminProducts, toggleProductActive,
  fetchAdminCategories, toggleCategoryVisible, createCategory, updateCategoryName, deleteCategory,
  fetchAdminPromotions, createPromotion, updatePromotion, togglePromotionActive, deletePromotion,
  fetchInventory, fetchMovements, registerMovement,
  fetchOrders, updateOrderStatus,
  fetchSettings, updateSettings, uploadImage,
} from "./lib/supabase";

function money(n) {
  return "$" + Number(n).toLocaleString("es-CO");
}
function stockBadge(stock, min) {
  if (stock <= 0) return { label: "AGOTADO", cls: "text-white/40 bg-white/5 border-white/10" };
  if (stock <= min) return { label: "STOCK BAJO", cls: "text-[#ff2340] bg-[#ff2340]/10 border-[#ff2340]/30" };
  return { label: "DISPONIBLE", cls: "text-[#cda45e] bg-[#cda45e]/10 border-[#cda45e]/30" };
}

const ORDER_STATUSES = ["Nuevo", "Contactado", "Confirmado", "Preparando", "Enviado", "Entregado", "Cancelado"];

export default function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getCurrentSession().then(setSession).catch(() => setSession(null));
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40 text-sm">Cargando…</div>;
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

  return (
    <div className="min-h-screen bg-[#050505] text-[#f2f2f0] flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
        .glow-red { box-shadow: 0 0 0 1px rgba(255,35,64,0.3), 0 0 16px rgba(255,35,64,0.12); }
      `}</style>

      <aside className="hidden md:flex flex-col w-56 border-r border-white/5 shrink-0">
        <SidebarContent role={role} section={section} setSection={setSection} sections={roleSections} onLogout={handleLogout} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#050505] border-b border-white/5 flex items-center justify-between px-4 py-3">
        <button onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
        <span className="font-display text-sm tracking-widest">ROYAL URBAN <span className="text-[#cda45e]">/ADMIN</span></span>
        <span className="text-[9px] text-white/40 border border-white/10 rounded-full px-2 py-0.5">{role}</span>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70" onClick={() => setMenuOpen(false)}>
          <div className="w-64 h-full bg-[#050505] border-r border-white/10" onClick={(e) => e.stopPropagation()}>
            <SidebarContent role={role} section={section} setSection={(s) => { setSection(s); setMenuOpen(false); }} sections={roleSections} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <main className="flex-1 px-4 md:px-8 py-6 md:py-8 mt-12 md:mt-0 max-w-6xl">
        {section === "dashboard" && <Dashboard />}
        {section === "productos" && roleSections.includes("productos") && <Productos />}
        {section === "categorias" && roleSections.includes("categorias") && <Categorias />}
        {section === "promociones" && roleSections.includes("promociones") && <Promociones />}
        {section === "inventario" && roleSections.includes("inventario") && <Inventario />}
        {section === "movimientos" && roleSections.includes("movimientos") && <Movimientos />}
        {section === "pedidos" && roleSections.includes("pedidos") && <Pedidos />}
        {section === "configuracion" && roleSections.includes("configuracion") && <Configuracion />}
      </main>
    </div>
  );
}

function SidebarContent({ role, section, setSection, sections, onLogout }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "productos", label: "Productos", icon: <Shirt size={16} /> },
    { id: "categorias", label: "Categorías", icon: <Layers size={16} /> },
    { id: "promociones", label: "Campañas", icon: <ImageIcon size={16} /> },
    { id: "inventario", label: "Inventario", icon: <Boxes size={16} /> },
    { id: "movimientos", label: "Movimientos", icon: <ArrowLeftRight size={16} /> },
    { id: "pedidos", label: "Pedidos", icon: <ClipboardList size={16} /> },
    { id: "configuracion", label: "Configuración", icon: <Settings size={16} /> },
  ].filter((i) => sections.includes(i.id));

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="mb-8 px-2">
        <p className="font-display text-lg font-bold tracking-wider">ROYAL<span className="text-[#ff2340]"> </span>URBAN</p>
        <p className="text-[8px] tracking-[0.3em] text-[#cda45e]">PANEL ADMIN</p>
        <span className="inline-block mt-2 text-[9px] text-white/40 border border-white/10 rounded-full px-2 py-0.5">{role}</span>
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((i) => (
          <button key={i.id} onClick={() => setSection(i.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${section === i.id ? "bg-[#0d0d0d] text-[#ff2340] glow-red" : "text-white/60 hover:text-white/90"}`}>
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
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
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
    <div className="min-h-screen bg-[#050505] text-[#f2f2f0] flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
        .glow-red { box-shadow: 0 0 0 1px rgba(255,35,64,0.35), 0 0 22px rgba(255,35,64,0.18); }
      `}</style>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold tracking-wider">ROYAL<span className="text-[#ff2340]"> </span>URBAN</p>
          <p className="text-[9px] tracking-[0.35em] text-[#cda45e] mt-1">MODA URBANA PREMIUM</p>
        </div>
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 glow-red">
          <div className="flex items-center gap-2 mb-5 text-white/70">
            <Lock size={15} /><span className="text-xs tracking-widest">ACCESO PRIVADO</span>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#ff2340]/50" />
            <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#ff2340]/50" />
            {error && <p className="text-[#ff2340] text-xs">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold mt-2 disabled:opacity-50">
              {loading ? "Ingresando..." : "INICIAR SESIÓN"}
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-4">
          Los usuarios y roles se crean en Supabase Auth + tabla user_profiles.
        </p>
      </div>
    </div>
  );
}

function Card({ label, value, icon, danger }) {
  return (
    <div className={`bg-[#0d0d0d] border rounded-xl p-4 ${danger ? "border-[#ff2340]/30" : "border-white/5"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-widest text-white/40">{label}</span>
        <span className={danger ? "text-[#ff2340]" : "text-[#cda45e]"}>{icon}</span>
      </div>
      <p className="font-display text-2xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchInventory()]).then(([orders, inv]) => {
      const pending = orders.filter((o) => ["Nuevo", "Confirmado"].includes(o.status));
      setStats({
        orders7d: orders.length,
        lowStock: inv.filter((i) => i.stock > 0 && i.stock <= i.min_stock).length,
        outOfStock: inv.filter((i) => i.stock <= 0).length,
        pending,
      });
    });
  }, []);

  if (!stats) return <p className="text-white/40 text-sm">Cargando…</p>;

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">DASHBOARD</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card label="PEDIDOS TOTALES" value={stats.orders7d} icon={<ClipboardList size={16} />} />
        <Card label="STOCK BAJO" value={stats.lowStock} icon={<AlertTriangle size={16} />} danger />
        <Card label="AGOTADOS" value={stats.outOfStock} icon={<PackageX size={16} />} danger />
      </div>
      <div className="mt-6 bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 text-white/70 mb-3">
          <Star size={15} className="text-[#cda45e]" /><span className="text-xs tracking-widest">PEDIDOS PENDIENTES</span>
        </div>
        <div className="space-y-2">
          {stats.pending.length === 0 && <p className="text-xs text-white/30">No hay pedidos pendientes.</p>}
          {stats.pending.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
              <span className="text-white/70">#{o.order_number} · {o.order_items?.length || 0} ítem(s)</span>
              <span className="text-[#cda45e] font-display">{money(o.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Productos() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdminProducts().then(setProducts).finally(() => setLoading(false)); }, []);

  async function toggle(id, active) {
    await toggleProductActive(id, !active);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: !active } : p)));
  }

  const list = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">PRODUCTOS</h1>
        <button className="flex items-center gap-1.5 text-xs bg-[#f2f2f0] text-black font-semibold px-3 py-2 rounded-lg opacity-60 cursor-not-allowed" title="Crear producto: pendiente de formulario completo">
          <Plus size={14} /> Nuevo producto
        </button>
      </div>
      <div className="flex items-center gap-2 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 mb-4 max-w-sm">
        <Search size={14} className="text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." className="bg-transparent outline-none text-sm w-full" />
      </div>
      {loading ? <p className="text-white/40 text-sm">Cargando…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[10px] text-white/40 tracking-widest border-b border-white/10">
                <th className="py-2 font-normal">PRODUCTO</th><th className="font-normal">SKU</th><th className="font-normal">CATEGORÍA</th>
                <th className="font-normal">PRECIO</th><th className="font-normal">DESTACADO</th><th className="font-normal">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3">{p.name}</td>
                  <td className="text-white/50">{p.sku_base}</td>
                  <td className="text-white/50">{p.categories?.name}</td>
                  <td className="text-[#cda45e] font-display">{money(p.price)}</td>
                  <td>{p.featured ? <span className="text-[#cda45e] text-xs">★</span> : <span className="text-white/20 text-xs">—</span>}</td>
                  <td>
                    <button onClick={() => toggle(p.id, p.active)} className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${p.active ? "text-[#cda45e] border-[#cda45e]/30" : "text-white/30 border-white/10"}`}>
                      {p.active ? "ACTIVO" : "OCULTO"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Categorias() {
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  function reload() { fetchAdminCategories().then(setCats); }
  useEffect(reload, []);

  async function toggle(id, visible) {
    await toggleCategoryVisible(id, !visible);
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !visible } : c)));
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    try {
      await createCategory(newName.trim());
      setNewName("");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    try {
      await updateCategoryName(id, editName.trim());
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("¿Eliminar esta categoría? Los productos que la usan quedarán sin categoría.")) return;
    try {
      await deleteCategory(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">CATEGORÍAS</h1>

      <form onSubmit={addCategory} className="flex gap-2 mb-4 max-w-md">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la nueva categoría" className="flex-1 bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ff2340]/40" />
        <button type="submit" className="flex items-center gap-1.5 text-xs bg-[#f2f2f0] text-black font-semibold px-3 py-2 rounded-lg shrink-0">
          <Plus size={14} /> Crear
        </button>
      </form>
      {error && <p className="text-[#ff2340] text-xs mb-3">{error}</p>}

      <div className="space-y-2">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-[#0d0d0d] border border-white/5 rounded-lg px-4 py-3 gap-2">
            {editingId === c.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                onBlur={() => saveEdit(c.id)}
                className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-sm outline-none"
              />
            ) : (
              <p className="text-sm font-medium">{c.name}</p>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggle(c.id, c.visible)} className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${c.visible ? "text-[#cda45e] border-[#cda45e]/30" : "text-white/30 border-white/10"}`}>
                {c.visible ? "VISIBLE" : "OCULTA"}
              </button>
              <button onClick={() => startEdit(c)} className="text-white/40 hover:text-white/80 p-1"><Pencil size={14} /></button>
              <button onClick={() => remove(c.id)} className="text-white/40 hover:text-[#ff2340] p-1"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {cats.length === 0 && <p className="text-white/40 text-sm">No hay categorías todavía.</p>}
      </div>
    </div>
  );
}

function Promociones() {
  const [promos, setPromos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = crear, objeto = editar
  const [form, setForm] = useState({ title: "", description: "", image_url: "", cta_label: "" });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function reload() { fetchAdminPromotions().then(setPromos); }
  useEffect(reload, []);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", description: "", image_url: "", cta_label: "" });
    setShowForm(true);
  }
  function openEdit(p) {
    setEditing(p);
    setForm({ title: p.title, description: p.description || "", image_url: p.image_url || "", cta_label: p.cta_label || "" });
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) await updatePromotion(editing.id, form);
      else await createPromotion(form);
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err.message);
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
    await togglePromotionActive(id, !active);
    reload();
  }

  async function remove(id) {
    if (!confirm("¿Eliminar esta tarjeta de campaña?")) return;
    await deletePromotion(id);
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-semibold">CAMPAÑAS</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 text-xs bg-[#f2f2f0] text-black font-semibold px-3 py-2 rounded-lg">
          <Plus size={14} /> Nueva tarjeta
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-[#0d0d0d] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5">
            <p className="font-display text-base font-semibold mb-4">{editing ? "EDITAR TARJETA" : "NUEVA TARJETA"}</p>
            <div className="space-y-3">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título (ej. COLECCIÓN NOCTURNA)" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />

              <div>
                {form.image_url && (
                  <img src={form.image_url} alt="Vista previa" className="w-full h-24 object-cover rounded-lg border border-white/10 mb-2" />
                )}
                <label className="inline-flex items-center gap-2 text-xs bg-black/40 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:border-[#ff2340]/40 w-fit">
                  <ImageIcon size={14} />
                  {uploading ? "Subiendo…" : "Subir imagen"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>

              <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Texto del botón (ej. Ver colección)" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              {error && <p className="text-[#ff2340] text-xs">{error}</p>}
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold">{editing ? "Guardar cambios" : "Crear tarjeta"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {promos.map((p) => (
          <div key={p.id} className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-white/40 mt-1">{p.description}</p>
                {p.cta_label && <p className="text-[10px] text-[#cda45e] mt-2 underline underline-offset-2">{p.cta_label}</p>}
              </div>
              <button onClick={() => toggle(p.id, p.active)} className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${p.active ? "text-[#cda45e] border-[#cda45e]/30" : "text-white/30 border-white/10"}`}>
                {p.active ? "ACTIVA" : "OCULTA"}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
              <button onClick={() => openEdit(p)} className="text-xs text-white/50 hover:text-white/90 flex items-center gap-1"><Pencil size={12} /> Editar</button>
              <button onClick={() => remove(p.id)} className="text-xs text-white/50 hover:text-[#ff2340] flex items-center gap-1"><Trash2 size={12} /> Eliminar</button>
            </div>
          </div>
        ))}
        {promos.length === 0 && <p className="text-white/40 text-sm">No hay tarjetas de campaña todavía.</p>}
      </div>
    </div>
  );
}

function Inventario() {
  const [inv, setInv] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchInventory().then(setInv).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">INVENTARIO</h1>
      {loading ? <p className="text-white/40 text-sm">Cargando…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[10px] text-white/40 tracking-widest border-b border-white/10">
                <th className="py-2 font-normal">PRODUCTO</th><th className="font-normal">VARIANTE</th><th className="font-normal">SKU</th>
                <th className="font-normal">STOCK</th><th className="font-normal">MÍNIMO</th><th className="font-normal">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {inv.map((r) => {
                const badge = stockBadge(r.stock, r.min_stock);
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-3">{r.products?.name}</td>
                    <td className="text-white/50">{r.colors?.name} / {r.sizes?.name}</td>
                    <td className="text-white/40">{r.sku}</td>
                    <td className="font-display">{r.stock}</td>
                    <td className="text-white/40">{r.min_stock}</td>
                    <td><span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${badge.cls}`}>{badge.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-white/30 mt-4">Esta información nunca se expone en la tienda pública.</p>
    </div>
  );
}

function Movimientos() {
  const [moves, setMoves] = useState([]);
  const [inv, setInv] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ variantId: "", type: "entrada", qty: "", reason: "" });
  const [error, setError] = useState("");

  function reload() {
    fetchMovements().then(setMoves);
    fetchInventory().then(setInv);
  }
  useEffect(reload, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.variantId || !form.qty) return;
    try {
      await registerMovement({ variantId: form.variantId, type: form.type, qty: Number(form.qty), reason: form.reason });
      setForm({ variantId: "", type: "entrada", qty: "", reason: "" });
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err.message);
    }
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
            <p className="font-display text-base font-semibold mb-4">NUEVO MOVIMIENTO</p>
            <div className="space-y-3">
              <select required value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">Selecciona variante…</option>
                {inv.map((v) => (
                  <option key={v.id} value={v.id}>{v.products?.name} — {v.colors?.name}/{v.sizes?.name} (stock {v.stock})</option>
                ))}
              </select>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste</option>
              </select>
              <input required type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Cantidad" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Motivo" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              {error && <p className="text-[#ff2340] text-xs">{error}</p>}
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold">Registrar</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-[10px] text-white/40 tracking-widest border-b border-white/10">
              <th className="py-2 font-normal">FECHA</th><th className="font-normal">PRODUCTO</th><th className="font-normal">VARIANTE</th>
              <th className="font-normal">TIPO</th><th className="font-normal">CANT.</th><th className="font-normal">ANTES → DESPUÉS</th><th className="font-normal">MOTIVO</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id} className="border-b border-white/5">
                <td className="py-3 text-white/50 whitespace-nowrap">{new Date(m.created_at).toLocaleString("es-CO")}</td>
                <td>{m.product_variants?.products?.name}</td>
                <td className="text-white/50">{m.product_variants?.colors?.name}/{m.product_variants?.sizes?.name}</td>
                <td className={`uppercase text-xs font-semibold ${typeColor[m.type]}`}>{m.type}</td>
                <td className={typeColor[m.type]}>{m.stock_after - m.stock_before > 0 ? "+" : ""}{m.stock_after - m.stock_before}</td>
                <td className="text-white/50">{m.stock_before} → {m.stock_after}</td>
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
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  function reload() { fetchOrders().then(setOrders); }
  useEffect(reload, []);

  async function changeStatus(order, status) {
    setBusy(order.id);
    setError("");
    try {
      await updateOrderStatus(order.id, status, order.order_items);
      reload();
    } catch (err) {
      setError(`Pedido #${order.order_number}: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-5">PEDIDOS</h1>
      {error && <p className="text-[#ff2340] text-xs mb-3">{error}</p>}
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between bg-[#0d0d0d] border border-white/5 rounded-lg px-4 py-3 gap-3">
            <div>
              <p className="text-sm font-medium">#{o.order_number} · {new Date(o.created_at).toLocaleDateString("es-CO")}</p>
              <p className="text-xs text-white/40">{o.order_items?.length || 0} ítem(s)</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#cda45e] font-display text-sm">{money(o.total)}</span>
              <select disabled={busy === o.id} value={o.status} onChange={(e) => changeStatus(o, e.target.value)} className="bg-black/40 border border-white/10 rounded-full px-2.5 py-1 text-[10px] font-semibold outline-none">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-white/40 text-sm">No hay pedidos todavía.</p>}
      </div>
    </div>
  );
}

function Configuracion() {
  const [settings, setSettingsState] = useState(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => { fetchSettings().then(setSettingsState); }, []);

  if (!settings) return <p className="text-white/40 text-sm">Cargando…</p>;

  async function save() {
    await Promise.all([
      updateSettings("brand", settings.brand),
      updateSettings("whatsapp", settings.whatsapp),
      updateSettings("social", settings.social),
      updateSettings("catalog_flags", settings.catalog_flags),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <div className="max-w-xl">
      <h1 className="font-display text-xl font-semibold mb-5">CONFIGURACIÓN</h1>

      <SectionBlock title="MARCA">
        <Field label="Nombre" value={settings.brand?.name || ""} onChange={(v) => set("brand", "name", v)} />
        <Field label="Eslogan" value={settings.brand?.slogan || ""} onChange={(v) => set("brand", "slogan", v)} />

        <div>
          <label className="text-xs text-white/50 block mb-1">Imagen de portada</label>
          {settings.brand?.hero_image && (
            <img src={settings.brand.hero_image} alt="Vista previa de portada" className="w-full h-32 object-cover rounded-lg border border-white/10 mb-2" />
          )}
          <label className="inline-flex items-center gap-2 text-xs bg-black/40 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:border-[#ff2340]/40 w-fit">
            <ImageIcon size={14} />
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploading} />
          </label>
          {uploadError && <p className="text-[#ff2340] text-xs mt-1">{uploadError}</p>}
          <p className="text-[10px] text-white/30 mt-1">Tamaño ideal: 1600×900px, menos de 300KB.</p>
        </div>
      </SectionBlock>

      <SectionBlock title="WHATSAPP">
        <Field label="Número" value={settings.whatsapp?.number || ""} onChange={(v) => set("whatsapp", "number", v)} />
      </SectionBlock>

      <SectionBlock title="REDES SOCIALES">
        <Field label="Instagram" value={settings.social?.instagram || ""} onChange={(v) => set("social", "instagram", v)} />
        <Field label="Facebook" value={settings.social?.facebook || ""} onChange={(v) => set("social", "facebook", v)} placeholder="Opcional" />
        <Field label="TikTok" value={settings.social?.tiktok || ""} onChange={(v) => set("social", "tiktok", v)} placeholder="Opcional" />
      </SectionBlock>

      <SectionBlock title="CATÁLOGO">
        <Toggle label="Mostrar productos agotados" checked={!!settings.catalog_flags?.show_out_of_stock} onChange={(v) => set("catalog_flags", "show_out_of_stock", v)} />
        <Toggle label="Mostrar sección de ofertas" checked={!!settings.catalog_flags?.show_offers} onChange={(v) => set("catalog_flags", "show_offers", v)} />
        <Toggle label="Mostrar sección de nuevos" checked={!!settings.catalog_flags?.show_new} onChange={(v) => set("catalog_flags", "show_new", v)} />
      </SectionBlock>

      <button onClick={save} className="mt-2 px-5 py-2.5 rounded-lg bg-[#f2f2f0] text-black text-sm font-semibold">
        {saved ? "Guardado ✓" : "Guardar cambios"}
      </button>
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
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ff2340]/40" />
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

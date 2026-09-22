import React, { useEffect } from "react";
import { Crown, X, CheckCircle2, AlertCircle, Info } from "lucide-react";

/* ============================================================
   ROYAL URBAN 2026 — Componentes base reutilizables
   Solo presentación: no contienen lógica de negocio ni de datos.
   ============================================================ */

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function money(n) {
  return "$" + Number(n || 0).toLocaleString("es-CO");
}

/* ---------- Marca ---------- */
export function BrandMark({ size = "md", tagline = false, className = "", crownClass = "text-neon" }) {
  const s = {
    sm: { crown: 16, text: "text-[13px]", tag: "text-[7px]" },
    md: { crown: 20, text: "text-[15px]", tag: "text-[8px]" },
    lg: { crown: 44, text: "text-2xl", tag: "text-[10px]" },
  }[size];
  const stacked = size === "lg";
  return (
    <span className={cx("inline-flex items-center", stacked ? "flex-col gap-3" : "gap-2", className)}>
      <Crown size={s.crown} strokeWidth={stacked ? 1.5 : 2} className={crownClass} aria-hidden="true" />
      <span className="flex flex-col items-center leading-none">
        <span className={cx("wordmark text-ink", s.text)}>
          Royal <span className="font-light">Urban</span>
        </span>
        {tagline && (
          <span className={cx("mt-2 flex items-center gap-2 text-gold/90 uppercase tracking-[0.35em]", s.tag)}>
            <span className="h-px w-5 bg-gold/50" /> Streetwear &amp; Lifestyle <span className="h-px w-5 bg-gold/50" />
          </span>
        )}
      </span>
    </span>
  );
}

/* ---------- Botones ---------- */
const BTN_VARIANT = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
  whatsapp: "btn-whatsapp",
};

export function Button({ variant = "primary", size, loading, icon, children, className = "", disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx("btn", BTN_VARIANT[variant], size === "sm" && "btn-sm", size === "lg" && "btn-lg", className)}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, glass, children, className = "", ...props }) {
  return (
    <button {...props} aria-label={label} title={label} className={cx(glass ? "icon-btn-glass" : "icon-btn", className)}>
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */
// Clases literales (no interpoladas) para que Tailwind no las purgue.
export const BADGE_TONE = {
  neutral: "badge-neutral",
  gold: "badge-gold",
  red: "badge-red",
  success: "badge-success",
  warning: "badge-warning",
};
export function Badge({ tone = "neutral", dot, children, className = "" }) {
  return <span className={cx(BADGE_TONE[tone] || BADGE_TONE.neutral, dot && "badge-dot", className)}>{children}</span>;
}

/* ---------- Superficies ---------- */
export function Surface({ as: Tag = "div", elevated, className = "", children, ...props }) {
  return (
    <Tag {...props} className={cx(elevated ? "surface-elevated" : "surface", className)}>
      {children}
    </Tag>
  );
}

/* ---------- Formularios ---------- */
export function Field({ label, htmlFor, help, error, children, className = "" }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="error-text">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className = "", invalid, ...props }, ref) {
  return <input ref={ref} {...props} className={cx("input", invalid && "input-invalid", className)} />;
});

export function Select({ className = "", children, ...props }) {
  return (
    <select {...props} className={cx("input appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center] bg-[length:14px]", className)} style={{ backgroundImage: CHEVRON }}>
      {children}
    </select>
  );
}
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a3a3ac' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 py-2 text-left rounded-control disabled:opacity-40"
    >
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="block text-xs text-faint mt-0.5">{description}</span>}
      </span>
      <span className={cx("w-10 h-6 rounded-full flex items-center px-0.5 shrink-0 transition-colors duration-fast", checked ? "bg-neon" : "bg-line")}>
        <span className={cx("w-5 h-5 rounded-full bg-white shadow transition-transform duration-fast", checked && "translate-x-4")} />
      </span>
    </button>
  );
}

/* ---------- Encabezados ---------- */
export function SectionHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={cx("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-faint mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Estados ---------- */
export function Skeleton({ className = "" }) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={cx("flex flex-col items-center text-center px-6 py-12", className)}>
      {icon && <div className="w-14 h-14 rounded-full bg-elevated border border-line flex items-center justify-center text-muted mb-4">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="text-xs text-faint mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "error", children, className = "" }) {
  const map = {
    error: { cls: "border-neon/30 bg-neon/[0.08] text-[#ff7a8a]", Icon: AlertCircle },
    success: { cls: "border-success/30 bg-success/[0.08] text-success", Icon: CheckCircle2 },
    info: { cls: "border-line bg-elevated text-muted", Icon: Info },
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-xs leading-relaxed", map.cls, className)}>
      <map.Icon size={15} className="shrink-0 mt-px" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ---------- Toast ---------- */
export function Toast({ toast, onClose, className = "" }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.duration || 2600);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const Icon = toast.tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={cx("fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm", className)} role="status" aria-live="polite">
      <div key={toast.id} className="toast">
        <Icon size={18} className={toast.tone === "error" ? "text-neon shrink-0" : "text-success shrink-0"} />
        <p className="flex-1 min-w-0 text-ink">{toast.message}</p>
        {toast.action && (
          <button onClick={() => { toast.action.onClick(); onClose(); }} className="text-xs font-semibold text-ink underline underline-offset-4 decoration-neon/70 shrink-0">
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Sheet / Modal ---------- */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: "md:max-w-sm", md: "md:max-w-lg", lg: "md:max-w-2xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("sheet relative flex flex-col max-h-[92vh]", width)}>
        <div className="md:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 px-5 pt-4 md:pt-5 pb-3">
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            {subtitle && <p className="text-xs text-faint mt-0.5">{subtitle}</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="-mr-2 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        <div className="px-5 pb-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

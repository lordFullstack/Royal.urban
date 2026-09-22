/** @type {import('tailwindcss').Config} */
// ROYAL URBAN 2026 — tokens de diseño.
// Los valores viven como variables CSS en src/index.css (:root) para que
// Tailwind, los componentes y la pantalla de bienvenida compartan la misma fuente.
const token = (name) => `rgb(var(--ru-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./admin/index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Superficies
        bg: token("bg"),
        surface: token("surface"),
        elevated: token("elevated"),
        line: token("line"),
        // Texto
        ink: token("ink"),
        muted: token("muted"),
        faint: token("faint"),
        // Marca y estados
        neon: token("red"),
        gold: token("gold"),
        success: token("success"),
        warning: token("warning"),
        danger: token("red"),
        whatsapp: token("whatsapp"),
        // Alias heredados (compatibilidad con clases existentes)
        base: token("bg"),
        card: token("surface"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Oswald", "Inter", "sans-serif"],
      },
      borderRadius: {
        control: "12px",
        card: "16px",
        sheet: "24px",
      },
      boxShadow: {
        soft: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 32px -16px rgb(0 0 0 / 0.8)",
        lift: "0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 24px 48px -20px rgb(0 0 0 / 0.9)",
        "brand-glow": "0 0 0 1px rgb(var(--ru-red) / 0.35), 0 8px 28px -8px rgb(var(--ru-red) / 0.45)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "sheet-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        progress: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-in": "fade-in 200ms ease-out both",
        "sheet-up": "sheet-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "slide-in": "slide-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        progress: "progress 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

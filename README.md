# YEI-SI ROYALE URBAN

Catálogo digital + WhatsApp + inventario + panel admin.

## Estructura

```
index.html            → tienda pública (/)
admin/index.html       → panel admin (/admin)
src/StoreApp.jsx        → UI pública (Fase 2)
src/AdminApp.jsx        → UI admin (Fase 3)
src/lib/supabase.js     → integración Supabase + WhatsApp (Fase 5)
.github/workflows/      → deploy automático a GitHub Pages
```

## Desarrollo local

1. `npm install`
2. Crea `.env.local` en la raíz (NO se sube a git, ya está en `.gitignore`):
   ```
   VITE_SUPABASE_URL=https://xfsyvkfuyozzjcvavcea.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_PtM5gPbK3RhpL9PjWeT5kQ_jjMUrKNZ
   ```
3. `npm run dev` → tienda en `http://localhost:5173`, admin en `http://localhost:5173/admin/`

## Conectar los datos reales (pendiente, Fase 6)

`StoreApp.jsx` y `AdminApp.jsx` todavía usan datos mock (`PRODUCTS`, `INITIAL_ORDERS`, etc.).
Hay que reemplazarlos por las funciones de `src/lib/supabase.js`
(`fetchPublicProducts`, `fetchVariantStatus`, `openWhatsappCheckout`,
`confirmOrderAndDiscountStock`, etc. — el mapeo exacto está comentado
al final de ese archivo).

## Deploy

1. Sube este proyecto a un repo de GitHub.
2. En `Settings → Pages`, fuente: **GitHub Actions**.
3. En `Settings → Secrets and variables → Actions`, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push a `main` → el workflow builda y publica solo.
5. Queda en `https://<tu-usuario>.github.io/<nombre-del-repo>/` y el
   admin en `https://<tu-usuario>.github.io/<nombre-del-repo>/admin/`.

## Base de datos

Proyecto Supabase: `yeisi-royale-urban` (`sa-east-1`).
Esquema completo, RLS y datos de ejemplo ya aplicados — ver
`yeisi-royale-urban-schema.sql` para el detalle y el snippet de
`TRUNCATE` para borrar el catálogo demo cuando cargues productos reales.

# YEI-SI ROYALE URBAN

Catálogo digital + WhatsApp + inventario + panel admin.

## Estructura

```
index.html            → tienda pública (/)
admin/index.html       → panel admin (/admin)
src/StoreApp.jsx        → UI pública
src/AdminApp.jsx        → UI admin
src/lib/supabase.js     → integración Supabase + WhatsApp
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

## Datos

`StoreApp.jsx` y `AdminApp.jsx` leen y escriben en Supabase a través de
`src/lib/supabase.js` (catálogo, promociones, ajustes, pedidos, auth del admin).

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
Esquema, RLS y datos de ejemplo ya aplicados en el proyecto (se gestionan desde Supabase).

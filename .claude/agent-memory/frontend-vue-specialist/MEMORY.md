# Project: Interview Prep Mindmap

## Project Overview
Vite + Vue 3 static site at `/mnt/c/workspace/interview/`.
Rebuilt from a plain vanilla `index.html` into a proper component-based app.

## Key File Paths
- `/mnt/c/workspace/interview/src/data.js` — single source of truth for all 8 categories / 37 problems
- `/mnt/c/workspace/interview/src/App.vue` — root, owns view state (`map` | `category`)
- `/mnt/c/workspace/interview/src/components/MindmapView.vue` — SVG radial mindmap
- `/mnt/c/workspace/interview/src/components/CategoryView.vue` — problem list with cards
- `/mnt/c/workspace/interview/src/components/GlobalChip.vue` — fixed bottom-right progress chip
- `/mnt/c/workspace/interview/mindmap.md` — source of truth for problem list (do not modify)

## Architecture Decisions
- No Vue Router — two-view SPA managed by a single `activeView` ref in App.vue
- `<Transition name="fade" mode="out-in">` handles map ↔ category transitions
- All problem data is static (no backend); 5 Sliding Window problems pre-marked `done: true`
- `TOTAL_DONE` / `TOTAL_PROBS` are computed constants exported from `data.js`

## Build
- `npm run build` → `dist/` (fully static, deploy to Vercel / any static host as-is)
- No SPA rewrite rules needed since there is no URL-based routing

## Design Tokens
- Background: `#0d1117`
- Surface: `#161b22`
- Border: `#21262d` / `#30363d`
- Text primary: `#e6edf3`, secondary: `#8b949e`
- Green (done): `#3fb950`
- Each category has its own accent color — defined in `data.js` per-category `color` field

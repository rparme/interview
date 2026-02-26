# Nerdy UX Designer — Project Memory

## Project Identity
- Vue 3 + Vite SPA, dark GitHub-inspired theme
- No TypeScript. Scoped CSS per component.
- Monospace: 'Fira Code', 'SF Mono', 'Cascadia Code' stack throughout
- Background hierarchy: #0d1117 (deepest) → #161b22 (panels/headers) → #21262d (borders/chips)
- Primary text: #e6edf3 / #c9d1d9 / #8b949e / #6e7681 / #484f58 / #3d444d (6-stop muted scale)

## Established Color Semantics
- #58a6ff — primary blue (active tab underline, hover accents, links)
- #3fb950 — success / done state (test pass dot, done-toggle fill)
- #f85149 — error / fail (has-error text, fail dot, error borders)
- #a371f7 — AI generation / purple (GeneratorBar, AI-select chip, star icon)
- #e5c07b — complexity analysis / amber (analysis button, metric values, tab dot)
- category.color — dynamic, used for Run button tint and progress fill only

## Component Patterns

### Tab bar (OutputPane)
- 28px height, background #161b22, border-bottom 1px #21262d
- .out-tab: Fira Code 0.7rem, color #6e7681 inactive
- .out-tab-active: background #0d1117, color #e6edf3, border-bottom 2px #58a6ff
- Status dot: 6px circle — #3fb950 pass, #f85149 fail, #484f58 default, #e5c07b complexity
- Complexity tab uses pulsing amber dot (not spinner-on-dot) during analysis

### Toolbar buttons (CategoryView editor-toolbar)
- .run-btn base: border 1px #30363d, color #6e7681, border-radius 6px, 0.75rem 600 weight
- Run button: tinted with category.color when ready (dynamic :style)
- Analyze button (.analyze-btn): FIXED amber #e5c07b tint — never uses category.color
  - Monospace font-family, lowercase label ("analyze"), ∑ glyph
  - Unsubscribed state shows ⌁ glyph (not-connected symbol)
  - .is-analyzing: cursor:wait, amber at 50% opacity

### Complexity result display
- .complexity-metrics: flex row, #161b22 bg, 1px #21262d separator between TIME and SPACE cells
- Each cell: label (0.58rem uppercase #484f58 above) + value (0.92rem #e5c07b Fira Code)
- Explanation: .output-content with 2px left border #21262d, margin-left 1rem (visual quote block)

### Error states
- Complexity error: flex row with ✕ glyph (#f85149) + pre block inside bordered panel
  background: rgba(248,81,73,0.06), border: 1px rgba(248,81,73,0.18), border-radius 4px

### Loading states
- Center-aligned in full area (flex-direction: column, justify-content: center)
- Spinner: 18px ring, 1.5px border, #21262d track, accent top-color, 0.75s linear
- Label text: 0.72rem, letter-spacing 0.08em, color #484f58 (deliberately dim)

## Design Principles Applied
- Amber (#e5c07b) = "thinking / mathematical analysis" — reserved for complexity only
- Purple (#a371f7) = "AI generation" — reserved for GeneratorBar / AI context selection
- Never mix dynamic category.color into fixed-function UI (analyze btn stays amber always)
- Tab-level error signal: dot color changes to red even when tab is inactive
- Two spinners in the same feature = redundant. Pulse animation on dot only; full spinner in content area.
- inline style="" for layout tweaks = code smell; always use dedicated CSS classes

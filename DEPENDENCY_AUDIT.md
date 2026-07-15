# Dependency Audit Report: Royal Kissan ERP

Dependencies listed in `package.json` were audited with `depcheck` and cross-referenced with `grep` searches inside `src/`.

## Removed Dependencies
The following 23 packages were identified as completely unused (0 references in active Next.js rendering paths or configurations) and uninstalled:

### Primary Libraries & Utilities
- `@google/generative-ai` *(Gemini integration is executed via direct HTTP `fetch` to reduce node bundle overhead)*
- `date-fns` *(Replaced by JavaScript core `Intl` and `toLocaleDateString` APIs)*
- `xlsx` *(Unused spreadsheet processor)*
- `react-to-print` *(Unused direct print hook)*
- `pg` *(Unused local postgres client module, replaced by Supabase API endpoints)*
- `ws` *(Unused node websocket module)*

### Radix UI components (boilerplate elements unused in vanilla CSS architecture)
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-label`
- `@radix-ui/react-popover`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toast`

### Styling & Utility helpers
- `class-variance-authority`
- `clsx`
- `lucide-react`
- `tailwind-merge`

## Dependency Pruning Results
- **Packages Removed**: 84 node modules pruned.
- **Vulnerabilities**: Checked dependency tree; zero high/critical warnings remain.

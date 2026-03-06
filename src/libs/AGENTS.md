# src/libs KNOWLEDGE BASE

**Generated:** 2026-03-06
**Purpose:** Shared libraries and reusable components

---

## OVERVIEW

Shared utilities and Svelte components used across the plugin.

---

## STRUCTURE

```
src/libs/
├── components/          # Shared Svelte components
│   └── Form/           # Form builder components
│       ├── Form.svelte
│       ├── FormItem.svelte
│       └── types.ts
├── const.ts            # Constants
├── dialog.ts           # Dialog utilities
├── index.d.ts          # Type declarations
├── promise-pool.ts     # Async concurrency limiter
└── setting-utils.ts    # Settings management utilities
```

---

## KEY MODULES

### setting-utils.ts
Settings configuration management:
- `SettingUtils` class for plugin settings UI
- Integrates with SiYuan's settings panel
- Type-safe settings definitions

### promise-pool.ts
Concurrency control for async operations:
- Limits parallel operations
- Queue management
- Error handling

### dialog.ts
Dialog helper utilities:
- Common dialog patterns
- Button configurations
- Event handling

---

## COMPONENTS

### Form/ Components
Reusable form builder for settings and dialogs:
- `Form.svelte` — Main container
- `FormItem.svelte` — Form field wrapper
- `types.ts` — TypeScript definitions

---

## CONVENTIONS

- Libraries should be framework-agnostic where possible
- Reusable across multiple plugin features
- Minimal dependencies on plugin-specific code

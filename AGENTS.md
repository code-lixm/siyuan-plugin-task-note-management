# PROJECT KNOWLEDGE BASE

**Project:** siyuan-plugin-task-daily
**Type:** SiYuan Notes Plugin (Task Management)
**Tech Stack:** TypeScript, Svelte, Vite, FullCalendar, Milkdown

---

## COMMANDS

```bash
# Development (auto-copies to SiYuan plugins dir)
npm run dev

# Production build
npm run build

# Build + install to SiYuan
npm run make-install

# Create dev symlink to SiYuan
npm run make-link

# Update version
npm run update-version
```

**No test framework configured** — manual testing only.

---

## CODE STYLE

### TypeScript Configuration
- Target: ESNext, Module: ESNext
- Strict mode: OFF (`"strict": false`)
- Unused locals: ERROR (`"noUnusedLocals": true`)
- Path alias: `@/` → `src/`
- Allow JS: Yes, with type checking

### Naming Conventions
- Classes: PascalCase (`ReminderDialog`, `ProjectPanel`)
- Functions/Methods: camelCase (`loadSettings`, `createDocWithMd`)
- Constants: UPPER_SNAKE_CASE (`STORAGE_NAME`, `TAB_TYPE`)
- Private members: prefix with underscore or use `private` modifier
- Translation keys: camelCase, descriptive

### Imports
```typescript
// SiYuan API first
import { Plugin, showMessage, Dialog } from "siyuan";

// Project imports with @/ alias
import { i18n } from "@/pluginInstance";
import { CategoryManager } from "@/utils/categoryManager";

// Relative imports for same directory
import { QuickReminderDialog } from "./QuickReminderDialog";
```

### File Headers (Recommended)
```typescript
/*
 * Copyright (c) 2024 by [author]. All Rights Reserved.
 * @Author       : [author]
 * @Date         : [date]
 * @FilePath     : /path/to/file
 * @Description  : [description]
 */
```

---

## ARCHITECTURE

### Component Patterns

**TypeScript Class Pattern (Preferred for most components):**
```typescript
export class ComponentName {
    private element: HTMLElement;
    private dialog: Dialog;

    constructor() {
        this.element = document.createElement('div');
        // Build DOM with document.createElement()
    }

    public show(): void {
        this.dialog = new Dialog({ content: this.element });
    }

    public destroy(): void {
        this.dialog?.destroy();
    }
}
```

**Svelte Pattern (for complex forms only):**
- Use `<script lang="ts">` for TypeScript
- Use `$:` for reactive declarations
- Lifecycle: `onMount`, `onDestroy`

**Svelte files:** SettingPanel.svelte, LoadingDialog.svelte, FilterManagement.svelte, Form components, HelpPanel.svelte, icsSubscriptionPanel.svelte

### Manager Pattern (Singleton)
```typescript
export class DataManager {
    private static instance: DataManager;
    private cache: Data[] = [];

    public static getInstance(plugin?: any): DataManager {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager(plugin);
        }
        return DataManager.instance;
    }

    public async load(): Promise<void> {
        const data = await plugin.loadData('data.json');
        this.cache = data || [];
    }

    public async save(): Promise<void> {
        await plugin.saveData('data.json', this.cache);
    }
}
```

---

## DATA STORAGE

All persistence via SiYuan API (`plugin.loadData()` / `saveData()`):
- `reminder.json` — Reminder items
- `project.json` — Project data
- `habit.json` — Habit tracking
- `pomodoro_record.json` — Pomodoro sessions
- `reminder-settings.json` — Plugin settings
- `categories.json` — Task categories
- `statuses.json` — Custom statuses
- `habitGroup.json` — Habit groups

**Never use localStorage** — always use SiYuan's storage API.

---

## INTERNATIONALIZATION (i18n)

**Mandatory bilingual support** (English + Chinese):
```typescript
import { i18n } from "./pluginInstance";
showMessage(i18n("taskCreatedSuccessfully"));
```

- Add keys to both `i18n/en_US.json` and `i18n/zh_CN.json`
- Keys: camelCase, grouped by feature

---

## BUILD CONFIGURATION

- Single-file bundle: `inlineDynamicImports: true` (no code splitting)
- Output: `dist/` (prod) or `dev/` (dev)
- Auto-copy to SiYuan in dev mode via `make_dev_copy.js`
- Production creates `package.zip`

---

## ANTI-PATTERNS

- **DO NOT use Svelte for simple dialogs** — Use TypeScript class pattern
- **DO NOT split code into chunks** — Must remain single-file bundle
- **DO NOT use localStorage** — Use SiYuan's `loadData()` / `saveData()` API
- **DO NOT forget i18n** — Always add both languages
- **DO NOT forget destroy()** — Memory leaks in long-running plugin
- **DO NOT modify `custom-*` attributes directly** — Use SiYuan API methods
- **DO NOT use innerHTML** — Use DOM APIs for security

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add UI component | `src/components/` | See hybrid pattern notes above |
| Add utility/manager | `src/utils/` | Follow singleton manager pattern |
| Modify build | `vite.config.ts`, `scripts/` | Auto-deploy to SiYuan |
| Add i18n keys | `i18n/en_US.json`, `i18n/zh_CN.json` | Bilingual required |
| Plugin lifecycle | `src/index.ts` | `onload()`, `onunload()` hooks |
| API calls | `src/api.ts` | SiYuan kernel wrappers |
| Types | `src/types/` | TypeScript definitions |

---

## NOTES

- **SiYuan Integration**: Plugin runs inside SiYuan app, uses its plugin API
- **Auto-deploy**: Dev mode auto-copies to local SiYuan installation
- **No tests**: Manual testing only (test scripts in `/test/`)
- **Large files**: `src/index.ts` ~5400 lines, `CalendarView.ts` ~345KB
- **Comments**: Chinese comments common for internal logic

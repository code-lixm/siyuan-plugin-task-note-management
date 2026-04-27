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

### UI Design Learnings (Project Management Panel)

- **Do not stack multiple heavy control slabs** in the top area. Prefer a calm title row plus a lightweight control area, not a toolbar panel sitting on top of another filter panel.
- **Unify width rhythm** between header and list. Header content and list content should share the same horizontal padding and feel like one continuous surface.
- **Status should be controlled from the top**, not duplicated as both top filter and in-list expand/collapse groups. Avoid double information architecture.
- **Avoid collapsible section headers for primary list browsing** when a top-level status selector already exists. Flat lists with subtle inline status hints are easier to scan.
- **Search should not look like a floating widget**. Prefer low-contrast integrated search styling over boxed, card-like search containers.
- **Reduce visible action count** in high-attention areas. Keep only the most frequent actions visible and move low-frequency actions into a More menu.
- **Do not give every piece of metadata the same visual volume**. Titles should dominate; time/category/status should be secondary; counts/progress should be tertiary.
- **Suppress default list noise**: hide notes and full tag rows in dense overview lists unless they are essential.
- **Use fewer borders and fewer backgrounds**. Distinction should come first from spacing, typography, and alignment—not from repeated pills, boxes, and slabs.
- **When refining UI, solve architecture first, then spacing, then polish**. Rearranging crowded blocks without changing hierarchy usually only moves the problem.
- **Overdue indicators should be subtle, never heavy**. A full gray background or thick left border feels like punishment. Use micro-hints: icon tint, a tiny colored dot, or nothing at all—let the user feel calm even when things are late.
- **Replace emoji placeholders with real APIs when available**. SiYuan's `/api/icon/getDynamicIcon` (type 8 text icons, type 7 countdown icons) generates crisp SVGs that adapt to theme and language. Prefer them over static emoji or CSS circles for date/status visuals.
- **Icon color should be soft, not saturated**. Material 200-level pastels (e.g., `#A5D6A7`, `#EF9A9A`, `#FFCC80`) read better inside dense lists than full-strength theme colors. High saturation pulls the eye too aggressively.
- **A single icon can replace both status dot and countdown label**. If you already show a dynamic icon colored by state and containing a day count, the separate title-row dot and the "X days remaining" pill become redundant. Remove them.
- **Time offset logic must be consistent and predictable**. For project cards: if overdue, show days-since-deadline; otherwise show days-since-start. Never mix both sources in the same slot or the user loses mental model.
- **Empty containers must collapse, not leave ghost whitespace**. A `stats` row with zero counts should set `display: none` after async load, not rely on `min-height` tricks that leave dead air in the list.
- **Interactive elements must be actually interactive**. A search icon that doesn't respond to click feels broken. Add `focus()` forwarding or remove the icon if it's purely decorative.
- **Layout should be one skeleton, many states**. All cards share the same DOM structure: title row → info row (left time/tags, right icon) → stats → progress. Only the icon color and number change per state. No conditional branches that restructure the card.

---

## WORK LOG HABIT

- **任务完成后同步记录到思源 Todo**：每次完成任务后，都要把完成项追加到思源笔记文档 `20260401222342-psl8av6`（`IMS Todo List`）。
- **按当天日期归档**：优先写入当天对应的日期小节；若当天小节不存在，则先创建日期标题再追加内容。
- **日期标题和记录必须分块写入**：不要一次性插入 `## 日期\n\n记录内容`，否则思源可能把标题和内容合成同一块。正确做法是：日期标题单独插入一个标题块，完成记录再作为独立段落块插入到该日期小节下。
- **已有日期小节只追加内容块**：若当天标题已存在，禁止重复创建日期标题，只在该标题小节下追加独立记录块。
- **避免重复记录**：插入前先检查当天是否已存在语义重复的完成项；若已有同类记录，不重复追加。
- **采用 changelog 风格**：记录格式统一为 `scope：description`，例如：`导出：完成 IMR 全量导入导出与 overwrite 覆盖导入`。
- **只记录已完成事项**：仅同步已经完成并验证过的任务，不记录进行中或未验证的事项。

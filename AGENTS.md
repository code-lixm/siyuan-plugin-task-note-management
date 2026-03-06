# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-06
**Project:** siyuan-plugin-task-daily
**Type:** SiYuan Notes Plugin (Task Management)

---

## OVERVIEW

Task management plugin for SiYuan Notes implementing the Bullet Journal Method (防弹笔记法). Features reminders, project kanban, Pomodoro timer, Eisenhower matrix, calendar views, and habit tracking.

**Tech Stack:** TypeScript, Svelte, Vite, FullCalendar, Milkdown

---

## STRUCTURE

```
/Users/lixiaoming/Desktop/personal/siyuan-plugin-task-note-management/
├── src/                    # Source code
│   ├── index.ts           # Plugin entry point (~4800 lines)
│   ├── api.ts             # SiYuan API wrappers
│   ├── components/        # UI components (AGENTS.md)
│   ├── utils/             # Utilities & managers (AGENTS.md)
│   ├── libs/              # Shared libraries (AGENTS.md)
│   ├── types/             # TypeScript definitions
│   └── styles/            # SCSS files
├── scripts/               # Build automation (AGENTS.md)
├── i18n/                  # Localization (en_US, zh_CN)
├── test/                  # Manual test scripts
├── dist/                  # Production build
├── dev/                   # Development build
├── plugin.json            # SiYuan plugin manifest
└── vite.config.ts         # Build configuration
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add UI component | `src/components/` | See hybrid pattern notes below |
| Add utility/manager | `src/utils/` | Follow manager pattern |
| Modify build | `vite.config.ts`, `scripts/` | Auto-deploy to SiYuan |
| Add i18n keys | `i18n/en_US.json`, `i18n/zh_CN.json` | Bilingual required |
| Plugin lifecycle | `src/index.ts` | `onload()`, `onunload()` hooks |
| API calls | `src/api.ts` | SiYuan kernel wrappers |

---

## CONVENTIONS

### Component Architecture (CRITICAL)
- **Most components are TypeScript classes**, not Svelte
- Pattern: Class with `constructor()`, `render()`, `destroy()` methods
- DOM manipulation via `document.createElement()`, not JSX/Svelte templates
- Svelte used only for: SettingPanel, LoadingDialog, FilterManagement, Form, SelectDialog

### Data Storage
All persistence via SiYuan API (`plugin.loadData()` / `saveData()`):
- `reminder.json` — Reminder items
- `project.json` — Project data
- `habit.json` — Habit tracking
- `pomodoro_record.json` — Pomodoro sessions
- `reminder-settings.json` — Plugin settings
- In-memory caching layer in all managers

### Code Style
- Single-file bundle (no code splitting): `inlineDynamicImports: true`
- Path alias: `@/` → `src/`
- Strict TypeScript: OFF (`"strict": false`)
- Unused variables: Error (`"noUnusedLocals": true`)
- Comments in Chinese common for internal logic

### i18n
- **Bilingual mandatory**: All user-facing strings in both en_US and zh_CN
- Keys pattern: camelCase, grouped by feature
- Location: `i18n/en_US.json`, `i18n/zh_CN.json`

---

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT use Svelte for simple dialogs** — Use TypeScript class pattern
- **DO NOT split code into chunks** — Must remain single-file bundle
- **DO NOT forget i18n** — Always add both languages
- **DO NOT use localStorage** — Use SiYuan's `loadData()` / `saveData()` API
- **DO NOT modify `custom-*` attributes directly** — Use SiYuan API methods

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

# GitHub release
./gh_release.sh
```

---

## NOTES

- **SiYuan Integration**: Plugin runs inside SiYuan app, uses its plugin API
- **Auto-deploy**: Dev mode auto-copies to local SiYuan installation
- **No tests**: Manual testing only (test scripts in `/test/`)
- **Large files**: `src/index.ts` is ~4800 lines, `CalendarView.ts` ~345KB
- **Drag-drop sorting**: `// IMPORTANT: siblings must be sorted to match VISUAL order.`

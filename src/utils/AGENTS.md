# src/utils KNOWLEDGE BASE

**Generated:** 2026-03-06
**Purpose:** Utility modules and data managers

---

## OVERVIEW

17 utility modules organized as managers and helpers. Implements data caching, business logic, and platform integrations.

---

## WHERE TO LOOK

| Category | Files | Purpose |
|----------|-------|---------|
| **Managers** | `*Manager.ts`, `*Record.ts` | State management, caching |
| Date/Time | `dateUtils.ts`, `lunarUtils.ts`, `repeatUtils.ts` | Calendar logic |
| Import/Export | `icsUtils.ts`, `icsImport.ts`, `icsSubscription.ts` | Calendar sync |
| Audio | `audioUtils.ts` | Notification sounds |
| Project | `projectManager.ts`, `categoryManager.ts` | Task organization |
| Config | `calendarConfigManager.ts`, `sortConfig.ts`, `statusManager.ts` | Settings |

---

## MANAGER PATTERN

All managers follow singleton-like pattern:

```typescript
export class DataManager {
    private cache: Data[] = [];
    private static instance: DataManager;
    
    public static getInstance(): DataManager {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
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

**Key features:**
- In-memory caching for performance
- JSON file persistence via SiYuan API
- Singleton pattern for global access

---

## DATA FILES

| Manager | File | Content |
|---------|------|---------|
| `categoryManager.ts` | `categories.json` | Task categories |
| `projectManager.ts` | `project.json` | Project definitions |
| `pomodoroRecord.ts` | `pomodoro_record.json` | Session history |
| `habitGroupManager.ts` | `habitGroup.json` | Habit groups |
| `statusManager.ts` | `statuses.json` | Custom statuses |

---

## ICS/CALENDAR INTEGRATION

Full iCalendar (ICS) support for import/export:
- `icsUtils.ts` — Core ICS parsing/generation
- `icsImport.ts` — Import logic
- `icsSubscription.ts` — Subscription sync
- `icsSubscription.ts` — Subscription sync

---

## ANTI-PATTERNS

- **DO NOT use localStorage** — Must use SiYuan's storage API
- **DO NOT cache without save()** — Changes lost on reload
- **DO NOT forget await on loadData()/saveData()** — Async API

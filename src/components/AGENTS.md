# src/components KNOWLEDGE BASE

**Generated:** 2026-03-06
**Purpose:** UI components for task-daily plugin

---

## OVERVIEW

33 components implementing dialogs, panels, and views. **Hybrid architecture**: Most use TypeScript class pattern, few use Svelte.

---

## WHERE TO LOOK

| Pattern | Files | Notes |
|---------|-------|-------|
| TS Class Components | `*.ts` (28 files) | DOM-based, imperative |
| Svelte Components | `*.svelte` (5 files) | Declarative, complex UI |
| Dialogs | `*Dialog.ts` | Modal dialogs |
| Panels | `*Panel.ts` | Sidebar panels |
| Views | `*View.ts` | Tab views |

---

## COMPONENT PATTERNS

### TypeScript Class Pattern (Preferred)

```typescript
export class ComponentName {
    private element: HTMLElement;
    private dialog: Dialog;
    
    constructor() {
        this.element = document.createElement('div');
        // Build DOM structure
    }
    
    public show(): void {
        this.dialog = new Dialog({
            content: this.element,
            // ...
        });
    }
    
    public destroy(): void {
        this.dialog?.destroy();
    }
}
```

**When to use:** Simple dialogs, panels, views with minimal state.

### Svelte Pattern

Use for: Complex forms, settings panels, multi-step wizards.

**Files:** SettingPanel.svelte, LoadingDialog.svelte, FilterManagement.svelte, Form/, SelectDialog.svelte

---

## LARGE FILES

| File | Size | Purpose |
|------|------|---------|
| CalendarView.ts | ~345KB | FullCalendar integration |
| EisenhowerMatrixView.ts | ~214KB | 4-quadrant task matrix |
| HabitPanel.ts | ~63KB | Habit tracking UI |
| BatchReminderDialog.ts | ~88KB | Bulk reminder management |

---

## CONVENTIONS

- Extend base classes: `Dialog`, `Menu`, `Tab`
- Use SiYuan's UI components: `Button`, `Input`, `Select`
- Close handlers: Always call `destroy()` on dialog close
- Event listeners: Remove in `destroy()` to prevent leaks

---

## ANTI-PATTERNS

- **DO NOT use Svelte for simple dialogs** — Overhead not justified
- **DO NOT use innerHTML** — Use DOM APIs for security
- **DO NOT forget destroy()** — Memory leaks in long-running plugin

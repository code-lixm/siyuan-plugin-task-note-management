# SiYuan Task Management Plugin - Implementation Plan
## React + Zustand Refactor Completion

---

## Executive Summary

This plan addresses the critical missing pieces in the React + Zustand refactor:
1. **Data persistence layer** (highest priority - all data lost on refresh)
2. **EisenhowerMatrixView integration** (80% complete, needs wiring)
3. **Testing infrastructure** (none exists)
4. **Store synchronization** (auto-save pattern)

---

## 1. Task Decomposition Table

### Priority P0: Data Persistence (Critical)

| Task ID | Task Description | File Path | Effort | Dependencies | QA Verification |
|---------|------------------|-----------|--------|--------------|-----------------|
| **P0.1** | Add load/save methods to useReminderStore.ts | src/stores/useReminderStore.ts | 2h | None | Store loads data on init, saves on mutation |
| **P0.2** | Add load/save methods to useProjectStore.ts | src/stores/useProjectStore.ts | 2h | None | Projects persist across refreshes |
| **P0.3** | Add load/save methods to useHabitStore.ts | src/stores/useHabitStore.ts | 2h | None | Habit check-ins persist across refreshes |
| **P0.4** | Create useStorePersistence hook for auto-save | src/hooks/useStorePersistence.ts | 3h | P0.1-P0.3 | Auto-save triggers on state changes with debounce |
| **P0.5** | Integrate persistence into ReminderPanel | src/components/layout/ReminderPanel.tsx | 1h | P0.1, P0.4 | Panel loads reminders on mount, auto-saves changes |
| **P0.6** | Integrate persistence into ProjectPanel | src/components/layout/ProjectPanel.tsx | 1h | P0.2, P0.4 | Panel loads projects on mount, auto-saves changes |
| **P0.7** | Integrate persistence into HabitPanel | src/components/layout/HabitPanel.tsx | 1h | P0.3, P0.4 | Panel loads habits on mount, auto-saves changes |
| **P0.8** | Handle data migration from legacy format | src/utils/dataMigration.ts | 3h | P0.1-P0.3 | Legacy data migrates to new format without loss |

**Total P0 Effort: 15 hours**

### Priority P1: Eisenhower Matrix Integration

| Task ID | Task Description | File Path | Effort | Dependencies | QA Verification |
|---------|------------------|-----------|--------|--------------|-----------------|
| **P1.1** | Wire EisenhowerMatrixView to tab system | src/index.tsx (lines 285-292) | 1h | P0.1 | Tab opens and displays 4-quadrant view |
| **P1.2** | Connect EisenhowerMatrixView to store | src/components/views/EisenhowerMatrixView.tsx | 2h | P0.1, P1.1 | Tasks display in correct quadrants, drag-drop updates store |
| **P1.3** | Add Eisenhower Matrix command | src/index.tsx registerCommands() | 30m | P1.1 | Command palette opens Eisenhower tab |
| **P1.4** | Add Eisenhower Matrix dock icon | src/index.tsx registerDocks() | 1h | P1.1 | Dock button opens Eisenhower view |

**Total P1 Effort: 4.5 hours**

### Priority P2: Testing Infrastructure

| Task ID | Task Description | File Path | Effort | Dependencies | QA Verification |
|---------|------------------|-----------|--------|--------------|-----------------|
| **P2.1** | Setup Vitest testing framework | vitest.config.ts, package.json | 1h | None | `npm test` runs successfully |
| **P2.2** | Create SiYuan API mock utilities | src/test/mocks/siyuanMock.ts | 2h | P2.1 | Mock API matches real Plugin interface |
| **P2.3** | Write useReminderStore tests | src/stores/__tests__/useReminderStore.test.ts | 2h | P0.1, P2.2 | 90%+ coverage for store methods |
| **P2.4** | Write useProjectStore tests | src/stores/__tests__/useProjectStore.test.ts | 2h | P0.2, P2.2 | 90%+ coverage for store methods |
| **P2.5** | Write useHabitStore tests | src/stores/__tests__/useHabitStore.test.ts | 2h | P0.3, P2.2 | 90%+ coverage for store methods |
| **P2.6** | Write useStorePersistence tests | src/hooks/__tests__/useStorePersistence.test.ts | 2h | P0.4, P2.2 | Tests debounce, error handling, retry |
| **P2.7** | Add data migration tests | src/utils/__tests__/dataMigration.test.ts | 2h | P0.8, P2.2 | Tests various migration scenarios |
| **P2.8** | Add CI test workflow | .github/workflows/test.yml | 1h | P2.1 | Tests run on every PR |

**Total P2 Effort: 14 hours**

### Priority P3: Advanced Features

| Task ID | Task Description | File Path | Effort | Dependencies | QA Verification |
|---------|------------------|-----------|--------|--------------|-----------------|
| **P3.1** | Add conflict resolution for concurrent edits | src/utils/conflictResolver.ts | 3h | P0.1-P0.3 | Last-write-wins or merge strategy works |
| **P3.2** | Implement optimistic updates | src/stores/useReminderStore.ts (enhance) | 2h | P0.1 | UI updates immediately, rolls back on error |
| **P3.3** | Add export/import functionality | src/components/BackupDialog.tsx | 4h | P0.1-P0.3 | JSON export/import works, validates format |
| **P3.4** | Add data validation layer | src/utils/dataValidation.ts | 2h | P0.1-P0.3 | Invalid data rejected with clear errors |
| **P3.5** | Add operation history/undo | src/stores/useOperationHistory.ts | 4h | P0.1-P0.3 | Ctrl+Z undoes last operation |

**Total P3 Effort: 15 hours**

---

## 2. Parallel Execution Graph

```
Phase 1: Foundation (Week 1)
==========================
P0.1 (Reminder Persistence)
       │
       ├──→ P0.4 (Persistence Hook)
       │         │
       │         ├──→ P0.5 (ReminderPanel Integration)
       │
P0.2 (Project Persistence)
       │
       ├──→ P0.4 (Persistence Hook)
       │         │
       │         ├──→ P0.6 (ProjectPanel Integration)
       │
P0.3 (Habit Persistence)
       │
       ├──→ P0.4 (Persistence Hook)
                 │
                 ├──→ P0.7 (HabitPanel Integration)

[Parallel tracks: P0.1, P0.2, P0.3 can start simultaneously]

Phase 2: Testing Infrastructure (Week 1-2)
=========================================
P2.1 (Vitest Setup)
       │
       ├──→ P2.2 (SiYuan Mock)
                 │
                 ├──→ P2.3 (ReminderStore Tests) ─┐
                 ├──→ P2.4 (ProjectStore Tests) ─┼── All test tasks parallel after P2.2
                 ├──→ P2.5 (HabitStore Tests) ───┘
                 ├──→ P2.6 (Persistence Tests)
                 └──→ P2.7 (Migration Tests)

[Parallel with Phase 1 after P0.1-P0.3 complete]

Phase 3: Eisenhower Integration (Week 2)
========================================
P0.1-P0.3 Complete
       │
       ├──→ P1.2 (Connect Eisenhower to Store)
                 │
                 ├──→ P1.1 (Wire to Tab System)
                           │
                           ├──→ P1.3 (Add Command)
                           └──→ P1.4 (Add Dock Icon)

Phase 4: Polish (Week 3)
========================
P3.1-P3.5 can run in parallel after P0.x complete

Phase 5: Data Migration (Week 3)
=================================
P0.8 (Data Migration)
       │
       ├──→ P2.7 (Migration Tests)
```

### Maximum Parallelism:
- **3 parallel tracks in Phase 1**: Reminder, Project, Habit persistence
- **5 parallel test tasks** after P2.2
- **3 parallel P3 tasks** at any time

---

## 3. Category + Skills Recommendations

### Task Categories & Delegation Strategy

| Task Type | Category | Recommended Skills | Rationale |
|-----------|----------|-------------------|-----------|
| **Store Persistence (P0.1-P0.3)** | `refactor` | React, TypeScript, Zustand | Store refactoring requires React/Zustand expertise |
| **Persistence Hook (P0.4)** | `refactor` | React Hooks, TypeScript | Custom hook creation |
| **Panel Integration (P0.5-P0.7)** | `frontend` | React, Component Integration | React component lifecycle management |
| **Eisenhower Wiring (P1.1-P1.4)** | `frontend` | React, SiYuan API | Component integration with SiYuan |
| **Testing Framework (P2.1-P2.2)** | `devops` | Vitest, Testing | Testing infrastructure setup |
| **Store Tests (P2.3-P2.5)** | `test` | TDD, Zustand, Vitest | Test-driven store development |
| **Hook Tests (P2.6)** | `test` | React Testing Library | Hook testing patterns |
| **Migration (P0.8, P2.7)** | `refactor` | Data Migration, Testing | Complex data transformation logic |
| **Advanced Features (P3.x)** | `feature` | TypeScript, State Management | Feature development |

### OMO Agent Delegation Map

```
┌─────────────────────────────────────────────────────────────┐
│                      EXECUTION TEAMS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEAM A: Persistence Layer (Category: refactor)            │
│  ├─ P0.1: useReminderStore persistence                      │
│  ├─ P0.2: useProjectStore persistence                       │
│  ├─ P0.3: useHabitStore persistence                         │
│  └─ P0.4: useStorePersistence hook                          │
│                                                             │
│  TEAM B: Integration (Category: frontend)                   │
│  ├─ P0.5: ReminderPanel integration                         │
│  ├─ P0.6: ProjectPanel integration                          │
│  ├─ P0.7: HabitPanel integration                            │
│  └─ P1.1-P1.4: Eisenhower Matrix wiring                     │
│                                                             │
│  TEAM C: Testing (Category: test)                           │
│  ├─ P2.1: Vitest setup                                      │
│  ├─ P2.2: SiYuan mock utilities                             │
│  ├─ P2.3: ReminderStore tests                               │
│  ├─ P2.4: ProjectStore tests                                │
│  ├─ P2.5: HabitStore tests                                  │
│  ├─ P2.6: Persistence hook tests                            │
│  └─ P2.7: Migration tests                                   │
│                                                             │
│  TEAM D: Data & Migration (Category: refactor)              │
│  ├─ P0.8: Data migration from legacy                        │
│  └─ P3.x: Advanced features (optional)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Skills Loading Strategy

**For Persistence Tasks (P0.x):**
- Load `skill(name='refactor')` for code transformation
- Agent should understand Zustand patterns
- Focus on atomic store updates

**For Testing Tasks (P2.x):**
- Load `skill(name='test')` for testing patterns
- Agent needs Vitest + React Testing Library knowledge
- TDD approach: write tests first, then implementation

**For Frontend Integration (P0.5-P0.7, P1.x):**
- Load `skill(name='frontend-ui-ux')` for React component work
- Agent understands React 18, hooks, component lifecycle

**For Data Migration (P0.8):**
- Load `skill(name='refactor')` for data transformation
- Agent should be defensive about data loss

---

## 4. Step-by-Step Execution Plan

### Week 1: Foundation + Testing Setup

#### Day 1-2: Persistence Layer (Parallel)
**Morning Session (4h):**
- Delegate P0.1, P0.2, P0.3 to 3 parallel agents
- Each agent implements load/save for their respective store
- **TDD approach**: Tests written alongside implementation

**Evening Session (2h):**
- Code review of all 3 store implementations
- Delegate P0.4: Create useStorePersistence hook
- **Atomic commit**: `feat(stores): add persistence methods to all stores`

#### Day 3: Panel Integration
**Morning Session (3h):**
- Delegate P0.5, P0.6, P0.7 to 3 parallel agents
- Each integrates persistence into their panel
- **TDD approach**: Panel tests verify data loading/saving

**Evening Session (2h):**
- Integration testing
- Manual testing in SiYuan
- **Atomic commit**: `feat(panels): integrate persistence into all dock panels`

#### Day 4-5: Testing Infrastructure
**Day 4 Morning (4h):**
- Delegate P2.1: Setup Vitest
- Delegate P2.2: Create SiYuan mocks
- **TDD approach**: Mock must match real API exactly

**Day 4 Evening (2h):**
- Review test setup
- **Atomic commit**: `test(setup): add vitest testing framework with SiYuan mocks`

**Day 5 (6h):**
- Delegate P2.3, P2.4, P2.5 in parallel
- Each store gets comprehensive test suite
- **Atomic commits** (one per store):
  - `test(reminder): add comprehensive tests for useReminderStore`
  - `test(project): add comprehensive tests for useProjectStore`
  - `test(habit): add comprehensive tests for useHabitStore`

### Week 2: Eisenhower + Advanced Testing

#### Day 6-7: Eisenhower Integration
**Day 6 (4h):**
- Delegate P1.2: Connect EisenhowerMatrixView to store
- Ensure drag-drop updates store correctly
- **TDD approach**: Test quadrant assignment logic

**Day 7 Morning (2h):**
- Delegate P1.1: Wire to tab system
- Delegate P1.3: Add command
- Delegate P1.4: Add dock icon (parallel)

**Day 7 Evening (2h):**
- Manual testing of Eisenhower Matrix
- **Atomic commit**: `feat(eisenhower): integrate matrix view into tab system`

#### Day 8-9: Persistence Testing
**Day 8 (4h):**
- Delegate P2.6: useStorePersistence tests
- Test debounce, error handling, retry logic

**Day 9 (4h):**
- Delegate P2.7: Data migration tests
- Test various edge cases
- **Atomic commits**:
  - `test(persistence): add tests for useStorePersistence hook`
  - `test(migration): add tests for data migration utilities`

#### Day 10: CI + Integration
**Morning (4h):**
- Delegate P2.8: Add CI workflow
- Run full test suite
- Fix any failing tests

**Evening (2h):**
- End-to-end testing in SiYuan
- **Atomic commit**: `ci(tests): add GitHub Actions test workflow`

### Week 3: Data Migration + Polish

#### Day 11-12: Data Migration
**Day 11 (6h):**
- Delegate P0.8: Data migration from legacy
- Analyze legacy data format
- Write migration utilities

**Day 12 (4h):**
- Integration testing with real SiYuan data
- Edge case handling
- **Atomic commit**: `feat(migration): add legacy data migration with validation`

#### Day 13-15: Advanced Features (Optional)
If time permits, pick from P3.x:
- P3.3 (export/import) - high user value
- P3.4 (data validation) - prevents corruption
- P3.5 (undo) - good UX

---

## 5. TDD-Oriented Development Workflow

### Test-First Approach for Each Task

```
┌────────────────────────────────────────────────────────────┐
│                   TDD CYCLE FOR EACH TASK                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. RED: Write failing test                               │
│     ├── Define expected behavior                          │
│     ├── Write test that asserts the behavior              │
│     └── Verify test fails (RED)                           │
│                                                            │
│  2. GREEN: Implement minimal code                         │
│     ├── Write simplest implementation                     │
│     └── Verify test passes (GREEN)                        │
│                                                            │
│  3. REFACTOR: Clean up                                    │
│     ├── Improve code quality                              │
│     └── Ensure tests still pass                           │
│                                                            │
│  4. COMMIT: Atomic commit                                 │
│     └── Commit with descriptive message                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Example: P0.1 (useReminderStore Persistence)

**Step 1: Write Test (RED)**
```typescript
// src/stores/__tests__/useReminderStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReminderStore } from '../useReminderStore';
import { mockSiYuanPlugin } from '@/test/mocks/siyuanMock';

describe('useReminderStore persistence', () => {
  beforeEach(() => {
    useReminderStore.setState({ reminders: [], isLoading: false, error: null });
  });

  it('should load reminders from plugin storage', async () => {
    const mockData = {
      reminders: [{ id: '1', title: 'Test', completed: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' }]
    };
    mockSiYuanPlugin.loadReminderData.mockResolvedValue(mockData);
    
    const { loadReminders } = useReminderStore.getState();
    await loadReminders();
    
    expect(useReminderStore.getState().reminders).toHaveLength(1);
    expect(useReminderStore.getState().reminders[0].title).toBe('Test');
  });

  it('should save reminders to plugin storage', async () => {
    const { addReminder, saveReminders } = useReminderStore.getState();
    addReminder({ title: 'New Task', completed: false });
    
    await saveReminders();
    
    expect(mockSiYuanPlugin.saveReminderData).toHaveBeenCalledWith(
      expect.objectContaining({
        reminders: expect.arrayContaining([
          expect.objectContaining({ title: 'New Task' })
        ])
      })
    );
  });
});
```

**Step 2: Implement (GREEN)**
```typescript
// Add to useReminderStore.ts
export const useReminderStore = create<ReminderState>((set, get) => ({
  // ... existing state
  
  loadReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const plugin = useSiYuanPlugin();
      const data = await plugin.loadReminderData();
      set({ 
        reminders: data.reminders || [], 
        isLoading: false 
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
  
  saveReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const plugin = useSiYuanPlugin();
      const { reminders } = get();
      await plugin.saveReminderData({ reminders });
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
}));
```

**Step 3: Refactor**
- Extract common loading/saving patterns
- Add error handling improvements
- Add retry logic

**Step 4: Commit**
```bash
git add src/stores/useReminderStore.ts src/stores/__tests__/useReminderStore.test.ts
git commit -m "feat(stores): add persistence methods to useReminderStore

- Add loadReminders() to fetch from SiYuan storage
- Add saveReminders() to persist to SiYuan storage
- Include comprehensive test coverage
- Handle loading and error states"
```

---

## 6. Atomic Commit Strategy

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Usage |
|------|-------|
| `feat` | New features |
| `fix` | Bug fixes |
| `test` | Adding tests |
| `refactor` | Code restructuring |
| `ci` | CI/CD changes |
| `docs` | Documentation |

### Scopes

| Scope | Description |
|-------|-------------|
| `stores` | Zustand stores |
| `panels` | React panel components |
| `hooks` | Custom React hooks |
| `utils` | Utility functions |
| `test` | Test infrastructure |
| `eisenhower` | Eisenhower Matrix view |
| `migration` | Data migration |

### Commit Examples

```bash
# Store persistence commits
git commit -m "feat(stores): add load/save methods to useReminderStore

- Implement loadReminders() using plugin.loadReminderData()
- Implement saveReminders() using plugin.saveReminderData()
- Add proper error handling and loading states
- Related: P0.1"

git commit -m "feat(stores): add persistence to useProjectStore

- Add loadProjects() and saveProjects() methods
- Integrate with plugin.loadProjectData() API
- Add loading and error state management
- Related: P0.2"

git commit -m "feat(hooks): create useStorePersistence for auto-save

- Implement debounced auto-save functionality
- Add configurable save delay (default 1000ms)
- Handle save errors with retry logic
- Related: P0.4"

# Testing commits
git commit -m "test(setup): add vitest testing framework

- Configure vitest with jsdom environment
- Add test scripts to package.json
- Setup test directory structure
- Related: P2.1"

git commit -m "test(stores): add comprehensive tests for useReminderStore

- Test all CRUD operations
- Test batch operations
- Test persistence methods
- 95% code coverage
- Related: P2.3"

# Integration commits
git commit -m "feat(panels): integrate persistence into ReminderPanel

- Add data loading on component mount
- Integrate useStorePersistence for auto-save
- Add loading indicators
- Related: P0.5"

git commit -m "feat(eisenhower): wire EisenhowerMatrixView to tab system

- Replace placeholder tab registration
- Add proper component mounting with mountTabComponent
- Related: P1.1"
```

### Commit Frequency Guidelines

| Task Size | Commits Expected |
|-----------|-----------------|
| Small (1-2h) | 1 commit |
| Medium (3-4h) | 2-3 commits |
| Large (5h+) | 4+ commits (break down task) |

### Pre-Commit Checklist

- [ ] Tests pass (`npm test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Code follows project conventions
- [ ] Commit message follows format
- [ ] Related task ID referenced in commit body

---

## 7. Risk Mitigation

### Data Loss Prevention

| Risk | Mitigation |
|------|------------|
| Migration corrupts data | **P0.8**: Create backup before migration, validate data format |
| Concurrent edits conflict | **P3.1**: Implement last-write-wins strategy with timestamps |
| Save fails silently | **P0.4**: Add error handling and user notification on save failure |
| Legacy format incompatible | **P0.8**: Write defensive migration, fallback to empty state |

### Testing Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| useReminderStore.ts | 90%+ |
| useProjectStore.ts | 90%+ |
| useHabitStore.ts | 90%+ |
| useStorePersistence.ts | 95%+ |
| dataMigration.ts | 85%+ |

### Rollback Strategy

Each atomic commit should be deployable independently. If issues arise:

1. **Store issues**: Rollback to pre-persistence commit, data remains in SiYuan storage
2. **Migration issues**: Migration is idempotent, can re-run safely
3. **Integration issues**: Feature flags can disable React components, fallback to legacy

---

## 8. Success Criteria

### Completion Definition

✅ **All P0 tasks complete:**
- All stores load/save data correctly
- All panels auto-save changes
- No data loss on refresh

✅ **All P1 tasks complete:**
- Eisenhower Matrix accessible from tab
- Tasks display in correct quadrants
- Drag-drop updates persist

✅ **All P2 tasks complete:**
- Test suite runs in CI
- 85%+ overall coverage
- All tests passing

✅ **P0.8 complete:**
- Legacy data migrates successfully
- No user data loss

### Definition of Done (per task)

- [ ] Implementation complete
- [ ] Tests written and passing (TDD)
- [ ] Code reviewed
- [ ] Atomic commit made
- [ ] QA verification passed
- [ ] Documentation updated (if needed)

---

## 9. Appendix: Technical Details

### Store Data Structure

```typescript
// Reminder Data Format (reminder.json)
{
  "reminders": [
    {
      "id": "reminder_1234567890_abc",
      "title": "Task title",
      "content": "Description",
      "date": "2024-01-15",
      "time": "14:00",
      "completed": false,
      "categoryId": "cat_123",
      "projectId": "proj_456",
      "priority": "high",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}

// Project Data Format (project.json)
{
  "projects": [
    {
      "id": "project_1234567890_abc",
      "name": "Project Name",
      "description": "Description",
      "color": "#3b82f6",
      "milestones": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}

// Habit Data Format (habit.json)
{
  "habits": [
    {
      "id": "habit_1234567890_abc",
      "title": "Habit Name",
      "target": 1,
      "frequency": { "type": "daily" },
      "checkIns": {
        "2024-01-01": { "count": 1, "status": ["✓"], "timestamp": "..." }
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "groups": []
}
```

### SiYuan Plugin API Usage

```typescript
// Plugin data storage methods (from src/index.tsx)
class ReminderPlugin extends Plugin {
  async loadReminderData(): Promise<Record<string, any>>
  async saveReminderData(data: Record<string, any>): Promise<void>
  async loadProjectData(): Promise<Record<string, any>>
  async saveProjectData(data: Record<string, any>): Promise<void>
  async loadHabitData(): Promise<Record<string, any>>
  async saveHabitData(data: Record<string, any>): Promise<void>
}

// Access via React Context (from src/bridge/SiYuanContext.tsx)
const plugin = useSiYuanPlugin();
const data = await plugin.loadReminderData();
```

### Auto-Save Debounce Configuration

```typescript
// Default configuration for useStorePersistence
const DEFAULT_CONFIG = {
  debounceMs: 1000,      // Wait 1s after last change before saving
  maxRetries: 3,         // Retry failed saves 3 times
  retryDelayMs: 5000,    // Wait 5s between retries
  saveOnUnmount: true,   // Save when component unmounts
};
```

---

**Plan Version**: 1.0
**Last Updated**: 2026-03-19
**Total Estimated Effort**: 48.5 hours (P0+P1+P2), +15 hours optional (P3)

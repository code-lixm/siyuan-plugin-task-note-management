# Tasks Document: SiYuan Database Migration

## Phase 1: Foundation - SiYuanDatabaseManager

- [ ] 1.1 Create database types and interfaces
  - File: `src/types/database.ts` (new)
  - Define `DatabaseConfig`, `StorageMode`, `DatabaseSchema`, `SchemaValidationResult` interfaces
  - Define `SiYuanDatabaseRow`, `ProjectDatabaseRow` interfaces
  - Define conversion function types
  - Purpose: Establish type safety for all database operations
  - _Leverage: `src/types/index.ts` for existing type patterns_
  - _Requirements: 1.1, 6_
  - _Prompt: Role: TypeScript Developer specializing in type systems and database interfaces | Task: Create comprehensive TypeScript interfaces for database types following design.md specifications, establishing type safety for all database operations | Restrictions: Do not modify existing type files without checking dependencies, maintain backward compatibility, follow project naming conventions | Success: All interfaces compile without errors, provide full type coverage for database operations, properly typed conversion functions_

- [ ] 1.2 Create SiYuanDatabaseManager base class
  - File: `src/utils/siYuanDatabaseManager.ts` (new)
  - Implement singleton pattern with `getInstance()`
  - Implement `initialize()`, `isAvailable()` methods
  - Implement basic API wrapper methods
  - Purpose: Provide centralized database access layer
  - _Leverage: `src/api.ts` for SiYuan API patterns, `src/utils/habitGroupManager.ts` for singleton pattern_
  - _Requirements: 1.2, 6_
  - _Prompt: Role: Backend Developer with expertise in TypeScript and API wrappers | Task: Create SiYuanDatabaseManager singleton class with initialization and availability checking, implementing base API wrapper methods following design.md | Restrictions: Must follow existing Manager patterns, handle API errors gracefully, implement proper singleton thread-safety | Success: Manager initializes correctly, API calls work with proper error handling, singleton pattern prevents multiple instances_

- [ ] 1.3 Implement database CRUD operations for Projects
  - File: `src/utils/siYuanDatabaseManager.ts` (continue)
  - Implement `getAllProjects()`, `getProjectById()`, `createProject()`, `updateProject()`, `deleteProject()`
  - Implement `batchUpdateProjects()` for bulk operations
  - Purpose: Provide complete project data access
  - _Leverage: `src/utils/projectManager.ts` for project data structure knowledge_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Prompt: Role: Backend Developer with expertise in CRUD operations and database APIs | Task: Implement all project CRUD methods in SiYuanDatabaseManager following design.md specifications, including batch operations | Restrictions: Must validate input data, handle null/undefined cases, implement proper error messages, use batch API for bulk updates | Success: All CRUD operations work correctly, batch operations reduce API calls, proper error handling for all edge cases_

- [ ] 1.4 Implement data conversion utilities
  - File: `src/utils/databaseConverters.ts` (new)
  - Implement `rowToProject()`, `projectToRowValues()`
  - Implement status/priority/mode mapping dictionaries
  - Implement helper functions for date conversion
  - Purpose: Handle JSON row ↔ TypeScript object conversion
  - _Leverage: `src/utils/projectManager.ts` for existing data structures_
  - _Requirements: 1.1, 1.6_
  - _Prompt: Role: TypeScript Developer with expertise in data transformation | Task: Implement bidirectional data conversion functions between database rows and Project objects following design.md conversion logic | Restrictions: Must handle missing/invalid data gracefully, maintain type safety, document all mappings | Success: Conversions work correctly in both directions, handle edge cases, maintain data integrity_

- [ ] 1.5 Add database schema validation
  - File: `src/utils/siYuanDatabaseManager.ts` (continue)
  - Implement `getDatabaseSchema()`, `validateSchema()`
  - Add required column checking logic
  - Purpose: Ensure database structure matches expectations
  - _Leverage: `ProjectDatabaseTemplate` from design.md_
  - _Requirements: 1.2, 1.6, NF-2 (Schema Mismatch handling)
  - _Prompt: Role: Backend Developer with expertise in schema validation | Task: Implement schema validation methods that check database columns against required schema, providing detailed error reporting | Restrictions: Must check all required columns, provide actionable error messages, suggest fixes for missing columns | Success: Validation correctly identifies schema issues, errors are clear and actionable, suggested fixes are accurate_

## Phase 2: Database Templates & Configuration

- [ ] 2.1 Create database template definitions
  - File: `src/templates/databaseTemplates.ts` (new)
  - Define `ProjectDatabaseTemplate` with all columns and options
  - Define `GroupDatabaseTemplate`, `MilestoneDatabaseTemplate`
  - Purpose: Provide templates for auto-creating databases
  - _Leverage: Design.md template definitions_
  - _Requirements: 1.1, 1.2_
  - _Prompt: Role: Frontend Developer with expertise in SiYuan database structure | Task: Create comprehensive database templates with proper column types, options, and colors following design.md specifications | Restrictions: Must match SiYuan AV column types exactly, provide all required options with correct colors, follow naming conventions | Success: Templates match SiYuan AV format, all columns properly defined, options include correct colors and labels_

- [ ] 2.2 Implement database auto-creation
  - File: `src/utils/siYuanDatabaseManager.ts` (continue)
  - Implement `createProjectDatabase()`, `createGroupDatabase()` methods
  - Add logic to use templates for database creation
  - Purpose: Allow automatic database setup
  - _Leverage: `src/templates/databaseTemplates.ts`_
  - _Requirements: 1.1, 1.2, NF-1 (Database Unavailable handling)
  - _Prompt: Role: Backend Developer with expertise in database creation APIs | Task: Implement automatic database creation methods that use templates to create properly structured SiYuan AV databases | Restrictions: Must use SiYuan API for database creation, handle creation failures gracefully, return created database IDs | Success: Databases are created with correct structure, API calls succeed, proper error handling for creation failures_

- [ ] 2.3 Add storage configuration management
  - File: `src/utils/storageConfigManager.ts` (new)
  - Implement configuration loading/saving via `plugin.loadData()`
  - Add `StorageMode` switching logic
  - Add database ID management
  - Purpose: Manage storage mode and database configuration
  - _Leverage: `src/index.ts` for plugin instance access_
  - _Requirements: 1.4, 1.5, 1.6, NF-1 (Fallback mechanism)
  - _Prompt: Role: Backend Developer with expertise in configuration management | Task: Implement storage configuration manager that handles storage mode switching, database ID management, and configuration persistence | Restrictions: Must persist config to plugin data, handle config migration from old versions, validate configuration on load | Success: Configuration persists across sessions, storage mode switching works, invalid configs are handled gracefully_

## Phase 3: Manager Integration (Refactoring)

- [ ] 3.1 Create JSONFallbackManager
  - File: `src/utils/jsonFallbackManager.ts` (new)
  - Extract JSON operations from existing Managers
  - Implement `loadProjects()`, `saveProjects()` for JSON mode
  - Purpose: Provide JSON fallback when database unavailable
  - _Leverage: `src/utils/projectManager.ts` existing JSON logic_
  - _Requirements: 1.4, 1.5, NF-1 (Fallback mechanism)
  - _Prompt: Role: Backend Developer with expertise in data persistence | Task: Extract and encapsulate JSON file operations into JSONFallbackManager, providing clean fallback interface | Restrictions: Must maintain exact same data format as before, handle file I/O errors, maintain backward compatibility | Success: JSON operations work identically to before, proper error handling, clean interface for fallback usage_

- [ ] 3.2 Refactor ProjectManager for dual-mode support
  - File: `src/utils/projectManager.ts` (modify)
  - Add `SiYuanDatabaseManager` and `JSONFallbackManager` dependencies
  - Implement `shouldUseDatabase()` logic
  - Modify `loadProjects()`, `saveProjects()` for dual mode
  - Purpose: Support both JSON and database storage transparently
  - _Leverage: `src/utils/siYuanDatabaseManager.ts`, `src/utils/jsonFallbackManager.ts`_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, NF-1 (Fallback)
  - _Prompt: Role: Senior Developer with expertise in refactoring and backward compatibility | Task: Refactor ProjectManager to support dual-mode storage (JSON/Database) while maintaining exact same public interface | Restrictions: Cannot change any public method signatures, must preserve all existing functionality, dual-mode switching must be transparent | Success: All existing code works without modification, dual-mode switching works correctly, fallback happens automatically on errors_

- [ ] 3.3 Add error handling and retry logic
  - File: `src/utils/siYuanDatabaseManager.ts` (continue)
  - Implement retry mechanism for failed API calls (max 3 retries)
  - Add exponential backoff
  - Implement `withFallback()` wrapper utility
  - Purpose: Improve reliability with automatic retry and fallback
  - _Leverage: `JSONFallbackManager` for fallback operations_
  - _Requirements: 1.6, NF-1 (Error handling)
  - _Prompt: Role: Backend Developer with expertise in error handling and resilience | Task: Implement comprehensive error handling with automatic retry (max 3) and fallback to JSON when database unavailable | Restrictions: Must not block UI during retries, log all errors appropriately, ensure fallback is truly seamless | Success: Retries work correctly with backoff, fallback happens automatically, errors are logged, no UI blocking_

- [ ] 3.4 Implement batch operation optimization
  - File: `src/utils/siYuanDatabaseManager.ts` (continue)
  - Add request batching for multiple updates
  - Implement debouncing for rapid successive calls
  - Purpose: Reduce API calls and improve performance
  - _Leverage: SiYuan batch API endpoints_
  - _Requirements: 1.5, NF (Performance)
  - _Prompt: Role: Performance Engineer with expertise in API optimization | Task: Implement batching and debouncing for database operations to minimize API calls while maintaining data consistency | Restrictions: Must maintain data consistency, debounce delay should be configurable, batch size limits must be respected | Success: API calls are significantly reduced, data remains consistent, performance improves for bulk operations_

## Phase 4: Migration Tool

- [ ] 4.1 Create migration data validator
  - File: `src/utils/migrationValidator.ts` (new)
  - Implement data integrity checking
  - Add conflict detection logic
  - Implement migration dry-run capability
  - Purpose: Validate data before migration
  - _Leverage: `src/utils/projectManager.ts` for data loading_
  - _Requirements: 1.4, NF-3 (Migration Failure handling)
  - _Prompt: Role: Data Engineer with expertise in data validation | Task: Create comprehensive migration validator that checks data integrity, detects conflicts, and supports dry-run mode | Restrictions: Must validate all data fields, report all issues before migration, dry-run must not modify any data | Success: All data issues detected before migration, conflicts are clearly reported, dry-run provides accurate preview_

- [ ] 4.2 Implement migration execution logic
  - File: `src/utils/migrationExecutor.ts` (new)
  - Implement backup creation before migration
  - Add project/group/milestone migration logic
  - Implement progress tracking
  - Purpose: Execute data migration with safety
  - _Leverage: `SiYuanDatabaseManager`, `JSONFallbackManager`_
  - _Requirements: 1.4, NF-3 (Migration Failure handling)
  - _Prompt: Role: Backend Developer with expertise in data migration | Task: Implement safe migration executor with automatic backup, progress tracking, and rollback capability | Restrictions: Must create backup before any changes, support resume on interruption, implement atomic operations where possible | Success: Migration creates backups, progress is tracked and reported, can resume or rollback on failure_

- [ ] 4.3 Create DataMigrationWizard UI component
  - File: `src/components/DataMigrationWizard.ts` (new)
  - Implement wizard dialog with steps (Introduction → Validation → Migration → Complete)
  - Add progress indicators and status display
  - Implement rollback button
  - Purpose: Provide user-friendly migration interface
  - _Leverage: `src/components/SelectDialog.ts` for dialog patterns, Svelte for complex UI_
  - _Requirements: 1.4, NF (Usability)
  - _Prompt: Role: Frontend Developer with expertise in UI/UX and wizard interfaces | Task: Create intuitive migration wizard with clear steps, progress tracking, and helpful error messages | Restrictions: Must follow plugin UI style, provide clear instructions at each step, handle all error scenarios gracefully | Success: Wizard is easy to use, progress is clear, errors are explained with solutions, matches plugin design language_

- [ ] 4.4 Add migration result reporting
  - File: `src/components/DataMigrationWizard.ts` (continue)
  - Implement detailed migration report display
  - Add error log viewer
  - Implement "View in Database" button
  - Purpose: Provide post-migration feedback
  - _Requirements: 1.4, NF (Usability)
  - _Prompt: Role: Frontend Developer with expertise in reporting and data visualization | Task: Add comprehensive migration result reporting with success counts, error details, and quick actions | Restrictions: Must display all relevant statistics, errors must be actionable, UI must remain responsive with large result sets | Success: Reports are comprehensive and clear, errors link to solutions, quick actions work correctly_

## Phase 5: UI Integration

- [ ] 5.1 Add database configuration to SettingsPanel
  - File: `src/components/SettingPanel.svelte` (modify)
  - Add database ID input with picker button
  - Add storage mode selector (JSON/Database/Hybrid)
  - Add migration wizard trigger button
  - Purpose: Allow users to configure database settings
  - _Leverage: `storageConfigManager` for persistence_
  - _Requirements: 1.2, 1.4, NF (Usability)
  - _Prompt: Role: Svelte Developer with expertise in settings interfaces | Task: Add database configuration section to SettingPanel with database picker, storage mode selector, and migration access | Restrictions: Must follow existing SettingPanel style, changes must be auto-saved, provide helpful tooltips | Success: Settings are intuitive, database picker works, changes persist, UI matches existing style_

- [ ] 5.2 Update ProjectKanbanView drag-drop sync
  - File: `src/components/ProjectKanbanView.ts` (modify)
  - Update drag-drop handlers to call DatabaseManager
  - Add batch update for sorting changes
  - Implement conflict detection on sync
  - Purpose: Sync kanban operations to database
  - _Leverage: `SiYuanDatabaseManager.batchUpdateProjects()`_
  - _Requirements: 1.5, NF-4 (Concurrent Modification)
  - _Prompt: Role: Frontend Developer with expertise in drag-drop and sync | Task: Update kanban drag-drop handlers to sync with database, including batch updates for sorting and conflict detection | Restrictions: Must maintain existing drag-drop UX, sync must not block UI, handle conflicts gracefully | Success: Drag-drop works smoothly, database syncs correctly, conflicts are detected and reported, no UI blocking_

- [ ] 5.3 Add database status indicator
  - File: `src/index.ts` (modify) + new component
  - Create status indicator component (connected/disconnected/fallback)
  - Add to plugin toolbar or status bar
  - Implement hover tooltip with details
  - Purpose: Show database connection status to users
  - _Requirements: NF (Usability), NF-1 (Database Unavailable)
  - _Prompt: Role: Frontend Developer with expertise in status indicators | Task: Create unobtrusive database status indicator showing connection state with helpful hover details | Restrictions: Must be subtle but visible, provide helpful information on hover, update in real-time | Success: Indicator clearly shows status, hover provides useful info, updates automatically, doesn't clutter UI_

- [ ] 5.4 Implement data conflict resolution UI
  - File: `src/components/ConflictResolver.ts` (new)
  - Create conflict dialog showing local vs server versions
  - Add "Use Local", "Use Server", "Merge" buttons
  - Implement side-by-side diff view
  - Purpose: Allow users to resolve data conflicts
  - _Requirements: NF-4 (Concurrent Modification)
  - _Prompt: Role: Frontend Developer with expertise in conflict resolution UIs | Task: Create clear conflict resolution interface showing differences and offering resolution options | Restrictions: Must clearly show differences, make resolution options obvious, allow reviewing before deciding | Success: Conflicts are clearly presented, resolution is easy, side-by-side view helps decision making_

## Phase 6: Testing & Documentation

- [ ] 6.1 Create converter unit tests
  - File: `test/converters.test.ts` (new)
  - Test `rowToProject()` with various input scenarios
  - Test `projectToRowValues()` conversion accuracy
  - Test edge cases (missing data, invalid values)
  - Purpose: Ensure data conversion reliability
  - _Leverage: `test/` directory existing test patterns_
  - _Requirements: All
  - _Prompt: Role: QA Engineer with expertise in unit testing | Task: Create comprehensive unit tests for data converters covering all scenarios and edge cases | Restrictions: Must test all mapping combinations, include edge cases, tests must be independent and reliable | Success: All conversion scenarios tested, edge cases covered, tests pass consistently_

- [ ] 6.2 Add integration tests for DatabaseManager
  - File: `test/databaseManager.test.ts` (new)
  - Mock SiYuan API responses
  - Test all CRUD operations
  - Test error handling and fallback
  - Purpose: Verify DatabaseManager behavior
  - _Requirements: All
  - _Prompt: Role: QA Engineer with expertise in integration testing | Task: Create integration tests for SiYuanDatabaseManager with mocked API, covering all operations and error scenarios | Restrictions: Must mock API calls, test error scenarios, verify fallback behavior | Success: All CRUD operations tested, errors handled correctly, fallback works as expected_

- [ ] 6.3 Create manual testing checklist
  - File: `docs/MANUAL_TESTING.md` (new)
  - Document manual test scenarios
  - Add expected results for each test
  - Include edge case testing steps
  - Purpose: Guide manual QA testing
  - _Requirements: All
  - _Prompt: Role: QA Engineer with expertise in test documentation | Task: Create comprehensive manual testing checklist covering all features, edge cases, and user workflows | Restrictions: Must cover all requirements, include clear pass/fail criteria, be easy to follow | Success: Checklist is comprehensive, covers all features, easy for testers to follow_

- [ ] 6.4 Write developer documentation
  - File: `docs/DATABASE_MIGRATION.md` (new)
  - Document architecture and design decisions
  - Add API usage examples
  - Document troubleshooting guide
  - Purpose: Help future developers understand the system
  - _Requirements: All
  - _Prompt: Role: Technical Writer with expertise in developer documentation | Task: Create comprehensive developer documentation explaining architecture, APIs, and common issues | Restrictions: Must be accurate and up-to-date, include code examples, cover troubleshooting | Success: Documentation is clear and comprehensive, examples work, troubleshooting helps solve issues_

## Summary

**Total Tasks:** 22 tasks across 6 phases
**Estimated Timeline:** 5 weeks (as per design.md Implementation Phases)

### Critical Path
1. Tasks 1.1 → 1.2 → 1.3 (Foundation - must be done first)
2. Tasks 2.1 → 2.2 (Templates - required for auto-creation)
3. Tasks 3.1 → 3.2 (Manager refactoring - enables dual-mode)
4. Tasks 4.1 → 4.2 → 4.3 (Migration tool - for existing users)
5. Tasks 5.1 → 5.2 (UI integration - complete the feature)

### Dependencies Map
- All tasks depend on **1.1** (types)
- **3.2** depends on **1.3** and **3.1**
- **4.2** depends on **1.3** and **3.1**
- **4.3** depends on **4.2**
- **5.2** depends on **3.2**

### Risk Mitigation
- **NF-1 (Database unavailable):** Tasks 3.1, 3.2, 3.3 implement fallback
- **NF-3 (Migration failure):** Tasks 4.1, 4.2 implement validation and rollback
- **NF-4 (Concurrent modification):** Tasks 3.3, 5.2, 5.4 handle conflicts
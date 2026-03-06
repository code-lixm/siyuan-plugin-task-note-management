# scripts KNOWLEDGE BASE

**Generated:** 2026-03-06
**Purpose:** Build automation and development tools

---

## OVERVIEW

9 scripts for development workflow, deployment, and release management.

---

## SCRIPTS

| Script | Purpose |
|--------|---------|
| `deploy.js` | Production deployment to SiYuan |
| `make_dev_copy.js` | Copy dev build to SiYuan plugins dir |
| `make_dev_link.js` | Create symlinks for development |
| `make_install.js` | Build + install to SiYuan |
| `update_version.js` | Bump version across files |
| `sync-i18n.cjs` | i18n key synchronization |
| `utils.js` | Shared script utilities |
| `elevate.ps1` | Windows elevation utility |

---

## KEY PATTERNS

### Auto-Deploy (Development)
```javascript
// make_dev_copy.js
const targetDir = '/path/to/SiYuan/data/plugins/plugin-name';
// Copies dev/ contents to SiYuan plugins directory
```

Hardcoded paths for local development:
- macOS: `~/Library/Application Support/SiYuan/...`
- Windows: `%APPDATA%/SiYuan/...`
- Linux: `~/.config/SiYuan/...`

### Version Update
`update_version.js` syncs version across:
- `package.json`
- `plugin.json`
- Other version references

### i18n Sync
`sync-i18n.cjs` ensures en_US and zh_CN have matching keys.

---

## NPM INTEGRATION

Scripts called from `package.json`:
```json
{
  "dev": "vite build --mode development",
  "build": "vite build && node scripts/deploy.js",
  "make-link": "node scripts/make_dev_link.js",
  "update-version": "node scripts/update_version.js"
}
```

---

## ANTI-PATTERNS

- **DO NOT commit hardcoded paths** — Use environment variables for CI
- **DO NOT run deploy.js in CI** — Only for local development
- **DO NOT modify scripts without testing** — Breaks dev workflow

# Roles

JIT microfiles defining each Swarm persona. Each subfolder contains numbered phase files loaded progressively (`01_` → `02_` → `03_`). Exception files (`exception_*.md`) are loaded only on error paths — never on the happy path.

| Subfolder | Persona | Phases |
|:----------|:--------|:-------|
| `architect/` | 🏗️ Plans & freezes | discover → draft → freeze |
| `manager/` | 👔 Provisions workspace | provision → handoff |
| `worker/` | 🐝 Executes micro-tasks | claim → execute → cleanup |
| `owner/` | 👑 Audits & merges | audit → verdict |
| `initializer/` | 🔧 First-time setup | init |
